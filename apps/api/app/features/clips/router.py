"""Clips (video repurposing) endpoints — CLIPS-PLAN.md."""

import re
import uuid
from datetime import UTC

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


def _oembed(url: str) -> dict | None:
    import httpx

    try:
        r = httpx.get(
            "https://www.youtube.com/oembed", params={"url": url, "format": "json"}, timeout=5
        )
        return r.json() if r.status_code == 200 else None
    except Exception:
        return None


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
            {**c, "url": storage.url(c["key"]) if c.get("key") else None} for c in (job.clips or [])
        ],
    }
    if with_transcript:
        # Source playback for the clip editor (trim against the full video).
        out["source_media_url"] = storage.url(job.source_key) if job.source_key else None
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
    ext = (
        file.filename.rsplit(".", 1)[-1].lower()
        if file.filename and "." in file.filename
        else "mp4"
    )
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
    from apps.api.app.features.clips.pipeline import friendly_link_error, ydl_extract

    url = body.source_url.strip()
    try:
        info = ydl_extract(url, download=False)
    except Exception as exc:
        friendly = friendly_link_error(exc)
        if "upload the file" in friendly:
            # Bot-walled: YouTube's public oEmbed still serves metadata, so the
            # UI can show a card pointing the user at the upload path.
            meta = _oembed(url)
            if meta:
                return {
                    "title": meta.get("title"),
                    "duration": None,
                    "thumbnail": meta.get("thumbnail_url"),
                    "height": None,
                    "blocked": True,
                    "message": friendly,
                }
        raise HTTPException(status_code=422, detail=friendly) from exc
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
    workflow_id: uuid.UUID | None = None  # link to an existing project (its Clips tab)
    params: dict = {}


