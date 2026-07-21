import uuid

from sqlmodel import Field

from apps.api.app.core.models import TimestampMixin


class Asset(TimestampMixin, table=True):
    __tablename__ = "asset"

    workspace_id: uuid.UUID = Field(index=True, nullable=False)
    execution_id: uuid.UUID = Field(foreign_key="execution.id", index=True, nullable=False)
    node_id: str = Field(index=True, nullable=False)
    kind: str = Field(nullable=False)  # image|video|audio|text
    # Stable storage object key — source of truth. URLs are presigned on demand.
    key: str = Field(default="", nullable=False)
    url: str = Field(nullable=False)  # presigned at generation time; may expire
    cost: float = Field(default=0.0, nullable=False)
