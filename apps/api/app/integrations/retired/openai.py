"""OpenAI adapter — text via chat/completions, image via images/generations."""

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

BASE = "https://api.openai.com/v1"


class OpenAIAdapter:
    def estimate_cost(self, model: ModelSpec, request: GenerationRequest) -> float:
        return model.cost

    def generate(self, model: ModelSpec, request: GenerationRequest, ctx) -> GenerationResult:
        model_id = model.config["model"]
        prompt = compose_prompt(request)
        headers = {"Authorization": f"Bearer {settings.openai_api_key}"}

        if request.kind == "text":
            with httpx.Client(timeout=90) as client:
                res = client.post(
                    f"{BASE}/chat/completions",
                    headers=headers,
                    json={"model": model_id, "messages": [{"role": "user", "content": prompt}]},
                )
                res.raise_for_status()
                text = res.json()["choices"][0]["message"]["content"]
            return GenerationResult(kind="text", cost=model.cost, text=text)

        if request.kind == "image":
            body = {
                "model": model_id,
                "prompt": prompt,
                "size": request.params.get("size") or "1024x1024",
            }
            if request.params.get("quality"):
                body["quality"] = request.params["quality"]
            with httpx.Client(timeout=180) as client:
                res = client.post(f"{BASE}/images/generations", headers=headers, json=body)
                res.raise_for_status()
                b64 = res.json()["data"][0]["b64_json"]
            key = f"{ctx.workspace_id}/{ctx.execution_id}/{uuid.uuid4()}.png"
            ctx.storage.put(key, base64.b64decode(b64), "image/png")
            return GenerationResult(kind="image", cost=model.cost, key=key)

        raise ValueError(f"OpenAI adapter does not support kind '{request.kind}'")
