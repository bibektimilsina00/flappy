import uuid
from datetime import datetime

from sqlmodel import SQLModel


class UserRead(SQLModel):
    id: uuid.UUID
    email: str
    name: str
    avatar_url: str | None = None
    is_active: bool
    auth_provider: str
    created_at: datetime
