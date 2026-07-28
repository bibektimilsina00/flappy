import uuid

from sqlmodel import JSON, Column, Field

from apps.api.app.core.models import TimestampMixin


class VideoEditorProject(TimestampMixin, table=True):
    """The timeline edit ("final cut") for a workflow. One per workflow for now.

    `doc` is the declarative EditorDoc (fps/size/tracks/clips/…) — the single
    source of truth the browser previews and the server renders. See
    VIDEO-EDITOR-PLAN.md §4.
    """

    __tablename__ = "video_editor_project"

    workspace_id: uuid.UUID = Field(index=True, nullable=False)
    workflow_id: uuid.UUID = Field(index=True, nullable=False)
    title: str = Field(default="Untitled", nullable=False)
    doc: dict = Field(default_factory=dict, sa_column=Column(JSON))
