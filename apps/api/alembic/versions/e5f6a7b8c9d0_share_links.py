"""share links + review comments

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-07-29 11:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from alembic import op

revision: str = "e5f6a7b8c9d0"
down_revision: str | None = "d4e5f6a7b8c9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "video_editor_project",
        sa.Column("share_review_token", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )
    op.add_column(
        "video_editor_project",
        sa.Column("share_present_token", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )
    op.add_column(
        "video_editor_project",
        sa.Column("last_render_key", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )
    op.create_index(
        op.f("ix_video_editor_project_share_review_token"),
        "video_editor_project",
        ["share_review_token"],
        unique=False,
    )
    op.create_index(
        op.f("ix_video_editor_project_share_present_token"),
        "video_editor_project",
        ["share_present_token"],
        unique=False,
    )
    op.create_table(
        "video_editor_comment",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("author", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("text", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("at", sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_video_editor_comment_project_id"),
        "video_editor_comment",
        ["project_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_video_editor_comment_project_id"), table_name="video_editor_comment")
    op.drop_table("video_editor_comment")
    op.drop_index(
        op.f("ix_video_editor_project_share_present_token"), table_name="video_editor_project"
    )
    op.drop_index(
        op.f("ix_video_editor_project_share_review_token"), table_name="video_editor_project"
    )
    op.drop_column("video_editor_project", "last_render_key")
    op.drop_column("video_editor_project", "share_present_token")
    op.drop_column("video_editor_project", "share_review_token")
