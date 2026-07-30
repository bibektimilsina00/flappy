"""Stub adapter — generates real placeholder media and uploads it. Swap specific
models to real adapters (gemini, fal, replicate) later without touching the
engine."""

import io
import math
import struct
import uuid
import wave

from PIL import Image, ImageDraw

from apps.api.app.integrations.base.adapter import GenerationRequest, GenerationResult
from apps.api.app.integrations.base.model_spec import ModelSpec

_RENDER = {
    "image": ("_png", "png", "image/png"),
    "world": ("_png", "png", "image/png"),
    "video": ("_gif", "gif", "image/gif"),
    "audio": ("_wav", "wav", "audio/wav"),
}


class StubAdapter:
    def estimate_cost(self, model: ModelSpec, request: GenerationRequest) -> float:
        # Cost scales with the requested count where applicable.
        count = int(request.params.get("count", 1) or 1)
        return model.cost * max(count, 1)

    def generate(self, model: ModelSpec, request: GenerationRequest, ctx) -> GenerationResult:
        cost = self.estimate_cost(model, request)
        if request.kind == "text":
            return GenerationResult(kind=request.kind, cost=cost, text="[generated text]")

        render_name, ext, content_type = _RENDER.get(request.kind, ("_png", "png", "image/png"))
        data = globals()[render_name]()
        key = f"{ctx.workspace_id}/{ctx.execution_id}/{uuid.uuid4()}.{ext}"
        ctx.storage.put(key, data, content_type)
        return GenerationResult(kind=request.kind, cost=cost, key=key)


def _png() -> bytes:
    img = Image.new("RGB", (640, 640))
    draw = ImageDraw.Draw(img)
    for y in range(640):
        t = y / 640
        draw.line([(0, y), (640, y)], fill=(int(40 + t * 90), int(70 + t * 130), int(180 - t * 90)))
    buf = io.BytesIO()
    img.save(buf, "PNG")
    return buf.getvalue()


def _gif() -> bytes:
    frames = []
    for i in range(12):
        img = Image.new("RGB", (480, 270))
        draw = ImageDraw.Draw(img)
        for y in range(270):
            draw.line([(0, y), (480, y)], fill=((i * 18 + y) % 255, (y * 2) % 255, 150))
        frames.append(img)
    buf = io.BytesIO()
    frames[0].save(buf, "GIF", save_all=True, append_images=frames[1:], duration=90, loop=0)
    return buf.getvalue()


def _wav() -> bytes:
    buf = io.BytesIO()
    writer = wave.open(buf, "wb")
    writer.setnchannels(1)
    writer.setsampwidth(2)
    writer.setframerate(16000)
    samples = b"".join(
        struct.pack("<h", int(4000 * math.sin(2 * math.pi * 440 * t / 16000))) for t in range(16000)
    )
    writer.writeframes(samples)
    writer.close()
    return buf.getvalue()
