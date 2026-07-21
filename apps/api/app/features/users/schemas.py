import uuid
from datetime import datetime

from sqlmodel import SQLModel


class UserRead(SQLModel):
    id: uuid.UUID
    email: str
    name: str
    is_active: bool
    created_at: datetime
