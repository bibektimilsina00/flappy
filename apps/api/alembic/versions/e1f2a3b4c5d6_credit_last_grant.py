"""credit.last_grant_at — monthly free-plan refill bookkeeping

Revision ID: e1f2a3b4c5d6
Revises: d0e1f2a3b4c5
Create Date: 2026-07-31
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "e1f2a3b4c5d6"
down_revision: str | None = "d0e1f2a3b4c5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("credit", sa.Column("last_grant_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("credit", "last_grant_at")
