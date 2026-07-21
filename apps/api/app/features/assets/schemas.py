import uuid
from datetime import datetime

from sqlmodel import SQLModel


class AssetRead(SQLModel):
    id: uuid.UUID
    execution_id: uuid.UUID
    node_id: str
    kind: str
    url: str
    cost: float
    created_at: datetime
