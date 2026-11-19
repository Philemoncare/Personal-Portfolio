"""Normalise GitHub boolean defaults.

The first GitHub migration created boolean columns with the string server
defaults ``"false"``/``"true"``. SQLite stores those as text, and SQLAlchemy
reads any non-empty text as true, so pre-existing rows could report
``github_is_fork``/``github_is_archived``/``private_repository_access`` as true.

Revision ID: c8d9e0f1a2b3
Revises: b7c8d9e0f1a2
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c8d9e0f1a2b3"
down_revision: str | None = "b7c8d9e0f1a2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _normalise(table: str, column: str) -> None:
    op.execute(
        sa.text(
            f"UPDATE {table} SET {column} = CASE "
            f"WHEN lower(CAST({column} AS TEXT)) IN ('true', 't', '1') "
            f"THEN TRUE ELSE FALSE END"
        )
    )


def upgrade() -> None:
    _normalise("projects", "github_is_fork")
    _normalise("projects", "github_is_archived")
    _normalise("projects", "github_sync_enabled")
    _normalise("github_connections", "private_repository_access")

    with op.batch_alter_table("projects") as batch:
        batch.alter_column(
            "github_is_fork",
            existing_type=sa.Boolean(),
            server_default=sa.false(),
            existing_nullable=False,
        )
        batch.alter_column(
            "github_is_archived",
            existing_type=sa.Boolean(),
            server_default=sa.false(),
            existing_nullable=False,
        )
        batch.alter_column(
            "github_sync_enabled",
            existing_type=sa.Boolean(),
            server_default=sa.true(),
            existing_nullable=False,
        )

    with op.batch_alter_table("github_connections") as batch:
        batch.alter_column(
            "private_repository_access",
            existing_type=sa.Boolean(),
            server_default=sa.false(),
            existing_nullable=False,
        )


def downgrade() -> None:
    # Data normalisation is not reversed; the corrected defaults stay in place.
    pass
