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
