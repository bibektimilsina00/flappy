"""add user clerk_id

Revision ID: e7f8a9b0c1d2
Revises: d3e4f5a6b7c8
Create Date: 2026-08-07

"""

import sqlalchemy as sa
import sqlmodel
from alembic import op

revision = "e7f8a9b0c1d2"
down_revision = "d3e4f5a6b7c8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("clerk_id", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )
    op.create_index("ix_users_clerk_id", "users", ["clerk_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_clerk_id", table_name="users")
    op.drop_column("users", "clerk_id")
