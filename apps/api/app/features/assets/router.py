import base64
import io
import os
import subprocess
import tempfile
import uuid

import httpx
import imageio_ffmpeg
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from PIL import Image, ImageEnhance
from pydantic import BaseModel
from sqlmodel import Session

from apps.api.app.api.deps import current_workspace_id, get_current_user, get_session
from apps.api.app.core.config import settings
from apps.api.app.features.assets import repository
from apps.api.app.features.users.models import User
from apps.api.app.features.workflows import repository as workflows_repo
from apps.api.app.storage.factory import get_storage

# Assets are read per-execution via /executions/{id}/assets. Uploads land here as
# workspace-scoped objects; the editor stores the returned key on a node.
router = APIRouter(prefix="/assets", tags=["assets"])

MAX_UPLOAD_BYTES = 100 * 1024 * 1024  # 100 MB


@router.get("")
def list_assets(
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> list[dict]:
    """All assets in the workspace (newest first) for the Library / Generations."""
    storage = get_storage()
    return [
        {
            "id": str(a.id),
            "kind": a.kind,
            "url": storage.url(a.key),
            "created_at": a.created_at.isoformat(),
        }
        for a in repository.list_for_workspace(session, workspace_id)
        if a.key
    ]


@router.get("/library")
def list_library(
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> list[dict]:
    """Every media asset in the workspace, newest first — both generated (asset table)
    and uploaded (graph node `upload_key`), each with a fresh presigned URL."""
    storage = get_storage()
    seen: set[str] = set()
    items: list[dict] = []

    for a in repository.list_for_workspace(session, workspace_id):
        if a.key and a.kind in ("image", "video", "audio") and a.key not in seen:
            seen.add(a.key)
            items.append(
                {
                    "id": str(a.id),
                    "kind": a.kind,
                    "name": f"Generated {a.kind}",
                    "url": storage.url(a.key),
                    "created_at": a.created_at.isoformat(),
                    "source": "generated",
                }
            )

    for wf in workflows_repo.list_by_workspace(session, workspace_id):
        for node in (wf.graph or {}).get("nodes") or []:
            data = node.get("data") or {}
            key = data.get("upload_key")
            if not key or key in seen:
                continue
            kind = repository.kind_from_key(key)
            if not kind:
                continue
            seen.add(key)
            items.append(
                {
                    "id": key,
                    "kind": kind,
                    "name": data.get("upload_name") or key.rsplit("/", 1)[-1],
                    "url": storage.url(key),
                    "created_at": wf.updated_at.isoformat(),
                    "source": "uploaded",
                }
            )

    items.sort(key=lambda x: x["created_at"], reverse=True)
    return items


_EXT = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/mp4": "m4a",
    "audio/webm": "weba",
    "audio/ogg": "ogg",
}


@router.post("/upload")
async def upload_asset(
    file: UploadFile = File(...),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    """Store an uploaded media file and return its key + presigned URL. The editor
    creates a node with this `key` in its data; display/runs re-presign from it."""
    ctype = file.content_type or "application/octet-stream"
    kind = ctype.split("/", 1)[0]
    if kind not in ("image", "video", "audio"):
        raise HTTPException(status_code=415, detail=f"Unsupported file type: {ctype}")

    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 100 MB).")

    ext = _EXT.get(ctype)
    if not ext and file.filename and "." in file.filename:
        ext = file.filename.rsplit(".", 1)[-1].lower()
    key = f"{workspace_id}/uploads/{uuid.uuid4()}.{ext or 'bin'}"

    storage = get_storage()
    storage.put(key, data, ctype)
    return {
        "key": key,
        "url": storage.url(key),
        "kind": kind,
        "name": file.filename or key.rsplit("/", 1)[-1],
    }


def _fetch_source(url: str) -> Image.Image:
    """Download a source image from OUR storage (SSRF guard) and open it."""
    if not settings.s3_endpoint or not url.startswith(settings.s3_endpoint):
        raise HTTPException(status_code=400, detail="Source must be a storage URL.")
    try:
        with httpx.Client(timeout=30) as client:
            r = client.get(url)
            r.raise_for_status()
        return Image.open(io.BytesIO(r.content))
    except Exception:
        raise HTTPException(status_code=422, detail="Could not load source image.")


def _store_png(img: Image.Image, workspace_id: uuid.UUID) -> dict:
    buf = io.BytesIO()
    img.save(buf, "PNG")
    key = f"{workspace_id}/edits/{uuid.uuid4()}.png"
    storage = get_storage()
    storage.put(key, buf.getvalue(), "image/png")
    return {"key": key, "url": storage.url(key), "kind": "image"}


class CropRequest(BaseModel):
    source_url: str
    x: int
    y: int
    width: int
    height: int


@router.post("/crop")
def crop_asset(
    body: CropRequest,
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    img = _fetch_source(body.source_url).convert("RGB")
    w, h = img.size
    x0 = max(0, min(body.x, w))
    y0 = max(0, min(body.y, h))
    x1 = max(x0 + 1, min(body.x + body.width, w))
    y1 = max(y0 + 1, min(body.y + body.height, h))
    return _store_png(img.crop((x0, y0, x1, y1)), workspace_id)


class CompositeRequest(BaseModel):
    source_url: str
    overlay_png: str  # base64 PNG of the annotation layer (any size; scaled to fit)


@router.post("/composite")
def composite_asset(
    body: CompositeRequest,
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    base = _fetch_source(body.source_url).convert("RGBA")
    try:
        raw = base64.b64decode(body.overlay_png.split(",", 1)[-1])
        overlay = Image.open(io.BytesIO(raw)).convert("RGBA")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid overlay image.")
    if overlay.size != base.size:
        overlay = overlay.resize(base.size, Image.LANCZOS)
    base.alpha_composite(overlay)
    return _store_png(base.convert("RGB"), workspace_id)


# ── Grid extract: slice an image into an r×c grid of separate images ──────────
class GridRequest(BaseModel):
    source_url: str
    rows: int
    cols: int


@router.post("/grid-extract")
def grid_extract(
    body: GridRequest,
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> list[dict]:
    img = _fetch_source(body.source_url).convert("RGB")
    w, h = img.size
    rows = max(1, min(body.rows, 10))
    cols = max(1, min(body.cols, 10))
    out: list[dict] = []
    for r in range(rows):
        for c in range(cols):
            box = (
                w * c // cols,
                h * r // rows,
                w * (c + 1) // cols,
                h * (r + 1) // rows,
            )
            out.append(_store_png(img.crop(box), workspace_id))
    return out


# ── Light tune: deterministic brightness / contrast / saturation / warmth ─────
class AdjustRequest(BaseModel):
    source_url: str
    brightness: float = 1.0
    contrast: float = 1.0
    saturation: float = 1.0
    temperature: float = 0.0  # -1 (cool) … +1 (warm)


@router.post("/adjust")
def adjust_asset(
    body: AdjustRequest,
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    img = _fetch_source(body.source_url).convert("RGB")
    img = ImageEnhance.Brightness(img).enhance(body.brightness)
    img = ImageEnhance.Contrast(img).enhance(body.contrast)
    img = ImageEnhance.Color(img).enhance(body.saturation)
    if body.temperature:
        t = max(-1.0, min(1.0, body.temperature))
        r, g, b = img.split()
        r = r.point(lambda v: max(0, min(255, int(v + t * 30))))
        b = b.point(lambda v: max(0, min(255, int(v - t * 30))))
        img = Image.merge("RGB", (r, g, b))
    return _store_png(img, workspace_id)


# ── AI image-to-image edit (Expand, Three-view, Multi-angle, Change angle, … ─
# The source is sent as a base64 data URL in `input_references`, so it works
# regardless of whether our storage is reachable from OpenRouter.
DEFAULT_EDIT_MODEL = "google/gemini-2.5-flash-image"


class EditRequest(BaseModel):
    source_url: str
    prompt: str
    model: str | None = None
    size: str | None = None  # e.g. "2k", "4k", or "WxH" (passed through if set)


@router.post("/edit")
def edit_asset(
    body: EditRequest,
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    img = _fetch_source(body.source_url).convert("RGB")
    buf = io.BytesIO()
    img.save(buf, "PNG")
    data_url = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()

    payload: dict = {
        "model": body.model or DEFAULT_EDIT_MODEL,
        "prompt": body.prompt,
        "input_references": [{"type": "image_url", "image_url": {"url": data_url}}],
    }
    if body.size:
        payload["size"] = body.size

    try:
        with httpx.Client(timeout=240) as client:
            r = client.post(
                "https://openrouter.ai/api/v1/images",
                headers={"Authorization": f"Bearer {settings.open_router_api_key}"},
                json=payload,
            )
            r.raise_for_status()
            item = r.json()["data"][0]
            b64 = item.get("b64_json")
            raw = base64.b64decode(b64) if b64 else client.get(item["url"]).content
    except httpx.HTTPStatusError as exc:
        detail = exc.response.text[:300]
        raise HTTPException(
            status_code=exc.response.status_code, detail=f"Image edit failed: {detail}"
        )
    return _store_png(Image.open(io.BytesIO(raw)), workspace_id)


# ── Video edits (ffmpeg): extract frame, reframe, trim, upscale ──────────────
_VENC = ["-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-c:a", "aac"]


def _fetch_bytes(url: str) -> bytes:
    if not settings.s3_endpoint or not url.startswith(settings.s3_endpoint):
        raise HTTPException(status_code=400, detail="Source must be a storage URL.")
    try:
        with httpx.Client(timeout=120) as client:
            r = client.get(url)
            r.raise_for_status()
        return r.content
    except Exception:
        raise HTTPException(status_code=422, detail="Could not load source video.")


def _ffmpeg(
    data: bytes,
    pre: list[str],
    post: list[str],
    out_ext: str,
    mime: str,
    kind: str,
    workspace_id: uuid.UUID,
) -> dict:
    """Run `ffmpeg -y {pre} -i input {post} out.ext` on `data`, store the output."""
    exe = imageio_ffmpeg.get_ffmpeg_exe()
    with tempfile.TemporaryDirectory() as d:
        src = os.path.join(d, "input")
        dst = os.path.join(d, f"out.{out_ext}")
        with open(src, "wb") as f:
            f.write(data)
        cmd = [exe, "-y", *pre, "-i", src, *post, dst]
        proc = subprocess.run(cmd, capture_output=True, timeout=600)
        if proc.returncode != 0 or not os.path.exists(dst) or os.path.getsize(dst) == 0:
            raise HTTPException(
                status_code=422,
                detail=f"ffmpeg failed: {proc.stderr.decode(errors='ignore')[-300:]}",
            )
        with open(dst, "rb") as f:
            out = f.read()
    key = f"{workspace_id}/edits/{uuid.uuid4()}.{out_ext}"
    storage = get_storage()
    storage.put(key, out, mime)
    return {"key": key, "url": storage.url(key), "kind": kind}


def _ar(ratio: str) -> float:
    try:
        w, h = ratio.split(":")
        return float(w) / float(h)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Bad aspect ratio: {ratio}")


class FrameRequest(BaseModel):
    source_url: str
    time: float = 0.0  # seconds


@router.post("/video/frame")
def video_frame(
    body: FrameRequest,
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    data = _fetch_bytes(body.source_url)
    return _ffmpeg(
        data,
        pre=["-ss", str(max(0.0, body.time))],
        post=["-frames:v", "1", "-update", "1", "-q:v", "2"],
        out_ext="jpg",
        mime="image/jpeg",
        kind="image",
        workspace_id=workspace_id,
    )


class ReframeRequest(BaseModel):
    source_url: str
    ratio: str  # "9:16" | "16:9" | "1:1"


@router.post("/video/reframe")
def video_reframe(
    body: ReframeRequest,
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    ar = _ar(body.ratio)
    # Largest centred crop matching the target aspect (commas escaped for ffmpeg).
    vf = f"crop=w=min(iw\\,ih*{ar}):h=min(ih\\,iw/{ar})"
    return _ffmpeg(
        _fetch_bytes(body.source_url),
        pre=[],
        post=["-vf", vf, *_VENC],
        out_ext="mp4",
        mime="video/mp4",
        kind="video",
        workspace_id=workspace_id,
    )


class TrimRequest(BaseModel):
    source_url: str
    start: float
    end: float


@router.post("/video/trim")
def video_trim(
    body: TrimRequest,
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    start = max(0.0, body.start)
    dur = max(0.1, body.end - start)
    return _ffmpeg(
        _fetch_bytes(body.source_url),
        pre=["-ss", str(start)],
        post=["-t", str(dur), *_VENC],
        out_ext="mp4",
        mime="video/mp4",
        kind="video",
        workspace_id=workspace_id,
    )


class UpscaleRequest(BaseModel):
    source_url: str
    scale: int = 2  # 2 or 4


@router.post("/video/upscale")
def video_upscale(
    body: UpscaleRequest,
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    s = 4 if body.scale >= 4 else 2
    vf = f"scale=iw*{s}:ih*{s}:flags=lanczos"
    return _ffmpeg(
        _fetch_bytes(body.source_url),
        pre=[],
        post=["-vf", vf, *_VENC],
        out_ext="mp4",
        mime="video/mp4",
        kind="video",
        workspace_id=workspace_id,
    )
