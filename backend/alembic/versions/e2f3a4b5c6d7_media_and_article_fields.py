"""Media uploads for timeline, experience, leadership, case studies and
article taxonomy/SEO fields.

Revision ID: e2f3a4b5c6d7
Revises: d9e0f1a2b3c4
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "e2f3a4b5c6d7"
down_revision: str | None = "d9e0f1a2b3c4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("experience_entries") as batch:
        batch.add_column(sa.Column("logo_url", sa.String(length=1000), nullable=True))

    with op.batch_alter_table("leadership_entries") as batch:
        batch.add_column(sa.Column("image_url", sa.String(length=1000), nullable=True))

    with op.batch_alter_table("timeline_entries") as batch:
        batch.add_column(sa.Column("image_url", sa.String(length=1000), nullable=True))

    with op.batch_alter_table("case_studies") as batch:
        batch.add_column(
            sa.Column("cover_image_url", sa.String(length=1000), nullable=True)
        )

    with op.batch_alter_table("articles") as batch:
        batch.add_column(sa.Column("category", sa.String(length=80), nullable=True))
        batch.add_column(sa.Column("tags", sa.JSON(), nullable=True))
        batch.add_column(
            sa.Column(
                "featured",
                sa.Boolean(),
                server_default="false",
                nullable=False,
            )
        )
        batch.add_column(sa.Column("seo_title", sa.String(length=200), nullable=True))
        batch.add_column(sa.Column("seo_description", sa.Text(), nullable=True))

    op.create_index("ix_articles_category", "articles", ["category"])
    op.create_index("ix_articles_featured", "articles", ["featured"])


def downgrade() -> None:
    op.drop_index("ix_articles_featured", table_name="articles")
    op.drop_index("ix_articles_category", table_name="articles")
    with op.batch_alter_table("articles") as batch:
        batch.drop_column("seo_description")
        batch.drop_column("seo_title")
        batch.drop_column("featured")
        batch.drop_column("tags")
        batch.drop_column("category")

    with op.batch_alter_table("case_studies") as batch:
        batch.drop_column("cover_image_url")

    with op.batch_alter_table("timeline_entries") as batch:
        batch.drop_column("image_url")

    with op.batch_alter_table("leadership_entries") as batch:
        batch.drop_column("image_url")

    with op.batch_alter_table("experience_entries") as batch:
        batch.drop_column("logo_url")
