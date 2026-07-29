"""Clips repurposing job — thin Celery shell around the pipeline (CLIPS-PLAN.md)."""

import logging
import uuid

from sqlmodel import Session

from apps.api.app.core.celery import celery_app
from apps.api.app.core.database import engine
from apps.api.app.features.billing import service as billing_service
from apps.api.app.features.clips import repository
from apps.api.app.features.clips.pipeline import run_pipeline

log = logging.getLogger(__name__)


@celery_app.task(name="run_clips_job")
def run_clips_job(job_id: str) -> None:
    jid = uuid.UUID(job_id)
    with Session(engine) as session:
        job = repository.get_any(session, jid)
        if job is None or job.status not in ("queued", "failed"):
            return

        def charge(credits: float, label: str) -> None:
            billing_service.charge(session, job.workspace_id, job.id, label, "clips", credits, 0.0)

        try:
            run_pipeline(session, job, charge)
        except Exception as exc:  # noqa: BLE001 — job errors are user-facing state
            log.warning("clips job %s failed in phase %s: %s", job_id, job.phase, exc)
            job.status = "failed"
            job.error = str(exc)[:500]
            repository.save(session, job)


@celery_app.task(name="rerender_clip")
def rerender_clip(job_id: str, clip_id: str) -> None:
    """Re-render one clip after trim/caption edits. The endpoint already updated
    the clip's start/end/caption_edits and set status='rendering'."""
    import os
    import tempfile
    import uuid as uuid_mod

    from apps.api.app.features.clips.pipeline import is_free_plan, render_clip_file
    from apps.api.app.storage.factory import get_storage

    with Session(engine) as session:
        job = repository.get_any(session, uuid.UUID(job_id))
        if job is None or not job.source_key:
            return
        clips = list(job.clips or [])
        clip = next((c for c in clips if c.get("id") == clip_id), None)
        if clip is None:
            return
        storage = get_storage()
        try:
            with tempfile.TemporaryDirectory() as workdir:
                src = os.path.join(workdir, "source.mp4")
                with open(src, "wb") as f:
                    f.write(storage.get(job.source_key))
                key = f"{job.workspace_id}/clips/{job.id}/clip-{clip_id}-{uuid_mod.uuid4().hex[:8]}.mp4"
                render_clip_file(job, src, clip, workdir, storage, key, watermark=is_free_plan(session, job.workspace_id))
            clip.update({"key": key, "status": "ready", "clean": True, "duration": round(clip["end"] - clip["start"], 2)})
        except Exception as exc:  # noqa: BLE001 — surface on the clip, keep the job alive
            log.warning("clip rerender %s/%s failed: %s", job_id, clip_id, exc)
            clip.update({"status": "failed", "error": str(exc)[:300]})
        job.clips = clips
        repository.save(session, job)
