"""DB queries for workspaces. Keep all SQL here; service.py calls into it."""

import uuid

from sqlmodel import Session, select

from apps.api.app.features.workspaces.models import Workspace


def get_by_owner(session: Session, owner_id: uuid.UUID) -> Workspace | None:
    return session.exec(select(Workspace).where(Workspace.owner_id == owner_id)).first()


def get(session: Session, workspace_id: uuid.UUID) -> Workspace | None:
    return session.get(Workspace, workspace_id)


def add(session: Session, workspace: Workspace) -> Workspace:
    session.add(workspace)
    session.commit()
    session.refresh(workspace)
    return workspace
