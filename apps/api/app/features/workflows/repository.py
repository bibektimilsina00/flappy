"""DB queries for workflows. Keep all SQL here; service.py calls into it."""

import uuid

from sqlmodel import Session, select

from apps.api.app.features.workflows.models import Workflow


def list_by_workspace(session: Session, workspace_id: uuid.UUID) -> list[Workflow]:
    return list(session.exec(select(Workflow).where(Workflow.workspace_id == workspace_id)))


def get(session: Session, workspace_id: uuid.UUID, workflow_id: uuid.UUID) -> Workflow | None:
    # Tenancy: always filter by workspace_id — never trust the caller.
    return session.exec(
        select(Workflow).where(Workflow.id == workflow_id, Workflow.workspace_id == workspace_id)
    ).first()


def add(session: Session, workflow: Workflow) -> Workflow:
    session.add(workflow)
    session.commit()
    session.refresh(workflow)
    return workflow


def save(session: Session, workflow: Workflow) -> Workflow:
    session.add(workflow)
    session.commit()
    session.refresh(workflow)
    return workflow


def delete(session: Session, workflow: Workflow) -> None:
    session.delete(workflow)
    session.commit()
