"""Replicate adapter — one path for every modality.

Create a prediction on a model (`owner/name`), wait/poll, then either return the
text output or download the file output and store it. `config`:
  - model:        "owner/name"
  - prompt_field: input key for the prompt (default "prompt")
  - image_field:  input key for an upstream image (i2v / img2img); optional
  - image_list:   image_field takes an array

NOTE: built to Replicate's documented HTTP API; not verified end-to-end (no
token/credits in dev).
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

BASE = "https://api.replicate.com/v1"
TERMINAL = {"succeeded", "failed", "canceled"}
POLL_INTERVAL = 5
POLL_TIMEOUT = 10 * 60

_EXT = {
    "image": ("png", "image/png"),
    "video": ("mp4", "video/mp4"),
    "audio": ("mp3", "audio/mpeg"),
}


class ReplicateAdapter:
    def estimate_cost(self, model: ModelSpec, request: GenerationRequest) -> float:
        return model.cost

    def generate(self, model: ModelSpec, request: GenerationRequest, ctx) -> GenerationResult:
        cfg = model.config
        headers = {"Authorization": f"Bearer {settings.replicate_api_key}"}

        payload = {cfg.get("prompt_field", "prompt"): compose_prompt(request)}
        payload.update({k: v for k, v in (request.params or {}).items() if v not in (None, "")})
        field = cfg.get("image_field")
        if field:
            urls = request.inputs.get("image_urls") or []
            if urls:
                payload[field] = urls if cfg.get("image_list") else urls[0]

        with httpx.Client(timeout=120) as client:
            res = client.post(
                f"{BASE}/models/{cfg['model']}/predictions",
                headers={**headers, "Prefer": "wait=60"},
                json={"input": payload},
            )
            res.raise_for_status()
            pred = self._settle(client, headers, res.json())
            output = pred.get("output")

            if request.kind == "text":
                text = (
                    output
                    if isinstance(output, str)
                    else "".join(output)
                    if isinstance(output, list)
                    else str(output)
                )
                return GenerationResult(kind="text", cost=model.cost, text=text)

            url = output[0] if isinstance(output, list) else output
            if not isinstance(url, str):
                raise RuntimeError("Replicate returned no file output")
            data = client.get(url).content

        ext, mime = _EXT.get(request.kind, ("bin", "application/octet-stream"))
        key = f"{ctx.workspace_id}/{ctx.execution_id}/{pred.get('id') or uuid.uuid4()}.{ext}"
        ctx.storage.put(key, data, mime)
        return GenerationResult(kind=request.kind, cost=model.cost, key=key)

    def _settle(self, client: httpx.Client, headers: dict, pred: dict) -> dict:
        """Prefer:wait may return a terminal prediction already; else poll."""
        deadline = time.monotonic() + POLL_TIMEOUT
        while pred.get("status") not in TERMINAL:
            if time.monotonic() > deadline:
                raise TimeoutError("Replicate prediction timed out")
            time.sleep(POLL_INTERVAL)
            r = client.get(f"{BASE}/predictions/{pred['id']}", headers=headers)
            r.raise_for_status()
            pred = r.json()
        if pred.get("status") != "succeeded":
            raise RuntimeError(f"Replicate {pred.get('status')}: {pred.get('error')}")
        return pred
