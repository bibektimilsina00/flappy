"""Clips job: one long-form source video -> N short-form clips (CLIPS-PLAN.md)."""

import uuid
from datetime import datetime

from sqlmodel import JSON, Column, Field

from apps.api.app.core.models import TimestampMixin


class ClipsJob(TimestampMixin, table=True):
    """One repurposing run. Clips are immutable artifacts + small metadata, so
    they live as JSON on the job row rather than their own table."""

    __tablename__ = "clips_job"

    workspace_id: uuid.UUID = Field(index=True, nullable=False)
    source_url: str | None = Field(default=None)
    source_key: str | None = Field(default=None)  # uploaded file in storage
    source_title: str | None = Field(default=None)
    # {count: int|"auto", duration: "auto"|"short"|"medium"|"long",
    #  ratio: "9:16"|"1:1"|"16:9", focus: str}
    params: dict = Field(default_factory=dict, sa_column=Column(JSON))
    status: str = Field(default="queued", index=True)  # queued|running|completed|failed
    phase: str = Field(default="ingest")  # ingest|transcribe|select|render
    progress: float = Field(default=0.0)  # 0..1 within the current phase
    source_thumb_key: str | None = Field(default=None)  # poster frame in storage
    phase_started_at: datetime | None = Field(default=None)  # for live ETAs
    error: str | None = Field(default=None)
    duration: float | None = Field(default=None)  # source length (s)
    transcript: list | None = Field(default=None, sa_column=Column(JSON))  # [{text,start,end}]
    # [{id, title, score, reason, start, end, duration, key}]
    clips: list = Field(default_factory=list, sa_column=Column(JSON))


class ScheduledPost(TimestampMixin, table=True):
    """One clip queued for posting at a specific time (auto-schedule)."""

    __tablename__ = "scheduled_post"

    workspace_id: uuid.UUID = Field(index=True, nullable=False)
    job_id: uuid.UUID = Field(index=True, nullable=False)
    clip_id: str = Field(nullable=False)
    title: str | None = Field(default=None)
    post_at: datetime = Field(index=True, nullable=False)  # UTC
    status: str = Field(default="scheduled", index=True)  # scheduled|due|canceled
