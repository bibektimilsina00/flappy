import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from apps.api.app.api.deps import current_workspace_id, get_current_user
from apps.api.app.features.users.models import User
from apps.api.app.storage.factory import get_storage

# Assets are read per-execution via /executions/{id}/assets. Uploads land here as
# workspace-scoped objects; the editor stores the returned key on a node.
router = APIRouter(prefix="/assets", tags=["assets"])

MAX_UPLOAD_BYTES = 100 * 1024 * 1024  # 100 MB

_EXT = {
    "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif",
    "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov",
    "audio/mpeg": "mp3", "audio/wav": "wav", "audio/x-wav": "wav", "audio/mp4": "m4a",
    "audio/webm": "weba", "audio/ogg": "ogg",
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
    return {"key": key, "url": storage.url(key), "kind": kind}
