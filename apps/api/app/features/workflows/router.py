import uuid

from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from apps.api.app.api.deps import current_workspace_id, get_session
from apps.api.app.features.assets import repository as assets_repo
from apps.api.app.features.workflows import service
from apps.api.app.features.workflows.schemas import WorkflowCreate, WorkflowRead, WorkflowUpdate
from apps.api.app.storage.factory import get_storage

router = APIRouter(prefix="/workflows", tags=["workflows"])


@router.get("/{workflow_id}/outputs")
def workflow_outputs(
    workflow_id: uuid.UUID,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
) -> dict[str, str]:
    """node_id -> freshly presigned URL of each node's latest media output,
    including uploaded assets (whose key lives on the graph node)."""
    workflow = service.get_workflow(session, workspace_id, workflow_id)  # authz / 404
    storage = get_storage()
    latest = assets_repo.latest_by_node_for_workflow(session, workflow_id)
    outputs = {node_id: storage.url(asset.key) for node_id, asset in latest.items() if asset.key}
    for node in (workflow.graph or {}).get("nodes") or []:
        key = (node.get("data") or {}).get("upload_key")
        if key:
            outputs[node["id"]] = storage.url(key)
    return outputs


@router.get("", response_model=list[WorkflowRead])
def list_workflows(
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
):
    return service.list_workflows(session, workspace_id)


@router.post("", response_model=WorkflowRead, status_code=status.HTTP_201_CREATED)
def create_workflow(
    data: WorkflowCreate,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
):
    return service.create_workflow(session, workspace_id, data)


@router.get("/{workflow_id}", response_model=WorkflowRead)
def get_workflow(
    workflow_id: uuid.UUID,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
):
    return service.get_workflow(session, workspace_id, workflow_id)


@router.patch("/{workflow_id}", response_model=WorkflowRead)
def update_workflow(
    workflow_id: uuid.UUID,
    data: WorkflowUpdate,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
):
    return service.update_workflow(session, workspace_id, workflow_id, data)


@router.delete("/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workflow(
    workflow_id: uuid.UUID,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
):
    service.delete_workflow(session, workspace_id, workflow_id)
