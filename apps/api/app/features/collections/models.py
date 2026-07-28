import uuid

from sqlmodel import JSON, Column, Field

from apps.api.app.core.models import TimestampMixin


class Collection(TimestampMixin, table=True):
    """A user folder for grouping assets. `asset_ids` holds library asset refs
    (generated asset UUIDs and uploaded storage keys) — the same ids /assets/library
    returns. Membership is a plain ordered list; reassign it to mutate (JSON column)."""

    __tablename__ = "collection"

    workspace_id: uuid.UUID = Field(index=True, nullable=False)
    name: str = Field(default="Untitled", nullable=False)
    asset_ids: list[str] = Field(default_factory=list, sa_column=Column(JSON))
