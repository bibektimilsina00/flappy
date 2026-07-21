"""DB queries for executions. Keep all SQL here; service.py calls into it."""

import uuid
from datetime import datetime, timezone

from sqlmodel import Session, select

from apps.api.app.features.executions.models import Execution


def add(session: Session, execution: Execution) -> Execution:
    session.add(execution)
    session.commit()
    session.refresh(execution)
    return execution


def get(session: Session, workspace_id: uuid.UUID, execution_id: uuid.UUID) -> Execution | None:
    return session.exec(
        select(Execution).where(
            Execution.id == execution_id, Execution.workspace_id == workspace_id
        )
    ).first()


def list_for_workflow(
    session: Session, workspace_id: uuid.UUID, workflow_id: uuid.UUID
) -> list[Execution]:
    return list(
        session.exec(
            select(Execution)
            .where(
                Execution.workspace_id == workspace_id,
                Execution.workflow_id == workflow_id,
            )
            .order_by(Execution.created_at.desc())
        )
    )


def set_status(
    session: Session,
    execution_id: uuid.UUID,
    status: str,
    error: str | None = None,
    finished: bool = False,
) -> None:
    execution = session.get(Execution, execution_id)
    if execution is None:
        return
    execution.status = status
    execution.error = error
    if finished:
        execution.finished_at = datetime.now(timezone.utc)
    session.add(execution)
    session.commit()
