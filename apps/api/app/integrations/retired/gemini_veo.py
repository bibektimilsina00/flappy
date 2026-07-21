"""Veo adapter — video via :predictLongRunning (Generative Language API).

Submit → poll the operation → download the mp4 → store it. Text-to-video and
image-to-video (an upstream image is base64-encoded into the instance).

NOTE: request shape follows Google's docs; the finished-operation response path
is parsed defensively (`_video_uri`) because Veo requires paid prepay credits,
which weren't available to verify end-to-end in dev.
"""

import base64
import time

import httpx

from apps.api.app.core.config import settings
from apps.api.app.integrations.base.adapter import (
    GenerationRequest,
    GenerationResult,
    compose_prompt,
)
from apps.api.app.integrations.base.model_spec import ModelSpec

BASE = "https://generativelanguage.googleapis.com/v1beta"

POLL_INTERVAL = 10
POLL_TIMEOUT = 8 * 60


def _video_uri(response: dict) -> str | None:
    """Pull the generated video URI from a completed operation, tolerating the
    couple of shapes Veo has shipped."""
    gvr = response.get("generateVideoResponse", {})
    samples = gvr.get("generatedSamples") or gvr.get("samples") or []
    if samples:
        video = samples[0].get("video", {})
        return video.get("uri") or video.get("videoUri")
    return response.get("video", {}).get("uri")


class GeminiVeoAdapter:
    def estimate_cost(self, model: ModelSpec, request: GenerationRequest) -> float:
        return model.cost

    def generate(self, model: ModelSpec, request: GenerationRequest, ctx) -> GenerationResult:
        if request.kind != "video":
            raise ValueError(f"Veo adapter does not support kind '{request.kind}'")

        key_param = {"key": settings.gemini_api_key}
        instance: dict = {"prompt": compose_prompt(request)}
        parameters: dict = {}
        ratio = request.params.get("aspectRatio")
        if ratio:
            parameters["aspectRatio"] = ratio

        with httpx.Client(timeout=120) as client:
            # Image-to-video: encode the upstream image inline.
            urls = request.inputs.get("image_urls") or []
            if model.config.get("image_input") and urls:
                img = client.get(urls[0]).content
                instance["image"] = {
                    "bytesBase64Encoded": base64.b64encode(img).decode(),
                    "mimeType": "image/png",
                }

            res = client.post(
                f"{BASE}/models/{model.config['model']}:predictLongRunning",
                params=key_param,
                json={"instances": [instance], "parameters": parameters},
            )
            res.raise_for_status()
            op_name = res.json()["name"]

            video_uri = self._poll(client, key_param, op_name)
            sep = "&" if "?" in video_uri else "?"
            data = client.get(f"{video_uri}{sep}key={settings.gemini_api_key}").content

        storage_key = f"{ctx.workspace_id}/{ctx.execution_id}/{op_name.rsplit('/', 1)[-1]}.mp4"
        ctx.storage.put(storage_key, data, "video/mp4")
        return GenerationResult(kind="video", cost=model.cost, key=storage_key)

    def _poll(self, client: httpx.Client, key_param: dict, op_name: str) -> str:
        deadline = time.monotonic() + POLL_TIMEOUT
        while time.monotonic() < deadline:
            r = client.get(f"{BASE}/{op_name}", params=key_param)
            r.raise_for_status()
            op = r.json()
            if op.get("done"):
                if "error" in op:
                    raise RuntimeError(f"Veo failed: {op['error']}")
                uri = _video_uri(op.get("response", {}))
                if not uri:
                    raise RuntimeError("Veo completed but returned no video URI")
                return uri
            time.sleep(POLL_INTERVAL)
        raise TimeoutError("Veo generation timed out")
