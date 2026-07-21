import uuid

from sqlmodel import Field

from apps.api.app.core.models import TimestampMixin


class Workspace(TimestampMixin, table=True):
    __tablename__ = "workspace"

    name: str = Field(nullable=False)
    owner_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    plan: str = Field(default="free", nullable=False)  # "free" | "pro"
