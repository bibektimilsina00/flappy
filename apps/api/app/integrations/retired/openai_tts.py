"""OpenAI TTS adapter — speech via /audio/speech. Returns audio bytes directly."""

import uuid

import httpx

from apps.api.app.core.config import settings
from apps.api.app.integrations.base.adapter import (
    GenerationRequest,
    GenerationResult,
    compose_prompt,
)
from apps.api.app.integrations.base.model_spec import ModelSpec

BASE = "https://api.openai.com/v1"


class OpenAITTSAdapter:
    def estimate_cost(self, model: ModelSpec, request: GenerationRequest) -> float:
        return model.cost

    def generate(self, model: ModelSpec, request: GenerationRequest, ctx) -> GenerationResult:
        if request.kind != "audio":
            raise ValueError(f"OpenAI TTS adapter does not support kind '{request.kind}'")

        with httpx.Client(timeout=120) as client:
            res = client.post(
                f"{BASE}/audio/speech",
                headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                json={
                    "model": model.config["model"],
                    "input": compose_prompt(request),
                    "voice": request.params.get("voice") or "alloy",
                    "response_format": "mp3",
                },
            )
            res.raise_for_status()
            data = res.content

        key = f"{ctx.workspace_id}/{ctx.execution_id}/{uuid.uuid4()}.mp3"
        ctx.storage.put(key, data, "audio/mpeg")
        return GenerationResult(kind="audio", cost=model.cost, key=key)
