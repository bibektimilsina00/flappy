import uuid
from datetime import datetime

from sqlmodel import SQLModel

# Request/response schemas are plain SQLModel (no table=True).


class WorkflowCreate(SQLModel):
    name: str
    graph: dict = {}


class WorkflowUpdate(SQLModel):
    name: str | None = None
    graph: dict | None = None


class WorkflowRead(SQLModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    graph: dict
    created_at: datetime
    updated_at: datetime
    thumbnail: str | None = None  # first image (else first video) asset, presigned
