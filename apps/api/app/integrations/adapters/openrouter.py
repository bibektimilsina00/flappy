"""OpenRouter adapter — one path for every modality.

  - text:  POST /chat/completions              -> message content
  - image: POST /images                        -> data[0].b64_json (or url)
  - video: POST /videos -> poll -> download    -> mp4  (async, like Veo/Sora)
  - audio: POST /audio/speech (TTS, raw bytes) OR
           POST /chat/completions w/ audio modality (music, b64)  — per config.audio_mode

NOTE: image/video/audio shapes follow OpenRouter's published docs; video-poll and
music (chat-audio) response fields are parsed defensively since they weren't
exercised end-to-end in dev.
"""

import base64
import io
import time
import uuid
import wave

import httpx

from apps.api.app.core.config import settings
from apps.api.app.integrations.base.adapter import (
    GenerationRequest,
    GenerationResult,
    compose_prompt,
)
from apps.api.app.integrations.base.model_spec import ModelSpec

BASE = "https://openrouter.ai/api/v1"
POLL_INTERVAL = 5
POLL_TIMEOUT = 10 * 60

# Default steering for text nodes. Without a system message some free models
# (e.g. Qwen) reply in Chinese to short prompts like "hi"; this pins the output
# language to the user's and strips preamble. A model may override via its
# config's "system_prompt".
DEFAULT_TEXT_SYSTEM = (
    "You are a helpful writing assistant inside a video-creation tool. "
    "Always reply in the same language the user writes in; if that is unclear, use English. "
    "Return only the requested content — no preamble, explanations, or sign-offs."
)


