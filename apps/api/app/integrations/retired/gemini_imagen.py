"""Imagen adapter — image via the :predict endpoint (Generative Language API).

Body: {"instances":[{"prompt": ...}], "parameters":{sampleCount, aspectRatio}}
Response: predictions[0].bytesBase64Encoded (base64 image).
"""

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


class GeminiImagenAdapter:
    def estimate_cost(self, model: ModelSpec, request: GenerationRequest) -> float:
        return model.cost

    def generate(self, model: ModelSpec, request: GenerationRequest, ctx) -> GenerationResult:
        if request.kind != "image":
            raise ValueError(f"Imagen adapter does not support kind '{request.kind}'")

        parameters = {"sampleCount": 1}
        ratio = request.params.get("aspectRatio")
        if ratio:
            parameters["aspectRatio"] = ratio

        with httpx.Client(timeout=120) as client:
            res = client.post(
                f"{BASE}/{model.config['model']}:predict",
                params={"key": settings.gemini_api_key},
                json={"instances": [{"prompt": compose_prompt(request)}], "parameters": parameters},
            )
            res.raise_for_status()
            pred = res.json()["predictions"][0]

        b64 = pred.get("bytesBase64Encoded") or pred.get("image", {}).get("imageBytes")
        if not b64:
            raise ValueError("Imagen returned no image")

        key = f"{ctx.workspace_id}/{ctx.execution_id}/{uuid.uuid4()}.png"
        ctx.storage.put(key, base64.b64decode(b64), "image/png")
        return GenerationResult(kind="image", cost=model.cost, key=key)
