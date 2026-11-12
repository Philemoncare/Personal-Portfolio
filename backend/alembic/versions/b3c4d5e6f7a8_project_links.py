"""project links: download and external URLs

Revision ID: b3c4d5e6f7a8
Revises: 9f2b7c1a4d10
Create Date: 2026-11-11 20:55:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "b3c4d5e6f7a8"
down_revision: str | None = "9f2b7c1a4d10"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("projects") as batch_op:
        batch_op.add_column(
            sa.Column("download_url", sa.String(length=500), nullable=True)
        )
        batch_op.add_column(
            sa.Column("external_url", sa.String(length=500), nullable=True)
        )


def downgrade() -> None:
    with op.batch_alter_table("projects") as batch_op:
        batch_op.drop_column("external_url")
        batch_op.drop_column("download_url")
