"""Gemini TTS adapter — speech via generateContent (AUDIO modality).

Returns raw PCM (24 kHz, 16-bit, mono); we wrap it into a WAV and store it.
"""

import base64
import io
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

BASE = "https://generativelanguage.googleapis.com/v1beta/models"


class GeminiTTSAdapter:
    def estimate_cost(self, model: ModelSpec, request: GenerationRequest) -> float:
        return model.cost

    def generate(self, model: ModelSpec, request: GenerationRequest, ctx) -> GenerationResult:
        if request.kind != "audio":
            raise ValueError(f"Gemini TTS adapter does not support kind '{request.kind}'")

        voice = request.params.get("voice") or "Kore"
        with httpx.Client(timeout=120) as client:
            res = client.post(
                f"{BASE}/{model.config['model']}:generateContent",
                params={"key": settings.gemini_api_key},
                json={
                    "contents": [{"parts": [{"text": compose_prompt(request)}]}],
                    "generationConfig": {
                        "responseModalities": ["AUDIO"],
                        "speechConfig": {
                            "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}
                        },
                    },
                },
            )
            res.raise_for_status()
            parts = res.json()["candidates"][0]["content"]["parts"]

        pcm = next(
            (base64.b64decode(p["inlineData"]["data"]) for p in parts if "inlineData" in p),
            None,
        )
        if pcm is None:
            raise ValueError("Gemini TTS returned no audio")

        buf = io.BytesIO()
        with wave.open(buf, "wb") as wav:  # PCM 24kHz / 16-bit / mono
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(24000)
            wav.writeframes(pcm)

        key = f"{ctx.workspace_id}/{ctx.execution_id}/{uuid.uuid4()}.wav"
        ctx.storage.put(key, buf.getvalue(), "audio/wav")
        return GenerationResult(kind="audio", cost=model.cost, key=key)
