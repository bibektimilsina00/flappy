"""Shared FastAPI dependencies: db session, current user, current workspace."""

import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session

from apps.api.app.core.database import get_session  # re-exported for routers
from apps.api.app.core.security import decode_token
from apps.api.app.features.users import repository as users_repo
from apps.api.app.features.users.models import User
from apps.api.app.features.workspaces import repository as workspaces_repo

__all__ = ["current_workspace_id", "get_current_user", "get_session"]

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

_CREDENTIALS_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: Session = Depends(get_session),
) -> User:
    subject = decode_token(token)
    if subject is None:
        raise _CREDENTIALS_ERROR
    user = users_repo.get(session, uuid.UUID(subject))
    if user is None or not user.is_active:
        raise _CREDENTIALS_ERROR
    return user


def current_workspace_id(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> uuid.UUID:
    workspace = workspaces_repo.get_by_owner(session, user.id)
    if workspace is None:
        raise HTTPException(status_code=400, detail="No workspace for user")
    return workspace.id
