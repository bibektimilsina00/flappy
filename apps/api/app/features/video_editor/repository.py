"""DB queries for the timeline editor project."""

import uuid
from datetime import datetime, timezone

from sqlmodel import Session, select

from apps.api.app.features.video_editor.models import VideoEditorComment, VideoEditorProject


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


def get_by_token(session: Session, token: str) -> tuple[VideoEditorProject, str] | None:
    """Resolve a public share token to (project, mode)."""
    if not token:
        return None
    project = session.exec(select(VideoEditorProject).where(VideoEditorProject.share_review_token == token)).first()
    if project:
        return project, "review"
    project = session.exec(select(VideoEditorProject).where(VideoEditorProject.share_present_token == token)).first()
    if project:
        return project, "presentation"
    return None


def comments_for(session: Session, project_id: uuid.UUID) -> list[VideoEditorComment]:
    return list(
        session.exec(
            select(VideoEditorComment)
            .where(VideoEditorComment.project_id == project_id)
            .order_by(VideoEditorComment.at)
        )
    )


def add_comment(session: Session, comment: VideoEditorComment) -> VideoEditorComment:
    session.add(comment)
    session.commit()
    session.refresh(comment)
    return comment
