"""editor project

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-07-22 01:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from alembic import op

revision: str = "b2c3d4e5f6a7"
down_revision: str | None = "a1b2c3d4e5f6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "editor_project",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("workspace_id", sa.Uuid(), nullable=False),
        sa.Column("workflow_id", sa.Uuid(), nullable=False),
        sa.Column("title", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("doc", sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_editor_project_workspace_id"), "editor_project", ["workspace_id"], unique=False
    )
    op.create_index(
        op.f("ix_editor_project_workflow_id"), "editor_project", ["workflow_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_editor_project_workflow_id"), table_name="editor_project")
    op.drop_index(op.f("ix_editor_project_workspace_id"), table_name="editor_project")
    op.drop_table("editor_project")
