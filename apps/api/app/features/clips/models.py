"""Clips job: one long-form source video -> N short-form clips (CLIPS-PLAN.md)."""

import uuid

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
    error: str | None = Field(default=None)
    duration: float | None = Field(default=None)  # source length (s)
    transcript: list | None = Field(default=None, sa_column=Column(JSON))  # [{text,start,end}]
    # [{id, title, score, reason, start, end, duration, key}]
    clips: list = Field(default_factory=list, sa_column=Column(JSON))
