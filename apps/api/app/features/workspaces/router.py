import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session

from apps.api.app.api.deps import current_workspace_id, get_current_user, get_session
from apps.api.app.core.config import settings
from apps.api.app.core.security import create_access_token, decode_token
from apps.api.app.features.users.models import User
from apps.api.app.features.workspaces import repository
from apps.api.app.features.workspaces.models import Workspace
from apps.api.app.features.workspaces.schemas import WorkspaceRead

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.get("")
def list_workspaces(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> list[dict]:
    """Every workspace the user can act in (owned + invited), with role."""
    return [
        {"id": str(w.id), "name": w.name, "plan": w.plan, "role": role}
        for w, role in repository.list_for_user(session, user.id)
    ]


class WorkspaceCreate(BaseModel):
    name: str


PAID_FEATURE_MSG = "needs a paid plan"


@router.post("", response_model=WorkspaceRead, status_code=201)
def create_workspace(
    body: WorkspaceCreate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    from apps.api.app.features.billing import service as billing_service

    # One workspace on free; more when any owned workspace is on a paid plan.
    owned = [w for w, role in repository.list_for_user(session, user.id) if role == "owner"]
    if owned and all(w.plan == "free" for w in owned):
        raise HTTPException(
            status_code=402, detail=f"Multiple workspaces {PAID_FEATURE_MSG} — upgrade to add more."
        )

    name = body.name.strip()[:80]
    if not name:
        raise HTTPException(status_code=422, detail="Name can't be empty.")
    ws = repository.add(session, Workspace(name=name, owner_id=user.id))
    billing_service.seed_workspace(session, ws.id)  # fresh free-plan credits
    return ws


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


# ── invites (stateless: signed token, 30-day expiry via TOKEN_TTL) ───────────
@router.post("/current/invite")
def create_invite(
    user: User = Depends(get_current_user),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    session: Session = Depends(get_session),
) -> dict:
    ws = session.get(Workspace, workspace_id)
    if ws is None or ws.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Only the workspace owner can invite.")
    if ws.plan == "free":
        raise HTTPException(
            status_code=402, detail=f"Inviting teammates {PAID_FEATURE_MSG} — upgrade to invite."
        )
    token = create_access_token(f"ws-invite:{workspace_id}")
    return {"url": f"{settings.frontend_url}/invite/{token}"}


@router.get("/current/members")
def list_members(
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    session: Session = Depends(get_session),
    _user: User = Depends(get_current_user),
) -> list[dict]:
    return repository.list_members(session, workspace_id)


@router.delete("/current/members/{member_user_id}", status_code=204)
def remove_member(
    member_user_id: uuid.UUID,
    user: User = Depends(get_current_user),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    session: Session = Depends(get_session),
):
    ws = session.get(Workspace, workspace_id)
    if ws is None or ws.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Only the workspace owner can remove members.")
    repository.remove_member(session, workspace_id, member_user_id)


class JoinRequest(BaseModel):
    token: str


@router.post("/join", response_model=WorkspaceRead)
def join_workspace(
    body: JoinRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    subject = decode_token(body.token)
    if not subject or not subject.startswith("ws-invite:"):
        raise HTTPException(status_code=400, detail="Invalid or expired invite link.")
    wid = uuid.UUID(subject.removeprefix("ws-invite:"))
    ws = session.get(Workspace, wid)
    if ws is None:
        raise HTTPException(status_code=404, detail="That workspace no longer exists.")
    repository.add_member(session, wid, user.id)
    return ws
