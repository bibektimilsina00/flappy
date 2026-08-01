import uuid

from sqlmodel import JSON, Column, Field

from apps.api.app.core.models import TimestampMixin


class Workspace(TimestampMixin, table=True):
    __tablename__ = "workspace"

    name: str = Field(nullable=False)
    owner_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    plan: str = Field(default="free", nullable=False)  # free | plus | pro | ultra | studio_*
    # Dodo subscription backing the plan (None on free) — powers self-serve cancel.
    subscription_id: str | None = Field(default=None)
    # User preferences, e.g. {"clip_defaults": {ratio, quality, layout, caption_style}}.
    preferences: dict | None = Field(default=None, sa_column=Column(JSON))
