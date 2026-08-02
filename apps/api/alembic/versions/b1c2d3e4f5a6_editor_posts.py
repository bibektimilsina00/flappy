"""editor posts: nullable job_id/clip_id + render_key on scheduled_post

Revision ID: b1c2d3e4f5a6
Revises: a3b4c5d6e7f9
Create Date: 2026-08-02

"""

import sqlalchemy as sa
import sqlmodel
from alembic import op

revision = "b1c2d3e4f5a6"
down_revision = "a3b4c5d6e7f9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "scheduled_post",
        sa.Column("render_key", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )
    op.alter_column("scheduled_post", "job_id", existing_type=sa.Uuid(), nullable=True)
    op.alter_column(
        "scheduled_post",
        "clip_id",
        existing_type=sqlmodel.sql.sqltypes.AutoString(),
        nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "scheduled_post",
        "clip_id",
        existing_type=sqlmodel.sql.sqltypes.AutoString(),
        nullable=False,
    )
    op.alter_column("scheduled_post", "job_id", existing_type=sa.Uuid(), nullable=False)
    op.drop_column("scheduled_post", "render_key")
