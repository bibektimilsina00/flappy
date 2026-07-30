"""clips job -> workflow link

Revision ID: c9d0e1f2a3b4
Revises: b8c9d0e1f2a3
Create Date: 2026-07-29 23:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c9d0e1f2a3b4"
down_revision: str | None = "b8c9d0e1f2a3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("clips_job", sa.Column("workflow_id", sa.Uuid(), nullable=True))
    op.create_index(op.f("ix_clips_job_workflow_id"), "clips_job", ["workflow_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_clips_job_workflow_id"), table_name="clips_job")
    op.drop_column("clips_job", "workflow_id")
