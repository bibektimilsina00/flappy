"""DB queries for the timeline editor project."""

import uuid
from datetime import datetime, timezone

from sqlmodel import Session, select

from apps.api.app.features.video_editor.models import VideoEditorProject


def get_by_workflow(session: Session, workspace_id: uuid.UUID, workflow_id: uuid.UUID) -> VideoEditorProject | None:
    return session.exec(
        select(VideoEditorProject).where(
            VideoEditorProject.workspace_id == workspace_id,
            VideoEditorProject.workflow_id == workflow_id,
        )
    ).first()


def get(session: Session, workspace_id: uuid.UUID, project_id: uuid.UUID) -> VideoEditorProject | None:
    project = session.get(VideoEditorProject, project_id)
    return project if project and project.workspace_id == workspace_id else None


def add(session: Session, project: VideoEditorProject) -> VideoEditorProject:
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


def save(session: Session, project: VideoEditorProject) -> VideoEditorProject:
    project.updated_at = datetime.now(timezone.utc)
    session.add(project)
    session.commit()
    session.refresh(project)
    return project
