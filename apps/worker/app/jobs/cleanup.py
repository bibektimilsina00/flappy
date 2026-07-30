"""Periodic sweep: mark runs that died mid-flight as failed so the UI never
shows an eternal spinner. Scheduled via celery beat (see core/celery.py)."""

import logging
from datetime import datetime, timedelta, timezone

from sqlmodel import Session, select

from apps.api.app.core.celery import celery_app
from apps.api.app.core.database import engine
from apps.api.app.features.clips.models import ClipsJob
from apps.api.app.features.executions.models import Execution

log = logging.getLogger(__name__)

EXECUTION_TIMEOUT = timedelta(minutes=30)
CLIPS_TIMEOUT = timedelta(minutes=90)  # whisper on CPU can be slow for long sources


@celery_app.task(name="cleanup_stuck")
def cleanup_stuck() -> None:
    now = datetime.now(timezone.utc)
    with Session(engine) as session:
        stuck_exec = session.exec(
            select(Execution).where(
                Execution.status.in_(("pending", "running")),  # type: ignore[attr-defined]
                Execution.updated_at < (now - EXECUTION_TIMEOUT).replace(tzinfo=None),
            )
        ).all()
        for e in stuck_exec:
            e.status = "failed"
            e.error = "Timed out — the worker never finished this run."
            e.finished_at = now
            session.add(e)
        stuck_jobs = session.exec(
            select(ClipsJob).where(
                ClipsJob.status.in_(("queued", "running")),  # type: ignore[attr-defined]
                ClipsJob.updated_at < (now - CLIPS_TIMEOUT).replace(tzinfo=None),
            )
        ).all()
        for j in stuck_jobs:
            j.status = "failed"
            j.error = "Timed out — the worker never finished this job."
            session.add(j)
        session.commit()
    if stuck_exec or stuck_jobs:
        log.info("cleanup: failed %d stuck executions, %d stuck clips jobs", len(stuck_exec), len(stuck_jobs))


@celery_app.task(name="promote_due_posts")
def promote_due_posts() -> None:
    """At post time: account-backed posts get published (publish_post task);
    account-less posts flip to 'due' — a manual "ready to post" reminder."""
    from apps.api.app.features.clips.models import ScheduledPost

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    with Session(engine) as session:
        due = session.exec(
            select(ScheduledPost).where(ScheduledPost.status == "scheduled", ScheduledPost.post_at <= now)
        ).all()
        for p in due:
            p.status = "due"
            session.add(p)
        session.commit()
        auto = [str(p.id) for p in due if p.social_account_id]
    for post_id in auto:
        celery_app.send_task("publish_post", args=[post_id])
    if due:
        log.info("schedule: %d posts due (%d auto-publishing)", len(due), len(auto))
