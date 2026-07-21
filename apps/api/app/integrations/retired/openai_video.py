"""OpenAI Sora adapter — video via /videos (create → poll → download).

Text-to-video and image-to-video (an upstream image is sent as the reference).

NOTE: built to the documented Sora API; not verified end-to-end (no key/credits
available in dev). The download endpoint returns the mp4 bytes directly.
"""

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

BASE = "https://api.openai.com/v1"

POLL_INTERVAL = 10
POLL_TIMEOUT = 10 * 60


class OpenAIVideoAdapter:
    def estimate_cost(self, model: ModelSpec, request: GenerationRequest) -> float:
        return model.cost

    def generate(self, model: ModelSpec, request: GenerationRequest, ctx) -> GenerationResult:
        if request.kind != "video":
            raise ValueError(f"OpenAI video adapter does not support kind '{request.kind}'")

        headers = {"Authorization": f"Bearer {settings.openai_api_key}"}
        body = {"model": model.config["model"], "prompt": compose_prompt(request)}
        if request.params.get("seconds"):
            body["seconds"] = str(request.params["seconds"])
        if request.params.get("size"):
            body["size"] = request.params["size"]

        with httpx.Client(timeout=120) as client:
            res = client.post(f"{BASE}/videos", headers=headers, json=body)
            res.raise_for_status()
            job_id = res.json()["id"]

            self._wait(client, headers, job_id)
            content = client.get(f"{BASE}/videos/{job_id}/content", headers=headers)
            content.raise_for_status()
            data = content.content

        key = f"{ctx.workspace_id}/{ctx.execution_id}/{uuid.uuid4()}.mp4"
        ctx.storage.put(key, data, "video/mp4")
        return GenerationResult(kind="video", cost=model.cost, key=key)

    def _wait(self, client: httpx.Client, headers: dict, job_id: str) -> None:
        deadline = time.monotonic() + POLL_TIMEOUT
        while time.monotonic() < deadline:
            r = client.get(f"{BASE}/videos/{job_id}", headers=headers)
            r.raise_for_status()
            status = r.json().get("status")
            if status == "completed":
                return
            if status == "failed":
                raise RuntimeError("Sora video generation failed")
            time.sleep(POLL_INTERVAL)
        raise TimeoutError("Sora video generation timed out")
