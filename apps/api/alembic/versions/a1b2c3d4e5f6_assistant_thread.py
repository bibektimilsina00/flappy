"""assistant thread

Revision ID: a1b2c3d4e5f6
Revises: 32ffe0b9b9ae
Create Date: 2026-07-22 00:00:00.000000
"""
from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: str | None = "32ffe0b9b9ae"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "assistant_thread",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("workspace_id", sa.Uuid(), nullable=False),
        sa.Column("workflow_id", sa.Uuid(), nullable=True),
        sa.Column("title", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("messages", sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_assistant_thread_workspace_id"), "assistant_thread", ["workspace_id"], unique=False)
    op.create_index(op.f("ix_assistant_thread_workflow_id"), "assistant_thread", ["workflow_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_assistant_thread_workflow_id"), table_name="assistant_thread")
    op.drop_index(op.f("ix_assistant_thread_workspace_id"), table_name="assistant_thread")
    op.drop_table("assistant_thread")
