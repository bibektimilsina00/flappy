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
    # Public share links (opaque URL tokens; null = not shared in that mode).
    share_review_token: str | None = Field(default=None, index=True)
    share_present_token: str | None = Field(default=None, index=True)
    # Storage key of the latest MP4 render — what shared pages play.
    last_render_key: str | None = Field(default=None)


class VideoEditorComment(TimestampMixin, table=True):
    """A review comment on a shared project, anchored to a timeline second."""

    __tablename__ = "video_editor_comment"

    project_id: uuid.UUID = Field(index=True, nullable=False)
    author: str = Field(nullable=False)
    text: str = Field(nullable=False)
    at: float = Field(default=0.0, nullable=False)  # timecode (s)
