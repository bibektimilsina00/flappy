"""Connected social accounts for direct publishing (CLIPS-PLAN.md M5)."""

import uuid
from datetime import datetime

from sqlmodel import JSON, Column, Field

from apps.api.app.core.models import TimestampMixin


class SocialAccount(TimestampMixin, table=True):
    """One connected channel/profile/page.
    ponytail: tokens stored plaintext — encrypt at rest before multi-tenant scale."""

    __tablename__ = "social_account"

    workspace_id: uuid.UUID = Field(index=True, nullable=False)
    platform: str = Field(index=True, nullable=False)  # youtube|tiktok|instagram|facebook
    external_id: str = Field(nullable=False)  # channel / open_id / ig-user / page id
    username: str | None = Field(default=None)
    avatar_url: str | None = Field(default=None)
    access_token: str = Field(nullable=False)
    refresh_token: str | None = Field(default=None)
    token_expires_at: datetime | None = Field(default=None)  # naive UTC like everything here
    meta: dict = Field(default_factory=dict, sa_column=Column(JSON))  # page_id, ig_user_id, …
