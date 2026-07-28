import uuid

from sqlmodel import JSON, Column, Field

from apps.api.app.core.models import TimestampMixin


class AssistantThread(TimestampMixin, table=True):
    __tablename__ = "assistant_thread"

    workspace_id: uuid.UUID = Field(index=True, nullable=False)
    # Project-scoped: the workflow this conversation belongs to (null = global).
    workflow_id: uuid.UUID | None = Field(default=None, index=True)
    title: str = Field(default="New chat", nullable=False)
    # [{role, content, suggestions?}]
    messages: list = Field(default_factory=list, sa_column=Column(JSON))
