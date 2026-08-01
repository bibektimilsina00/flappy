import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
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


class WorkspaceUpdate(BaseModel):
    name: str | None = None
    preferences: dict | None = None


@router.patch("/current", response_model=WorkspaceRead)
def update_workspace(
    body: WorkspaceUpdate,
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    session: Session = Depends(get_session),
):
    ws = session.get(Workspace, workspace_id)
    if ws is None:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if body.name is not None:
        name = body.name.strip()[:80]
        if not name:
            raise HTTPException(status_code=422, detail="Name can't be empty.")
        ws.name = name
    if body.preferences is not None:
        ws.preferences = {**(ws.preferences or {}), **body.preferences}
    session.add(ws)
    session.commit()
    session.refresh(ws)
    return ws
