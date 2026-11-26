"""Consolidate the duplicate index on page contents.

Revision ID: g4b5c6d7e8f9
Revises: f3a4b5c6d7e8
Create Date: 2026-11-26 00:00:00

``page_contents.page_key`` already has a unique constraint, which indexes the
column. The separate non-unique index added with the publishing platform was
therefore redundant. Dropping it keeps the migrated schema exactly in line
with the ORM metadata, so ``alembic check`` stays clean for future changes.
"""

from alembic import op

revision = "g4b5c6d7e8f9"
down_revision = "f3a4b5c6d7e8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_index("ix_page_contents_page_key", table_name="page_contents")


def downgrade() -> None:
    op.create_index("ix_page_contents_page_key", "page_contents", ["page_key"])
