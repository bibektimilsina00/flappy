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


def sync_clerk_user(session: Session, clerk_user_id: str) -> User:
    """Map a verified Clerk user id to a local user, creating one on first sight.
    Matches an existing account by email (linking Clerk to it), else provisions a
    fresh user + workspace + credits. Called from the auth dependency per request."""
    from fastapi import HTTPException

    from apps.api.app.core import clerk as clerk_svc

    user = users_repo.get_by_clerk_id(session, clerk_user_id)
    if user is not None:
        return user

    info = clerk_svc.fetch_user(clerk_user_id)
    email = info.get("email")
    if not email:
        raise HTTPException(status_code=401, detail="Clerk user has no email")

    user = users_repo.get_by_email(session, email)
    if user is not None:  # link Clerk to the existing account
        user.clerk_id = clerk_user_id
        if info.get("avatar_url") and not user.avatar_url:
            user.avatar_url = info["avatar_url"]
        session.add(user)
        session.commit()
        session.refresh(user)
        return user

    user = users_repo.add(
        session,
        User(
            email=email,
            name=info["name"],
            avatar_url=info.get("avatar_url"),
            hashed_password=None,
            auth_provider="clerk",
            clerk_id=clerk_user_id,
        ),
    )
    _provision(session, user)
    return user


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


def login_oauth(
    session: Session,
    provider: str,
    email: str,
    name: str,
    avatar_url: str | None = None,
) -> tuple[str, User]:
    """Find-or-create a user from an OAuth identity (matched by email)."""
    user = users_repo.get_by_email(session, email)
    if user is None:
        user = users_repo.add(
            session,
            User(
                email=email,
                name=name,
                avatar_url=avatar_url,
                hashed_password=None,
                auth_provider=provider,
            ),
        )
        _provision(session, user)
    elif avatar_url and not user.avatar_url:
        user.avatar_url = avatar_url
        session.add(user)
        session.commit()
        session.refresh(user)
    return create_access_token(str(user.id)), user