@router.post("/jobs", status_code=201)
def create_job(
    body: JobCreate,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    if bool(body.source_url) == bool(body.source_key):
        raise HTTPException(
            status_code=422, detail="Provide either a video link or an uploaded file."
        )
    if body.source_url and not URL_RE.match(body.source_url.strip()):
        raise HTTPException(status_code=422, detail="That doesn't look like a valid link.")

    params = body.params or {}
    count = params.get("count", "auto")
    est_clips = DEFAULT_COUNT if count in (None, "auto") else max(1, min(10, int(count)))
    estimated = settings.clips_credits_select + settings.clips_credits_per_clip * est_clips
    if not billing_service.has_credits(session, workspace_id, estimated):
        raise HTTPException(
            status_code=402, detail=f"Not enough credits (about {estimated:.0f} needed)."
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
    # Every clips job is a project from the start (shows in Projects/recents).
    from apps.api.app.features.clips.project_link import create_project_for_job
    from apps.api.app.features.workflows import repository as workflows_repo

    if body.workflow_id and (wf := workflows_repo.get(session, workspace_id, body.workflow_id)):
        job.workflow_id = body.workflow_id
        if job.source_title:  # project carries the video's title
            wf.name = job.source_title[:80]
            session.add(wf)
    else:
        create_project_for_job(session, job)
    job = repository.save(session, job)
    celery_app.send_task("run_clips_job", args=[str(job.id)])
    return _job_out(job, get_storage())


@router.get("/estimate")
def estimate_cost(
    count: str = "auto",
    _workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    """Credits a job with this clip count will charge (select + per-clip)."""
    est_clips = DEFAULT_COUNT if count in ("auto", "", None) else max(1, min(10, int(count)))
    return {"credits": settings.clips_credits_select + settings.clips_credits_per_clip * est_clips}


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
        raise HTTPException(
            status_code=409, detail="The source video is no longer available for this job."
        )
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
    clip.update(
        {"start": round(start, 2), "end": round(end, 2), "status": "rendering", "burned": {}}
    )
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
    from apps.api.app.features.clips.captions import PRESETS
    from apps.api.app.features.clips.pipeline import burn_clip_captions

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
    from apps.api.app.features.clips.pipeline import BURN_VERSION

    cached = (clip.get("burned") or {}).get(f"{body.style}#v{BURN_VERSION}")
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


def _editor_doc_from_job(job: ClipsJob, clips: list[dict] | None = None) -> dict:
    from apps.api.app.features.clips.project_link import editor_doc_from_job

    return editor_doc_from_job(job, clips)


class ToProjectRequest(BaseModel):
    clip_id: str | None = None  # open just one clip in the editor
    clip_ids: list[str] | None = None  # or a selection of clips


@router.post("/jobs/{job_id}/to-project", status_code=201)
def to_project(
    job_id: uuid.UUID,
    body: ToProjectRequest | None = None,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    """Create a workflow + seeded timeline from this job's clips (or a single
    clip). Clip video and captions arrive as separate timeline items (text
    clips), individually editable in the editor."""
    from apps.api.app.features.video_editor import repository as editor_repo
    from apps.api.app.features.video_editor.models import VideoEditorProject
    from apps.api.app.features.workflows import repository as workflows_repo
    from apps.api.app.features.workflows.models import Workflow

    job = repository.get(session, workspace_id, job_id)
    ids = (body.clip_ids if body and body.clip_ids else None) or (
        [body.clip_id] if body and body.clip_id else None
    )
    selected = [
        c
        for c in (job.clips if job else []) or []
        if c.get("key") and (ids is None or c.get("id") in ids)
    ]
    if job is None or not selected:
        raise HTTPException(status_code=404, detail="No clips to open")
    # Full-job opens reuse the linked project instead of creating duplicates.
    if (
        ids is None
        and job.workflow_id
        and workflows_repo.get(session, workspace_id, job.workflow_id)
    ):
        return {"workflow_id": str(job.workflow_id)}
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
        for i, clip in enumerate(selected)
    ]
    workflow = workflows_repo.add(
        session,
        Workflow(
            workspace_id=workspace_id,
            name=(
                (selected[0].get("title") if ids and len(selected) == 1 else job.source_title)
                or "Clips"
            )[:80],
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
            doc=_editor_doc_from_job(job, selected),
        ),
    )
    if ids is None:
        job.workflow_id = workflow.id
        repository.save(session, job)
    return {"workflow_id": str(workflow.id)}


@router.get("/by-workflow/{workflow_id}")
def job_by_workflow(
    workflow_id: uuid.UUID,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    """The clips job linked to an editor/canvas project (for the mode tabs)."""
    from sqlmodel import select

    job = session.exec(
        select(ClipsJob).where(
            ClipsJob.workspace_id == workspace_id, ClipsJob.workflow_id == workflow_id
        )
    ).first()
    if job is None:
        raise HTTPException(status_code=404, detail="No clips job for this project")
    return {"job_id": str(job.id)}


class PublishRequest(BaseModel):
    account_ids: list[uuid.UUID]
    caption: str | None = None


@router.post("/jobs/{job_id}/clips/{clip_id}/publish", status_code=201)
def publish_clip_now(
    job_id: uuid.UUID,
    clip_id: str,
    body: PublishRequest,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> list[dict]:
    """Post this clip to the selected connected accounts right now — one
    ScheduledPost per account, published by the worker."""
    from datetime import datetime

    from apps.api.app.features.clips.models import ScheduledPost
    from apps.api.app.features.social.models import SocialAccount

    job = repository.get(session, workspace_id, job_id)
    clip = next(
        (c for c in (job.clips if job else []) or [] if c.get("id") == clip_id and c.get("key")),
        None,
    )
    if job is None or clip is None:
        raise HTTPException(status_code=404, detail="Clip not found")
    accounts = [
        a
        for aid in body.account_ids
        if (a := session.get(SocialAccount, aid)) and a.workspace_id == workspace_id
    ]
    if not accounts:
        raise HTTPException(status_code=422, detail="Select at least one connected account")

    now = datetime.now(UTC).replace(tzinfo=None)
    posts = []
    for account in accounts:
        post = ScheduledPost(
            workspace_id=workspace_id,
            job_id=job.id,
            clip_id=clip_id,
            title=clip.get("title"),
            post_at=now,
            status="posting",
            social_account_id=account.id,
            platform=account.platform,
            caption=(body.caption or "").strip() or None,
        )
        session.add(post)
        posts.append((post, account))
    session.commit()
    for post, _ in posts:
        celery_app.send_task("publish_post", args=[str(post.id)])
    return [
        {
            "id": str(post.id),
            "clip_id": post.clip_id,
            "status": post.status,
            "platform": post.platform,
            "account": account.username,
            "result_url": post.result_url,
            "error": post.error,
        }
        for post, account in posts
    ]


class BulkScheduleRequest(BaseModel):
    clip_ids: list[str]
    config: dict


@router.post("/jobs/{job_id}/schedule", status_code=201)
def bulk_schedule(
    job_id: uuid.UUID,
    body: BulkScheduleRequest,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> list[dict]:
    """Queue the selected clips for posting. Replaces any not-yet-due posts
    for the same clips."""
    from sqlmodel import select

    from apps.api.app.features.clips.models import ScheduledPost
    from apps.api.app.features.clips.schedule import compute_schedule

    job = repository.get(session, workspace_id, job_id)
    clips = [
        c
        for c in (job.clips if job else []) or []
        if c.get("key") and c.get("id") in set(body.clip_ids)
    ]
    if job is None or not clips:
        raise HTTPException(status_code=404, detail="No clips selected")

    stale = session.exec(
        select(ScheduledPost).where(
            ScheduledPost.job_id == job.id,
            ScheduledPost.status == "scheduled",
            ScheduledPost.clip_id.in_(body.clip_ids),  # type: ignore[attr-defined]
        )
    ).all()
    for p in stale:
        session.delete(p)

    from apps.api.app.features.clips.schedule import workspace_accounts

    targets = workspace_accounts(session, workspace_id, body.config.get("account_ids") or [])
    created = []
    for clip, when in compute_schedule(clips, {**body.config, "min_score": None}):
        for account in targets or [None]:
            post = ScheduledPost(
                workspace_id=workspace_id,
                job_id=job.id,
                clip_id=clip["id"],
                title=clip.get("title"),
                post_at=when.replace(tzinfo=None),
                social_account_id=account.id if account else None,
                platform=account.platform if account else None,
            )
            session.add(post)
            created.append(post)
    session.commit()
    return [
        {"id": str(p.id), "clip_id": p.clip_id, "post_at": p.post_at.isoformat() + "Z"}
        for p in created
    ]


@router.get("/schedule")
def list_schedule(
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> list[dict]:
    """Upcoming + due posts across the workspace, soonest first."""
    from sqlmodel import select

    from apps.api.app.features.clips.models import ScheduledPost
    from apps.api.app.features.social.models import SocialAccount

    posts = list(
        session.exec(
            select(ScheduledPost)
            .where(
                ScheduledPost.workspace_id == workspace_id,
                ScheduledPost.status.in_(("scheduled", "due", "posting", "posted", "failed")),  # type: ignore[attr-defined]
            )
            .order_by(ScheduledPost.post_at)
            .limit(200)
        )
    )
    acct_ids = {p.social_account_id for p in posts if p.social_account_id}
    account_names = (
        {
            a.id: a.username or a.platform
            for a in session.exec(select(SocialAccount).where(SocialAccount.id.in_(acct_ids)))  # type: ignore[attr-defined]
        }
        if acct_ids
        else {}
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
                "platform": p.platform,
                "account": account_names.get(p.social_account_id),
                "result_url": p.result_url,
                "error": p.error,
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