def _pcm_to_wav(pcm: bytes, rate: int = 24000) -> bytes:
    """Wrap raw PCM in a WAV container so browsers can play it.
    # ponytail: assumes 16-bit mono 24kHz (Gemini TTS output); parameterize the
    # rate if another pcm-only model shows up at a different one."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm)
    return buf.getvalue()


def _check(res: httpx.Response) -> None:
    """raise_for_status, but keep OpenRouter's error body — it names the actual
    problem (missing voice, bad param), which the bare status line never does."""
    if res.status_code >= 400:
        raise RuntimeError(f"OpenRouter {res.status_code}: {res.text[:300]}")


class OpenRouterAdapter:
    def estimate_cost(self, model: ModelSpec, request: GenerationRequest) -> float:
        return model.cost

    def generate(self, model: ModelSpec, request: GenerationRequest, ctx) -> GenerationResult:
        dispatch = {
            "text": self._text,
            "image": self._image,
            "video": self._video,
            "audio": self._audio,
        }.get(request.kind)
        if dispatch is None:
            raise ValueError(f"OpenRouter adapter does not support kind '{request.kind}'")
        return dispatch(model, request, ctx)

    @property
    def _headers(self) -> dict:
        return {"Authorization": f"Bearer {settings.open_router_api_key}"}

    def _store(self, ctx, kind: str, data: bytes, ext: str, mime: str) -> str:
        key = f"{ctx.workspace_id}/{ctx.execution_id}/{uuid.uuid4()}.{ext}"
        ctx.storage.put(key, data, mime)
        return key

    # ── text ────────────────────────────────────────────────────────────────
    def _text(self, model, request, ctx) -> GenerationResult:
        with httpx.Client(timeout=90) as client:
            res = client.post(
                f"{BASE}/chat/completions",
                headers=self._headers,
                json={
                    "model": model.config["model"],
                    "messages": [
                        {
                            "role": "system",
                            "content": model.config.get("system_prompt") or DEFAULT_TEXT_SYSTEM,
                        },
                        {"role": "user", "content": compose_prompt(request)},
                    ],
                },
            )
            _check(res)
            content = res.json()["choices"][0]["message"]["content"]
        return GenerationResult(kind="text", cost=model.cost, text=content)

    # ── image ───────────────────────────────────────────────────────────────
    def _image(self, model, request, ctx) -> GenerationResult:
        body = {"model": model.config["model"], "prompt": compose_prompt(request)}
        body.update({k: v for k, v in (request.params or {}).items() if v not in (None, "")})
        with httpx.Client(timeout=180) as client:
            # Connected image(s) → reference-image-to-image (base64 so storage
            # reachability from OpenRouter never matters).
            refs = []
            for url in (request.inputs.get("image_urls") or [])[:4]:
                try:
                    raw = client.get(url).content
                    data_url = "data:image/png;base64," + base64.b64encode(raw).decode()
                    refs.append({"type": "image_url", "image_url": {"url": data_url}})
                except Exception:
                    continue
            if refs:
                body["input_references"] = refs
            res = client.post(f"{BASE}/images", headers=self._headers, json=body)
            _check(res)
            item = res.json()["data"][0]
            b64 = item.get("b64_json")
            data = base64.b64decode(b64) if b64 else client.get(item["url"]).content
        key = self._store(ctx, "image", data, "png", "image/png")
        return GenerationResult(kind="image", cost=model.cost, key=key)

    # ── video (async submit -> poll -> download) ─────────────────────────────
    def _video(self, model, request, ctx) -> GenerationResult:
        body = {"model": model.config["model"], "prompt": compose_prompt(request)}
        # Params arrive as strings (select options); the API wants numbers where
        # numeric (e.g. duration). Coerce digit strings back to int.
        for k, v in (request.params or {}).items():
            if v in (None, ""):
                continue
            body[k] = int(v) if isinstance(v, str) and v.isdigit() else v
        if model.config.get("frames"):
            urls = request.inputs.get("image_urls") or []
            if urls:
                body["frame_images"] = [
                    {
                        "type": "image_url",
                        "image_url": {"url": urls[0]},
                        "frame_type": "first_frame",
                    }
                ]
        with httpx.Client(timeout=120, follow_redirects=True) as client:
            res = client.post(f"{BASE}/videos", headers=self._headers, json=body)
            _check(res)
            job = res.json()
            polling_url = job.get("polling_url") or f"{BASE}/videos/{job['id']}"
            url = self._poll_video(client, polling_url)
            # The download URL needs the bearer token when it points back at the
            # OpenRouter API — and an error body must never be stored as the
            # "video" (it renders as a broken 0:00 player in the UI).
            dl = client.get(url, headers=self._headers)
            _check(dl)
            data = dl.content
        if not data or data[:1] == b"{" or "json" in dl.headers.get("content-type", ""):
            raise RuntimeError(f"OpenRouter video download returned non-video: {data[:200]!r}")
        key = self._store(ctx, "video", data, "mp4", "video/mp4")
        return GenerationResult(kind="video", cost=model.cost, key=key)

    def _poll_video(self, client: httpx.Client, polling_url: str) -> str:
        deadline = time.monotonic() + POLL_TIMEOUT
        while time.monotonic() < deadline:
            r = client.get(polling_url, headers=self._headers)
            _check(r)
            status = r.json()
            state = status.get("status")
            if state == "completed":
                urls = status.get("unsigned_urls") or []
                if not urls:
                    raise RuntimeError("OpenRouter video completed but returned no URL")
                return urls[0]
            if state == "failed":
                raise RuntimeError(f"OpenRouter video failed: {status.get('error', 'unknown')}")
            time.sleep(POLL_INTERVAL)
        raise TimeoutError("OpenRouter video generation timed out")

    # ── audio (TTS speech bytes / music chat-audio b64) ──────────────────────
    def _audio(self, model, request, ctx) -> GenerationResult:
        if model.config.get("audio_mode") == "music":
            return self._audio_music(model, request, ctx)
        return self._audio_speech(model, request, ctx)

    def _audio_speech(self, model, request, ctx) -> GenerationResult:
        body = {
            "model": model.config["model"],
            "input": compose_prompt(request),
            "response_format": "mp3",
        }
        # /audio/speech rejects voiceless requests (400) — fall back to the
        # model's first supported voice from the catalog when the UI sent none.
        voice = (request.params or {}).get("voice") or next(
            (p.default for p in model.params if p.key == "voice"), None
        )
        if voice:
            body["voice"] = voice
        with httpx.Client(timeout=120) as client:
            res = client.post(f"{BASE}/audio/speech", headers=self._headers, json=body)
            # Some models are pcm-only (e.g. Gemini TTS) and 400 on mp3 — the
            # models API doesn't expose accepted formats, so retry on demand.
            if res.status_code == 400 and "pcm" in res.text:
                body["response_format"] = "pcm"
                res = client.post(f"{BASE}/audio/speech", headers=self._headers, json=body)
            _check(res)
            data = res.content  # raw audio bytes
        if body["response_format"] == "pcm":
            key = self._store(ctx, "audio", _pcm_to_wav(data), "wav", "audio/wav")
        else:
            key = self._store(ctx, "audio", data, "mp3", "audio/mpeg")
        return GenerationResult(kind="audio", cost=model.cost, key=key)

    def _audio_music(self, model, request, ctx) -> GenerationResult:
        # ponytail: music comes back as b64 audio in the chat message (GPT-4o-audio
        # shape). Response field unverified — parse defensively, upgrade when a real
        # gen confirms it.
        with httpx.Client(timeout=180) as client:
            res = client.post(
                f"{BASE}/chat/completions",
                headers=self._headers,
                json={
                    "model": model.config["model"],
                    "modalities": ["text", "audio"],
                    "audio": {"format": "mp3"},
                    "messages": [{"role": "user", "content": compose_prompt(request)}],
                },
            )
            _check(res)
            msg = res.json()["choices"][0]["message"]
            b64 = (msg.get("audio") or {}).get("data")
            if not b64:
                raise RuntimeError("OpenRouter music returned no audio")
            data = base64.b64decode(b64)
        key = self._store(ctx, "audio", data, "mp3", "audio/mpeg")
        return GenerationResult(kind="audio", cost=model.cost, key=key)
