"""DB queries for clips jobs."""

import uuid
from datetime import UTC, datetime

from sqlmodel import Session, desc, select

from apps.api.app.features.clips.models import ClipsJob


def get(session: Session, workspace_id: uuid.UUID, job_id: uuid.UUID) -> ClipsJob | None:
    job = session.get(ClipsJob, job_id)
    return job if job and job.workspace_id == workspace_id else None


def get_any(session: Session, job_id: uuid.UUID) -> ClipsJob | None:
    return session.get(ClipsJob, job_id)


def list_for_workspace(
    session: Session, workspace_id: uuid.UUID, limit: int = 30
) -> list[ClipsJob]:
    return list(
        session.exec(
            select(ClipsJob)
            .where(ClipsJob.workspace_id == workspace_id)
            .order_by(desc(ClipsJob.created_at))
            .limit(limit)
        )
    )


def add(session: Session, job: ClipsJob) -> ClipsJob:
    session.add(job)
    session.commit()
    session.refresh(job)
    return job


def save(session: Session, job: ClipsJob) -> ClipsJob:
    job.updated_at = datetime.now(UTC)
    session.add(job)
    session.commit()
    session.refresh(job)
    return job


def delete(session: Session, job: ClipsJob) -> None:
    session.delete(job)
    session.commit()
