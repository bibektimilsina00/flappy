"""Business logic for workflows. Routers call service; service calls repository."""

import uuid
from datetime import UTC, datetime

from fastapi import HTTPException
from sqlmodel import Session

from apps.api.app.features.workflows import repository
from apps.api.app.features.workflows.models import Workflow
from apps.api.app.features.workflows.schemas import WorkflowCreate, WorkflowUpdate


def list_workflows(session: Session, workspace_id: uuid.UUID) -> list[Workflow]:
    return repository.list_by_workspace(session, workspace_id)


def get_workflow(session: Session, workspace_id: uuid.UUID, workflow_id: uuid.UUID) -> Workflow:
    wf = repository.get(session, workspace_id, workflow_id)
    if wf is None:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return wf


def create_workflow(session: Session, workspace_id: uuid.UUID, data: WorkflowCreate) -> Workflow:
    wf = Workflow(workspace_id=workspace_id, name=data.name, graph=data.graph)
    return repository.add(session, wf)


def update_workflow(
    session: Session, workspace_id: uuid.UUID, workflow_id: uuid.UUID, data: WorkflowUpdate
) -> Workflow:
    wf = get_workflow(session, workspace_id, workflow_id)
    if data.name is not None:
        wf.name = data.name
    if data.graph is not None:
        wf.graph = data.graph
    wf.updated_at = datetime.now(UTC)
    return repository.save(session, wf)


def delete_workflow(session: Session, workspace_id: uuid.UUID, workflow_id: uuid.UUID) -> None:
    wf = get_workflow(session, workspace_id, workflow_id)
    repository.delete(session, wf)
