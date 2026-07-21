import uuid
from datetime import datetime

from sqlmodel import SQLModel


class ExecutionCreate(SQLModel):
    workflow_id: uuid.UUID
    node_id: str | None = None  # run just this node's subgraph when set


class ExecutionRead(SQLModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    workflow_id: uuid.UUID
    status: str
    error: str | None
    created_at: datetime
    finished_at: datetime | None
