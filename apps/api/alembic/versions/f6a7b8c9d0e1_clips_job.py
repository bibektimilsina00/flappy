"""clips job

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-07-29 12:00:00.000000
"""
from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from alembic import op

revision: str = "f6a7b8c9d0e1"
down_revision: str | None = "e5f6a7b8c9d0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "clips_job",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("workspace_id", sa.Uuid(), nullable=False),
        sa.Column("source_url", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("source_key", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("source_title", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("params", sa.JSON(), nullable=True),
        sa.Column("status", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("phase", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("progress", sa.Float(), nullable=False),
        sa.Column("error", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("duration", sa.Float(), nullable=True),
        sa.Column("transcript", sa.JSON(), nullable=True),
        sa.Column("clips", sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_clips_job_workspace_id"), "clips_job", ["workspace_id"], unique=False)
    op.create_index(op.f("ix_clips_job_status"), "clips_job", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_clips_job_status"), table_name="clips_job")
    op.drop_index(op.f("ix_clips_job_workspace_id"), table_name="clips_job")
    op.drop_table("clips_job")
