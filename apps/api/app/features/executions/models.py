import uuid
from datetime import datetime

from sqlmodel import Field

from apps.api.app.core.models import TimestampMixin


class Execution(TimestampMixin, table=True):
    __tablename__ = "execution"

    workspace_id: uuid.UUID = Field(index=True, nullable=False)
    workflow_id: uuid.UUID = Field(foreign_key="workflow.id", index=True, nullable=False)
    status: str = Field(default="pending", nullable=False)  # pending|running|completed|failed
    error: str | None = Field(default=None)
    finished_at: datetime | None = Field(default=None)
