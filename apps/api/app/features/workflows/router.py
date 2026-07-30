import uuid

from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from apps.api.app.api.deps import current_workspace_id, get_session
from apps.api.app.features.assets import repository as assets_repo
from apps.api.app.features.workflows import service
from apps.api.app.features.workflows.schemas import (
    WorkflowCreate,
    WorkflowRead,
    WorkflowUpdate,
)
from apps.api.app.storage.factory import get_storage

router = APIRouter(prefix="/workflows", tags=["workflows"])

_IMAGE_EXT = ("png", "jpg", "jpeg", "webp", "gif", "avif")
_VIDEO_EXT = ("mp4", "webm", "mov", "m4v", "mkv")


def _thumbnail_key(workflow, generated: list) -> str | None:
    """Pick the project thumbnail, most-representative first:
    newest generated image → newest generated video → uploaded image → uploaded video.
    (`generated` is newest-first; uploaded media lives on graph nodes as `upload_key`.)"""
    gen_images = [a.key for a in generated if a.kind == "image"]
    gen_videos = [a.key for a in generated if a.kind == "video"]
    up_images: list[str] = []
    up_videos: list[str] = []
    for node in (workflow.graph or {}).get("nodes") or []:
        key = (node.get("data") or {}).get("upload_key")
        if not key:
            continue
        ext = key.rsplit(".", 1)[-1].lower() if "." in key else ""
        if ext in _IMAGE_EXT:
            up_images.append(key)
        elif ext in _VIDEO_EXT:
            up_videos.append(key)
    for bucket in (gen_images, gen_videos, up_images, up_videos):
        if bucket:
            return bucket[0]
    return None


def _with_thumbnail(workflow, generated: list, storage) -> WorkflowRead:
    key = _thumbnail_key(workflow, generated)
    return WorkflowRead(**workflow.model_dump(), thumbnail=storage.url(key) if key else None)


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
    workflows = service.list_workflows(session, workspace_id)
    media = assets_repo.media_assets_for_workspace(session, workspace_id)
    storage = get_storage()
    return [_with_thumbnail(wf, media.get(wf.id, []), storage) for wf in workflows]


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
    wf = service.get_workflow(session, workspace_id, workflow_id)
    media = assets_repo.media_assets_for_workspace(session, workspace_id, workflow_id)
    return _with_thumbnail(wf, media.get(wf.id, []), get_storage())


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
