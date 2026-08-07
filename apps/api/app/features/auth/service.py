"""Auth business logic. Clerk is the identity provider; the backend verifies its
session tokens and syncs each Clerk user to a local user + workspace on first sight."""

from sqlmodel import Session

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
