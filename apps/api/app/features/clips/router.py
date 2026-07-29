"""Clips (video repurposing) endpoints — CLIPS-PLAN.md."""

import re
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlmodel import Session

from apps.api.app.api.deps import current_workspace_id, get_current_user, get_session
from apps.api.app.core.celery import celery_app
from apps.api.app.core.config import settings
from apps.api.app.features.billing import service as billing_service
from apps.api.app.features.clips import repository
from apps.api.app.features.clips.models import ClipsJob
from apps.api.app.features.clips.pipeline import DEFAULT_COUNT
from apps.api.app.features.users.models import User
from apps.api.app.storage.factory import get_storage

router = APIRouter(prefix="/clips", tags=["clips"])

URL_RE = re.compile(r"^https?://", re.IGNORECASE)


def _job_out(job: ClipsJob, storage) -> dict:
    return {
        "id": str(job.id),
        "status": job.status,
        "phase": job.phase,
        "progress": job.progress,
        "error": job.error,
        "source_url": job.source_url,
        "source_title": job.source_title,
        "params": job.params,
        "duration": job.duration,
        "created_at": job.created_at.isoformat(),
        "clips": [
            {**c, "url": storage.url(c["key"]) if c.get("key") else None}
            for c in (job.clips or [])
        ],
    }


@router.post("/upload")
async def upload_source(
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    ctype = file.content_type or ""
    if not ctype.startswith("video/"):
        raise HTTPException(status_code=415, detail=f"Not a video file: {ctype or 'unknown type'}")
    data = await file.read()
    if len(data) > 500 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 500 MB).")
    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "mp4"
    key = f"{workspace_id}/clips/uploads/{uuid.uuid4()}.{ext}"
    get_storage().put(key, data, ctype)
    return {"source_key": key, "name": file.filename}


class JobCreate(BaseModel):
    source_url: str | None = None
    source_key: str | None = None
    params: dict = {}


@router.post("/jobs", status_code=201)
def create_job(
    body: JobCreate,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    if bool(body.source_url) == bool(body.source_key):
        raise HTTPException(status_code=422, detail="Provide either a video link or an uploaded file.")
    if body.source_url and not URL_RE.match(body.source_url.strip()):
        raise HTTPException(status_code=422, detail="That doesn't look like a valid link.")

    params = body.params or {}
    count = params.get("count", "auto")
    est_clips = DEFAULT_COUNT if count in (None, "auto") else max(1, min(10, int(count)))
    estimated = settings.clips_credits_select + settings.clips_credits_per_clip * est_clips
    if not billing_service.has_credits(session, workspace_id, estimated):
        raise HTTPException(status_code=402, detail=f"Not enough credits (about {estimated:.0f} needed).")

    job = repository.add(
        session,
        ClipsJob(
            workspace_id=workspace_id,
            source_url=(body.source_url or "").strip() or None,
            source_key=body.source_key,
            params=params,
        ),
    )
    celery_app.send_task("run_clips_job", args=[str(job.id)])
    return _job_out(job, get_storage())


@router.get("/jobs")
def list_jobs(
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> list[dict]:
    storage = get_storage()
    return [_job_out(j, storage) for j in repository.list_for_workspace(session, workspace_id)]


@router.get("/jobs/{job_id}")
def get_job(
    job_id: uuid.UUID,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    job = repository.get(session, workspace_id, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return _job_out(job, get_storage())


@router.delete("/jobs/{job_id}", status_code=204)
def delete_job(
    job_id: uuid.UUID,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> None:
    job = repository.get(session, workspace_id, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    repository.delete(session, job)
