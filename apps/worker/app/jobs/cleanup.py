"""Periodic sweep: mark runs that died mid-flight as failed so the UI never
shows an eternal spinner. Scheduled via celery beat (see core/celery.py)."""

import logging
from datetime import UTC, datetime, timedelta

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
    now = datetime.now(UTC)
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
        log.info(
            "cleanup: failed %d stuck executions, %d stuck clips jobs",
            len(stuck_exec),
            len(stuck_jobs),
        )


@celery_app.task(name="promote_due_posts")
def promote_due_posts() -> None:
    """At post time: account-backed posts get published (publish_post task);
    account-less posts flip to 'due' — a manual "ready to post" reminder."""
    from apps.api.app.features.clips.models import ScheduledPost

    now = datetime.now(UTC).replace(tzinfo=None)
    with Session(engine) as session:
        due = session.exec(
            select(ScheduledPost).where(
                ScheduledPost.status == "scheduled", ScheduledPost.post_at <= now
            )
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


@celery_app.task(name="refill_free_credits")
def refill_free_credits() -> None:
    """Monthly free-plan grant: top the balance up to FREE_MONTHLY_CREDITS
    every 30 days (top-up, not stacking — unused credits don't accumulate)."""
    from apps.api.app.core.config import settings
    from apps.api.app.features.billing.models import Credit
    from apps.api.app.features.workspaces.models import Workspace

    now = datetime.now(UTC).replace(tzinfo=None)
    granted = 0
    with Session(engine) as session:
        rows = session.exec(
            select(Credit, Workspace).where(
                Workspace.id == Credit.workspace_id, Workspace.plan == "free"
            )
        ).all()
        for credit, _ws in rows:
            last = credit.last_grant_at or credit.created_at
        if (now - last).days >= 30:
                credit.balance = max(credit.balance, settings.free_monthly_credits)
                credit.last_grant_at = now
                session.add(credit)
                granted += 1
        session.commit()
    if granted:
        log.info("free-credit refill: %d workspaces topped up", granted)


@celery_app.task(name="purge_expired_free_clips")
def purge_expired_free_clips() -> None:
    """Hard delete media assets for Free plan clips jobs older than 5 days."""
    from apps.api.app.features.clips.models import ClipsJob
    from apps.api.app.features.workspaces.models import Workspace
    from apps.api.app.storage.factory import get_storage

    now = datetime.now(UTC).replace(tzinfo=None)
    cutoff_hard = now - timedelta(days=5)
    purged_count = 0
    storage = get_storage()

    with Session(engine) as session:
        rows = session.exec(
            select(ClipsJob, Workspace).where(
                ClipsJob.workspace_id == Workspace.id,
                Workspace.plan == "free",
                ClipsJob.created_at < cutoff_hard,
            )
        ).all()

        for job, _ws in rows:
            if job.source_key:
                try:
                    storage.delete(job.source_key)
                except Exception:
                    pass
                job.source_key = None
            if job.source_thumb_key:
                try:
                    storage.delete(job.source_thumb_key)
                except Exception:
                    pass
                job.source_thumb_key = None

            new_clips = []
            for c in job.clips or []:
                key = c.get("key")
                if key:
                    try:
                        storage.delete(key)
                    except Exception:
                        pass
                new_clips.append({**c, "key": None, "url": None, "purged": True})
            job.clips = new_clips
            session.add(job)
            purged_count += 1
        session.commit()

    if purged_count:
        log.info("cleanup: purged media assets for %d expired free-plan clips jobs", purged_count)
