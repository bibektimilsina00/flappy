import uuid

from sqlmodel import JSON, Column, Field

from apps.api.app.core.models import TimestampMixin


class Workflow(TimestampMixin, table=True):
    __tablename__ = "workflow"

    workspace_id: uuid.UUID = Field(index=True, nullable=False)
    name: str = Field(nullable=False)
    # React Flow graph: {"nodes": [...], "edges": [...]}
    graph: dict = Field(default_factory=dict, sa_column=Column(JSON))
