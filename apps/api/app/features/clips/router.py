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


def _job_out(job: ClipsJob, storage, with_transcript: bool = False) -> dict:
    out = {
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
    if with_transcript:
        # Segment texts only (no word timings) — enough for the caption editor.
        out["transcript"] = [
            {"text": s["text"], "start": s["start"], "end": s["end"]} for s in (job.transcript or [])
        ]
    return out


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

    # Free plan: cap jobs per day (whisper time is real compute).
    from datetime import datetime, timezone

    from apps.api.app.features.workspaces import repository as workspaces_repo

    workspace = workspaces_repo.get(session, workspace_id)
    if (workspace.plan if workspace else "free") == "free":
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
        used = sum(1 for j in repository.list_for_workspace(session, workspace_id) if j.created_at >= today)
        if used >= settings.clips_free_jobs_per_day:
            raise HTTPException(
                status_code=429,
                detail=f"Free plan is limited to {settings.clips_free_jobs_per_day} clip jobs per day — upgrade for more.",
            )

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
    return _job_out(job, get_storage(), with_transcript=True)


class RerenderRequest(BaseModel):
    start: float | None = None
    end: float | None = None
    # Edited caption segments (absolute source times): [{start, end, text}]
    caption_edits: list[dict] | None = None


@router.post("/jobs/{job_id}/clips/{clip_id}/rerender")
def rerender(
    job_id: uuid.UUID,
    clip_id: str,
    body: RerenderRequest,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    """Apply trim/caption edits to one clip and re-render just that clip."""
    job = repository.get(session, workspace_id, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    if not job.source_key:
        raise HTTPException(status_code=409, detail="The source video is no longer available for this job.")
    clips = list(job.clips or [])
    clip = next((c for c in clips if c.get("id") == clip_id), None)
    if clip is None:
        raise HTTPException(status_code=404, detail="Clip not found")

    start = clip["start"] if body.start is None else max(0.0, float(body.start))
    end = clip["end"] if body.end is None else float(body.end)
    if job.duration:
        end = min(end, job.duration)
    if end - start < 3:
        raise HTTPException(status_code=422, detail="A clip must be at least 3 seconds long.")
    clip.update({"start": round(start, 2), "end": round(end, 2), "status": "rendering"})
    if body.caption_edits is not None:
        edits = [
            {"start": float(e["start"]), "end": float(e["end"]), "text": str(e["text"]).strip()}
            for e in body.caption_edits
            if e.get("text", "").strip()
        ]
        clip["caption_edits"] = edits or None
    job.clips = clips
    repository.save(session, job)
    celery_app.send_task("rerender_clip", args=[str(job.id), clip_id])
    return _job_out(job, get_storage(), with_transcript=True)


@router.get("/jobs/{job_id}/clips/{clip_id}/srt")
def clip_srt(
    job_id: uuid.UUID,
    clip_id: str,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
):
    from fastapi.responses import PlainTextResponse

    from apps.api.app.features.clips.captions import build_srt

    job = repository.get(session, workspace_id, job_id)
    clip = next((c for c in (job.clips if job else []) or [] if c.get("id") == clip_id), None)
    if job is None or clip is None:
        raise HTTPException(status_code=404, detail="Clip not found")
    srt = build_srt(job.transcript or [], clip["start"], clip["end"], clip.get("caption_edits"))
    if not srt:
        raise HTTPException(status_code=404, detail="No speech in this clip.")
    return PlainTextResponse(
        srt,
        media_type="application/x-subrip",
        headers={"Content-Disposition": f'attachment; filename="clip-{clip_id[:8]}.srt"'},
    )


@router.get("/jobs/{job_id}/zip")
def job_zip(
    job_id: uuid.UUID,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
):
    import io
    import zipfile

    from fastapi.responses import StreamingResponse

    job = repository.get(session, workspace_id, job_id)
    if job is None or not job.clips:
        raise HTTPException(status_code=404, detail="No clips to download")
    storage = get_storage()
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_STORED) as zf:
        for i, clip in enumerate(job.clips):
            if clip.get("key"):
                safe = re.sub(r"[^\w\- ]", "", clip.get("title") or f"clip {i + 1}")[:60]
                zf.writestr(f"{i + 1:02d} {safe}.mp4", storage.get(clip["key"]))
    buf.seek(0)
    name = re.sub(r"[^\w\- ]", "", job.source_title or "clips")[:60] or "clips"
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{name}.zip"'},
    )


@router.post("/jobs/{job_id}/to-project", status_code=201)
def to_project(
    job_id: uuid.UUID,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    """Create a workflow project holding this job's clips, so they open in the
    timeline editor (and canvas) with the shared media pool."""
    from apps.api.app.features.workflows import repository as workflows_repo
    from apps.api.app.features.workflows.models import Workflow

    job = repository.get(session, workspace_id, job_id)
    if job is None or not job.clips:
        raise HTTPException(status_code=404, detail="No clips to open")
    nodes = [
        {
            "id": f"node-{uuid.uuid4()}",
            "type": "video",
            "position": {"x": 240 + (i % 4) * 320, "y": 140 + (i // 4) * 260},
            "data": {
                "kind": "video",
                "upload_key": clip["key"],
                "upload_name": f"{clip.get('title') or f'Clip {i + 1}'}.mp4",
                "label": clip.get("title") or f"Clip {i + 1}",
            },
        }
        for i, clip in enumerate(job.clips)
        if clip.get("key")
    ]
    workflow = workflows_repo.add(
        session,
        Workflow(
            workspace_id=workspace_id,
            name=(job.source_title or "Clips")[:80],
            graph={"nodes": nodes, "edges": []},
        ),
    )
    return {"workflow_id": str(workflow.id)}


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
