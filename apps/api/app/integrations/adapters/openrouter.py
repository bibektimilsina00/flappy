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
import time
import uuid

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
                    "messages": [{"role": "user", "content": compose_prompt(request)}],
                },
            )
            res.raise_for_status()
            content = res.json()["choices"][0]["message"]["content"]
        return GenerationResult(kind="text", cost=model.cost, text=content)

    # ── image ───────────────────────────────────────────────────────────────
    def _image(self, model, request, ctx) -> GenerationResult:
        body = {"model": model.config["model"], "prompt": compose_prompt(request)}
        body.update({k: v for k, v in (request.params or {}).items() if v not in (None, "")})
        with httpx.Client(timeout=180) as client:
            res = client.post(f"{BASE}/images", headers=self._headers, json=body)
            res.raise_for_status()
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
                    {"type": "image_url", "image_url": {"url": urls[0]}, "frame_type": "first_frame"}
                ]
        with httpx.Client(timeout=120) as client:
            res = client.post(f"{BASE}/videos", headers=self._headers, json=body)
            res.raise_for_status()
            job = res.json()
            polling_url = job.get("polling_url") or f"{BASE}/videos/{job['id']}"
            url = self._poll_video(client, polling_url)
            data = client.get(url).content
        key = self._store(ctx, "video", data, "mp4", "video/mp4")
        return GenerationResult(kind="video", cost=model.cost, key=key)

    def _poll_video(self, client: httpx.Client, polling_url: str) -> str:
        deadline = time.monotonic() + POLL_TIMEOUT
        while time.monotonic() < deadline:
            r = client.get(polling_url, headers=self._headers)
            r.raise_for_status()
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
        voice = (request.params or {}).get("voice")
        if voice:
            body["voice"] = voice  # model-specific; omitted -> provider default
        with httpx.Client(timeout=120) as client:
            res = client.post(f"{BASE}/audio/speech", headers=self._headers, json=body)
            res.raise_for_status()
            data = res.content  # raw audio bytes
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
            res.raise_for_status()
            msg = res.json()["choices"][0]["message"]
            b64 = (msg.get("audio") or {}).get("data")
            if not b64:
                raise RuntimeError("OpenRouter music returned no audio")
            data = base64.b64decode(b64)
        key = self._store(ctx, "audio", data, "mp3", "audio/mpeg")
        return GenerationResult(kind="audio", cost=model.cost, key=key)
