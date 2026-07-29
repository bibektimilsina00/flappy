"""clips job progress metadata

Revision ID: a7b8c9d0e1f2
Revises: f6a7b8c9d0e1
Create Date: 2026-07-29 18:00:00.000000
"""
from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from alembic import op

revision: str = "a7b8c9d0e1f2"
down_revision: str | None = "f6a7b8c9d0e1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("clips_job", sa.Column("source_thumb_key", sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column("clips_job", sa.Column("phase_started_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("clips_job", "phase_started_at")
    op.drop_column("clips_job", "source_thumb_key")
