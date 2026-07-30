"""Business logic for auth. Routers call service; service calls repository."""

from fastapi import HTTPException, status
from sqlmodel import Session

from apps.api.app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from apps.api.app.features.auth.schemas import RegisterRequest
from apps.api.app.features.billing import service as billing_service
from apps.api.app.features.users import repository as users_repo
from apps.api.app.features.users.models import User
from apps.api.app.features.workspaces import repository as workspaces_repo
from apps.api.app.features.workspaces.models import Workspace


def _provision(session: Session, user: User) -> None:
    """Give a new user a personal workspace + starting credits."""
    workspace = workspaces_repo.add(
        session, Workspace(name=f"{user.name}'s Workspace", owner_id=user.id)
    )
    billing_service.seed_workspace(session, workspace.id)


def register(session: Session, data: RegisterRequest) -> tuple[str, User]:
    if users_repo.get_by_email(session, data.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = users_repo.add(
        session,
        User(email=data.email, name=data.name, hashed_password=hash_password(data.password)),
    )
    _provision(session, user)
    return create_access_token(str(user.id)), user


def login(session: Session, email: str, password: str) -> tuple[str, User]:
    user = users_repo.get_by_email(session, email)
    if (
        user is None
        or user.hashed_password is None
        or not verify_password(password, user.hashed_password)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password"
        )
    return create_access_token(str(user.id)), user


def login_oauth(session: Session, provider: str, email: str, name: str) -> tuple[str, User]:
    """Find-or-create a user from an OAuth identity (matched by email)."""
    user = users_repo.get_by_email(session, email)
    if user is None:
        user = users_repo.add(
            session,
            User(email=email, name=name, hashed_password=None, auth_provider=provider),
        )
        _provision(session, user)
    return create_access_token(str(user.id)), user
