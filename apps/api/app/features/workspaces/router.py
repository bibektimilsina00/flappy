import uuid

from fastapi import APIRouter, Depends
from sqlmodel import Session

from apps.api.app.api.deps import current_workspace_id, get_session
from apps.api.app.features.workspaces.models import Workspace
from apps.api.app.features.workspaces.schemas import WorkspaceRead

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.get("/current", response_model=WorkspaceRead)
def current_workspace(
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    session: Session = Depends(get_session),
):
    return session.get(Workspace, workspace_id)
