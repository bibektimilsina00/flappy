import uuid
from datetime import datetime

from sqlmodel import SQLModel


class WorkspaceRead(SQLModel):
    id: uuid.UUID
    name: str
    owner_id: uuid.UUID
    created_at: datetime
