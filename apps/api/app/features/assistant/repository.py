"""DB queries for assistant conversation threads."""

import uuid
from datetime import UTC, datetime

from sqlmodel import Session, select

from apps.api.app.features.assistant.models import AssistantThread


def create(
    session: Session, workspace_id: uuid.UUID, workflow_id: uuid.UUID | None
) -> AssistantThread:
    thread = AssistantThread(workspace_id=workspace_id, workflow_id=workflow_id, messages=[])
    session.add(thread)
    session.commit()
    session.refresh(thread)
    return thread


def get(session: Session, workspace_id: uuid.UUID, thread_id: uuid.UUID) -> AssistantThread | None:
    thread = session.get(AssistantThread, thread_id)
    return thread if thread and thread.workspace_id == workspace_id else None


def list_for_workflow(
    session: Session, workspace_id: uuid.UUID, workflow_id: uuid.UUID | None
) -> list[AssistantThread]:
    stmt = (
        select(AssistantThread)
        .where(AssistantThread.workspace_id == workspace_id)
        .where(AssistantThread.workflow_id == workflow_id)
        .order_by(AssistantThread.updated_at.desc())
    )
    return list(session.exec(stmt))


def save(
    session: Session, thread: AssistantThread, messages: list, title: str | None = None
) -> AssistantThread:
    thread.messages = messages
    if title and thread.title == "New chat":
        thread.title = title[:60]
    thread.updated_at = datetime.now(UTC)
    session.add(thread)
    session.commit()
    session.refresh(thread)
    return thread


def delete(session: Session, thread: AssistantThread) -> None:
    session.delete(thread)
    session.commit()
