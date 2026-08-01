"""DB queries for workspaces. Keep all SQL here; service.py calls into it."""

import uuid

from sqlmodel import Session, select

from apps.api.app.features.workspaces.models import Workspace, WorkspaceMember


def get_by_owner(session: Session, owner_id: uuid.UUID) -> Workspace | None:
    return session.exec(select(Workspace).where(Workspace.owner_id == owner_id)).first()


def get(session: Session, workspace_id: uuid.UUID) -> Workspace | None:
    return session.get(Workspace, workspace_id)


def add(session: Session, workspace: Workspace) -> Workspace:
    session.add(workspace)
    session.commit()
    session.refresh(workspace)
    return workspace


def list_for_user(session: Session, user_id: uuid.UUID) -> list[tuple[Workspace, str]]:
    """(workspace, role) pairs — owned first, then memberships."""
    owned = session.exec(
        select(Workspace).where(Workspace.owner_id == user_id).order_by(Workspace.created_at)  # type: ignore[arg-type]
    ).all()
    member_rows = session.exec(
        select(Workspace, WorkspaceMember.role)
        .where(WorkspaceMember.user_id == user_id, Workspace.id == WorkspaceMember.workspace_id)
        .order_by(Workspace.created_at)  # type: ignore[arg-type]
    ).all()
    return [(w, "owner") for w in owned] + [(w, role) for w, role in member_rows]


def can_access(session: Session, workspace_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    ws = session.get(Workspace, workspace_id)
    if ws is None:
        return False
    if ws.owner_id == user_id:
        return True
    return (
        session.exec(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == workspace_id,
                WorkspaceMember.user_id == user_id,
            )
        ).first()
        is not None
    )


def add_member(session: Session, workspace_id: uuid.UUID, user_id: uuid.UUID) -> None:
    """Idempotent membership add."""
    if can_access(session, workspace_id, user_id):
        return
    session.add(WorkspaceMember(workspace_id=workspace_id, user_id=user_id))
    session.commit()


def list_members(session: Session, workspace_id: uuid.UUID) -> list[dict]:
    """Owner + invited members with names/emails, owner first."""
    from apps.api.app.features.users.models import User

    ws = session.get(Workspace, workspace_id)
    out: list[dict] = []
    if ws is not None:
        owner = session.get(User, ws.owner_id)
        if owner:
            out.append(
                {
                    "user_id": str(owner.id),
                    "name": owner.name,
                    "email": owner.email,
                    "role": "owner",
                }
            )
    rows = session.exec(
        select(User, WorkspaceMember.role)
        .where(WorkspaceMember.workspace_id == workspace_id, User.id == WorkspaceMember.user_id)
        .order_by(WorkspaceMember.created_at)  # type: ignore[arg-type]
    ).all()
    out.extend(
        {"user_id": str(u.id), "name": u.name, "email": u.email, "role": role} for u, role in rows
    )
    return out


def remove_member(session: Session, workspace_id: uuid.UUID, user_id: uuid.UUID) -> None:
    row = session.exec(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.user_id == user_id
        )
    ).first()
    if row is not None:
        session.delete(row)
        session.commit()
