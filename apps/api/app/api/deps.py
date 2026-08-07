"""Shared FastAPI dependencies: db session, current user, current workspace."""

import uuid

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session

from apps.api.app.core.database import get_session  # re-exported for routers
from apps.api.app.features.users.models import User
from apps.api.app.features.workspaces import repository as workspaces_repo

__all__ = ["current_workspace_id", "get_current_user", "get_session"]

# tokenUrl is nominal — Clerk issues tokens, the backend only verifies them.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

_CREDENTIALS_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def user_from_token(session: Session, token: str) -> User | None:
    """Resolve a Clerk session JWT to an active local user (creating/linking on
    first sight). Returns None on any invalid/expired token. Shared by the HTTP
    dep + the executions WebSocket."""
    from apps.api.app.core import clerk as clerk_svc
    from apps.api.app.features.auth import service as auth_service

    claims = clerk_svc.verify_session_token(token)
    if not (claims and claims.get("sub")):
        return None
    user = auth_service.sync_clerk_user(session, claims["sub"])
    return user if user.is_active else None


def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: Session = Depends(get_session),
) -> User:
    user = user_from_token(session, token)
    if user is None:
        raise _CREDENTIALS_ERROR
    return user


def current_workspace_id(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
    x_workspace_id: str | None = Header(default=None, alias="X-Workspace-Id"),
) -> uuid.UUID:
    """The active workspace: the X-Workspace-Id header (validated against
    ownership/membership), else the user's first owned workspace."""
    if x_workspace_id:
        try:
            wid = uuid.UUID(x_workspace_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid workspace id") from None
        if workspaces_repo.can_access(session, wid, user.id):
            return wid
        raise HTTPException(status_code=403, detail="Not a member of that workspace")
    workspace = workspaces_repo.get_by_owner(session, user.id)
    if workspace is None:
        raise HTTPException(status_code=400, detail="No workspace for user")
    return workspace.id
