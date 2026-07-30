"""social accounts + publish columns on scheduled_post

Revision ID: d0e1f2a3b4c5
Revises: c9d0e1f2a3b4
Create Date: 2026-07-30 12:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from alembic import op

revision: str = "d0e1f2a3b4c5"
down_revision: str | None = "c9d0e1f2a3b4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "social_account",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("workspace_id", sa.Uuid(), nullable=False),
        sa.Column("platform", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("external_id", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("username", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("avatar_url", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("access_token", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("refresh_token", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("token_expires_at", sa.DateTime(), nullable=True),
        sa.Column("meta", sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_social_account_workspace_id"), "social_account", ["workspace_id"], unique=False
    )
    op.create_index(
        op.f("ix_social_account_platform"), "social_account", ["platform"], unique=False
    )

    op.add_column("scheduled_post", sa.Column("social_account_id", sa.Uuid(), nullable=True))
    op.add_column(
        "scheduled_post", sa.Column("platform", sqlmodel.sql.sqltypes.AutoString(), nullable=True)
    )
    op.add_column(
        "scheduled_post", sa.Column("caption", sqlmodel.sql.sqltypes.AutoString(), nullable=True)
    )
    op.add_column(
        "scheduled_post", sa.Column("result_url", sqlmodel.sql.sqltypes.AutoString(), nullable=True)
    )
    op.add_column(
        "scheduled_post", sa.Column("error", sqlmodel.sql.sqltypes.AutoString(), nullable=True)
    )
    op.create_index(
        op.f("ix_scheduled_post_social_account_id"),
        "scheduled_post",
        ["social_account_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_scheduled_post_social_account_id"), table_name="scheduled_post")
    for col in ("error", "result_url", "caption", "platform", "social_account_id"):
        op.drop_column("scheduled_post", col)
    op.drop_index(op.f("ix_social_account_platform"), table_name="social_account")
    op.drop_index(op.f("ix_social_account_workspace_id"), table_name="social_account")
    op.drop_table("social_account")
