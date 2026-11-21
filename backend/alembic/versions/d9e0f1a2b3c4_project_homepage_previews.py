"""Verified deployed-homepage preview fields for projects.

Revision ID: d9e0f1a2b3c4
Revises: c8d9e0f1a2b3
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d9e0f1a2b3c4"
down_revision: str | None = "c8d9e0f1a2b3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("projects") as batch:
        batch.add_column(sa.Column("preview_image", sa.String(length=1000), nullable=True))
        batch.add_column(
            sa.Column(
                "preview_status",
                sa.String(length=30),
                server_default="not_discovered",
                nullable=False,
            )
        )
        batch.add_column(sa.Column("preview_source", sa.String(length=60), nullable=True))
        batch.add_column(
            sa.Column("preview_source_url", sa.String(length=500), nullable=True)
        )
        batch.add_column(
            sa.Column("preview_checked_at", sa.DateTime(timezone=True), nullable=True)
        )
        batch.add_column(sa.Column("preview_error", sa.Text(), nullable=True))
    op.create_index("ix_projects_preview_status", "projects", ["preview_status"])


def downgrade() -> None:
    op.drop_index("ix_projects_preview_status", table_name="projects")
    with op.batch_alter_table("projects") as batch:
        batch.drop_column("preview_error")
        batch.drop_column("preview_checked_at")
        batch.drop_column("preview_source_url")
        batch.drop_column("preview_source")
        batch.drop_column("preview_status")
        batch.drop_column("preview_image")
