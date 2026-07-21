from sqlmodel import SQLModel

from apps.api.app.features.users.schemas import UserRead


class RegisterRequest(SQLModel):
    email: str
    password: str
    name: str


class TokenResponse(SQLModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead
