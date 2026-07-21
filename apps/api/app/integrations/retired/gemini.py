"""Gemini adapter — text + image via the Generative Language API."""

import base64
import uuid

import httpx

from apps.api.app.core.config import settings
from apps.api.app.integrations.base.adapter import (
    GenerationRequest,
    GenerationResult,
    compose_prompt,
)
from apps.api.app.integrations.base.model_spec import ModelSpec

BASE = "https://generativelanguage.googleapis.com/v1beta/models"


class GeminiAdapter:
    def estimate_cost(self, model: ModelSpec, request: GenerationRequest) -> float:
        return model.cost

    def generate(self, model: ModelSpec, request: GenerationRequest, ctx) -> GenerationResult:
        model_id = model.config["model"]
        prompt = compose_prompt(request)

        if request.kind == "text":
            return GenerationResult(kind="text", cost=model.cost, text=self._text(model_id, prompt))

        if request.kind in ("image", "world"):
            data, mime = self._image(model_id, prompt)
            ext = "png" if "png" in mime else "jpg"
            key = f"{ctx.workspace_id}/{ctx.execution_id}/{uuid.uuid4()}.{ext}"
            ctx.storage.put(key, data, mime)
            return GenerationResult(kind=request.kind, cost=model.cost, key=key)

        raise ValueError(f"Gemini adapter does not support kind '{request.kind}'")

    def _text(self, model_id: str, prompt: str) -> str:
        with httpx.Client(timeout=90) as client:
            res = client.post(
                f"{BASE}/{model_id}:generateContent",
                params={"key": settings.gemini_api_key},
                json={"contents": [{"parts": [{"text": prompt}]}]},
            )
            res.raise_for_status()
            parts = res.json()["candidates"][0]["content"]["parts"]
        return "".join(p.get("text", "") for p in parts)

    def _image(self, model_id: str, prompt: str) -> tuple[bytes, str]:
        with httpx.Client(timeout=120) as client:
            res = client.post(
                f"{BASE}/{model_id}:generateContent",
                params={"key": settings.gemini_api_key},
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"responseModalities": ["IMAGE"]},
                },
            )
            res.raise_for_status()
            parts = res.json()["candidates"][0]["content"]["parts"]
        for part in parts:
            if "inlineData" in part:
                inline = part["inlineData"]
                return base64.b64decode(inline["data"]), inline["mimeType"]
        raise ValueError("Gemini returned no image")
