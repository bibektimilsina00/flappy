import uuid
from datetime import datetime

from sqlmodel import Field

from apps.api.app.core.models import TimestampMixin

INITIAL_CREDITS = 250.0  # welcome grant for new workspaces


class Credit(TimestampMixin, table=True):
    __tablename__ = "credit"

    workspace_id: uuid.UUID = Field(unique=True, index=True, nullable=False)
    balance: float = Field(default=INITIAL_CREDITS, nullable=False)
    # Last monthly free-plan refill (None until the first one runs).
    last_grant_at: datetime | None = Field(default=None, nullable=True)


class UsageRecord(TimestampMixin, table=True):
    __tablename__ = "usage_record"

    workspace_id: uuid.UUID = Field(index=True, nullable=False)
    execution_id: uuid.UUID = Field(index=True, nullable=False)
    node_id: str = Field(nullable=False)
    kind: str = Field(nullable=False)
    cost: float = Field(nullable=False)  # credits charged to the workspace
    usd: float = Field(default=0.0, nullable=False)  # est. real provider spend
