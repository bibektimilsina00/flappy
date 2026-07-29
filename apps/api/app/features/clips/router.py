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
        "source_thumb_url": storage.url(job.source_thumb_key) if job.source_thumb_key else None,
        "params": job.params,
        "duration": job.duration,
        "created_at": job.created_at.isoformat(),
        "phase_started_at": job.phase_started_at.isoformat() if job.phase_started_at else None,
        "clips": [
            {**c, "url": storage.url(c["key"]) if c.get("key") else None}
            for c in (job.clips or [])
        ],
    }
    if with_transcript:
        # Words included: the player overlays live karaoke captions from them.
        out["transcript"] = [
            {"text": s["text"], "start": s["start"], "end": s["end"], "words": s.get("words") or []}
            for s in (job.transcript or [])
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


class ProbeRequest(BaseModel):
    source_url: str


@router.post("/probe")
def probe_source(
    body: ProbeRequest,
    _workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    """Read a link's metadata (no download) so the configure step can show
    title/thumbnail/duration before the job starts."""
    if not URL_RE.match(body.source_url.strip()):
        raise HTTPException(status_code=422, detail="That doesn't look like a valid link.")
    import yt_dlp

    try:
        with yt_dlp.YoutubeDL({"noplaylist": True, "quiet": True, "no_warnings": True}) as ydl:
            info = ydl.extract_info(body.source_url.strip(), download=False)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Could not read that link: {exc}") from exc
    return {
        "title": info.get("title"),
        "duration": info.get("duration"),
        "thumbnail": info.get("thumbnail"),
        "height": info.get("height"),
    }


class JobCreate(BaseModel):
    source_url: str | None = None
    source_key: str | None = None
    source_title: str | None = None
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
            source_title=(body.source_title or "").strip()[:200] or None,
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
    # Trim/caption edits invalidate any cached caption burns.
    clip.update({"start": round(start, 2), "end": round(end, 2), "status": "rendering", "burned": {}})
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


class DownloadRequest(BaseModel):
    style: str = "none"  # none | a preset name | custom (job's saved template)


@router.post("/jobs/{job_id}/clips/{clip_id}/download")
def download_clip(
    job_id: uuid.UUID,
    clip_id: str,
    body: DownloadRequest,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    """URL for a downloadable MP4 — the clean master, or a caption burn in the
    requested style (burned lazily, cached per style on the clip)."""
    from apps.api.app.features.clips.pipeline import burn_clip_captions

    from apps.api.app.features.clips.captions import PRESETS

    if body.style not in ("none", "custom", *PRESETS):
        raise HTTPException(status_code=422, detail="Unknown caption style")
    job = repository.get(session, workspace_id, job_id)
    clips = list(job.clips or []) if job else []
    clip = next((c for c in clips if c.get("id") == clip_id), None)
    if job is None or clip is None or not clip.get("key"):
        raise HTTPException(status_code=404, detail="Clip not found")

    storage = get_storage()
    # Legacy clips (pre clean-master) already have captions burned in.
    if body.style == "none" or not clip.get("clean"):
        return {"url": storage.url(clip["key"])}
    cached = (clip.get("burned") or {}).get(body.style)
    key = cached or burn_clip_captions(job, clip, body.style, storage)
    if key is None:
        return {"url": storage.url(clip["key"])}  # no speech -> master
    if not cached:
        job.clips = clips
        repository.save(session, job)
    return {"url": storage.url(key)}


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

    from apps.api.app.features.clips.pipeline import burn_clip_captions

    job = repository.get(session, workspace_id, job_id)
    if job is None or not job.clips:
        raise HTTPException(status_code=404, detail="No clips to download")
    storage = get_storage()
    params = job.params or {}
    style = (params.get("caption_style") or "clean") if params.get("captions", True) else None
    clips = list(job.clips)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_STORED) as zf:
        for i, clip in enumerate(clips):
            if not clip.get("key"):
                continue
            key = clip["key"]
            if style and clip.get("clean"):
                key = burn_clip_captions(job, clip, style, storage) or key
            safe = re.sub(r"[^\w\- ]", "", clip.get("title") or f"clip {i + 1}")[:60]
            zf.writestr(f"{i + 1:02d} {safe}.mp4", storage.get(key))
    job.clips = clips  # persist any burns done above
    repository.save(session, job)
    buf.seek(0)
    name = re.sub(r"[^\w\- ]", "", job.source_title or "clips")[:60] or "clips"
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{name}.zip"'},
    )


def _editor_doc_from_job(job: ClipsJob) -> dict:
    """Timeline doc for the editor: clips laid out sequentially on a video
    track, with their captions as SEPARATE text clips (linked to the video clip
    via parentClipId) so users edit video and captions individually."""
    from apps.api.app.features.clips.pipeline import RATIO_SIZES

    w, h = RATIO_SIZES.get((job.params or {}).get("ratio") or "9:16", RATIO_SIZES["9:16"])

    def _base(kind: str, start: float, dur: float) -> dict:
        return {
            "id": uuid.uuid4().hex,
            "kind": kind,
            "start": round(start, 2),
            "duration": round(dur, 2),
            "in": 0.0,
            "out": round(dur, 2),
            "speed": 1.0,
            "volume": 1.0,
            "transform": {"x": 0, "y": 0, "scale": 1, "rotation": 0, "opacity": 1},
            "keyframes": [],
            "effects": [],
        }

    video_clips: list[dict] = []
    text_clips: list[dict] = []
    t = 0.0
    for clip in job.clips:
        if not clip.get("key"):
            continue
        dur = float(clip["end"]) - float(clip["start"])
        vc = {**_base("video", t, dur), "assetId": clip["key"]}
        video_clips.append(vc)
        segments = clip.get("caption_edits") or [
            s for s in (job.transcript or []) if s["end"] > clip["start"] and s["start"] < clip["end"]
        ]
        for seg in segments:
            s = max(float(seg["start"]), float(clip["start"]))
            e = min(float(seg["end"]), float(clip["end"]))
            text = (seg.get("text") or "").strip()
            if e - s < 0.2 or not text:
                continue
            tc = {
                **_base("text", t + (s - float(clip["start"])), e - s),
                "text": {"content": text},
                "parentClipId": vc["id"],  # moves/deletes with its video clip
            }
            text_clips.append(tc)
        t += dur

    def _track(kind: str, name: str, clips: list[dict]) -> dict:
        return {"id": uuid.uuid4().hex, "kind": kind, "name": name, "locked": False, "hidden": False, "muted": False, "clips": clips}

    tracks = [_track("video", "V1", video_clips)]
    if text_clips:
        tracks.append(_track("text", "Captions", text_clips))
    tracks.append(_track("video", "Track", []))
    return {
        "version": 1,
        "fps": 30,
        "width": w,
        "height": h,
        "duration": t,
        "background": "#000000",
        "tracks": tracks,
        "markers": [],
    }


@router.post("/jobs/{job_id}/to-project", status_code=201)
def to_project(
    job_id: uuid.UUID,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    """Create a workflow + seeded timeline from this job's clips. Clip video
    and captions arrive as separate timeline items (text clips), individually
    editable in the editor."""
    from apps.api.app.features.video_editor import repository as editor_repo
    from apps.api.app.features.video_editor.models import VideoEditorProject
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
    # Pre-seed the timeline so the editor opens with video + caption tracks
    # (get_project only seeds when no project exists yet).
    editor_repo.add(
        session,
        VideoEditorProject(
            workspace_id=workspace_id,
            workflow_id=workflow.id,
            title=workflow.name,
            doc=_editor_doc_from_job(job),
        ),
    )
    return {"workflow_id": str(workflow.id)}


@router.get("/schedule")
def list_schedule(
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> list[dict]:
    """Upcoming + due posts across the workspace, soonest first."""
    from sqlmodel import select

    from apps.api.app.features.clips.models import ScheduledPost

    posts = list(
        session.exec(
            select(ScheduledPost)
            .where(ScheduledPost.workspace_id == workspace_id, ScheduledPost.status.in_(("scheduled", "due")))  # type: ignore[attr-defined]
            .order_by(ScheduledPost.post_at)
            .limit(200)
        )
    )
    storage = get_storage()
    jobs: dict[uuid.UUID, ClipsJob | None] = {}
    out = []
    for p in posts:
        if p.job_id not in jobs:
            jobs[p.job_id] = repository.get(session, workspace_id, p.job_id)
        job = jobs[p.job_id]
        clip = next((c for c in (job.clips if job else []) or [] if c.get("id") == p.clip_id), None)
        out.append(
            {
                "id": str(p.id),
                "job_id": str(p.job_id),
                "clip_id": p.clip_id,
                "title": p.title or (clip or {}).get("title"),
                "post_at": p.post_at.isoformat() + "Z",
                "status": p.status,
                "score": (clip or {}).get("score"),
                "url": storage.url(clip["key"]) if clip and clip.get("key") else None,
            }
        )
    return out


@router.delete("/schedule/{post_id}", status_code=204)
def cancel_scheduled_post(
    post_id: uuid.UUID,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> None:
    from apps.api.app.features.clips.models import ScheduledPost

    post = session.get(ScheduledPost, post_id)
    if post is None or post.workspace_id != workspace_id:
        raise HTTPException(status_code=404, detail="Scheduled post not found")
    session.delete(post)
    session.commit()


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
