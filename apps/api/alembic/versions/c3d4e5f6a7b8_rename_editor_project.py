"""rename editor_project to video_editor_project

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-07-22 02:00:00.000000
"""

from collections.abc import Sequence

from alembic import op

revision: str = "c3d4e5f6a7b8"
down_revision: str | None = "b2c3d4e5f6a7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.rename_table("editor_project", "video_editor_project")


def downgrade() -> None:
    op.rename_table("video_editor_project", "editor_project")
