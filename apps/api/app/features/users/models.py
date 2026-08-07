from sqlmodel import Field

from apps.api.app.core.models import TimestampMixin


class User(TimestampMixin, table=True):
    __tablename__ = "users"  # "user" is a reserved word in Postgres

    email: str = Field(unique=True, index=True, nullable=False)
    hashed_password: str | None = Field(default=None)  # None for OAuth users
    name: str = Field(nullable=False)
    avatar_url: str | None = Field(default=None, nullable=True)
    auth_provider: str = Field(default="password", nullable=False)  # password|google|discord|clerk
    clerk_id: str | None = Field(
        default=None, unique=True, index=True, nullable=True
    )  # Clerk user id
    is_active: bool = Field(default=True, nullable=False)
