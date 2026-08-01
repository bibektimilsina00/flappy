import uuid
from datetime import datetime

from sqlmodel import SQLModel


class WorkspaceRead(SQLModel):
    id: uuid.UUID
    name: str
    owner_id: uuid.UUID
    plan: str
    preferences: dict | None
    created_at: datetime
