"""Publishing platform: deployment fields, social links, page content.

Revision ID: a1b2c3d4e5f6
Revises: f2a3b4c5d6e7
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: str | None = "f2a3b4c5d6e7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # --- Projects ---------------------------------------------------------
    op.add_column("projects", sa.Column("github_url", sa.String(500), nullable=True))
    op.add_column("projects", sa.Column("demo_url", sa.String(500), nullable=True))
    op.add_column("projects", sa.Column("video_url", sa.String(500), nullable=True))
    op.add_column(
        "projects", sa.Column("external_project_url", sa.String(500), nullable=True)
    )
    op.add_column(
        "projects", sa.Column("deployment_provider", sa.String(80), nullable=True)
    )
    op.add_column(
        "projects",
        sa.Column(
            "deployment_status",
            sa.String(20),
            server_default="not_deployed",
            nullable=False,
        ),
    )
    op.add_column(
        "projects", sa.Column("deployment_url", sa.String(500), nullable=True)
    )
    op.add_column(
        "projects",
        sa.Column(
            "embed_enabled", sa.Boolean(), server_default="false", nullable=False
        ),
    )
    op.add_column(
        "projects",
        sa.Column("last_verified_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "projects",
        sa.Column(
            "public_visibility", sa.Boolean(), server_default="true", nullable=False
        ),
    )
    op.add_column("projects", sa.Column("github_stars", sa.Integer(), nullable=True))
    op.add_column("projects", sa.Column("github_forks", sa.Integer(), nullable=True))
    op.add_column(
        "projects", sa.Column("github_language", sa.String(80), nullable=True)
    )
    op.add_column(
        "projects", sa.Column("github_open_issues", sa.Integer(), nullable=True)
    )
    op.add_column(
        "projects",
        sa.Column("github_metadata_checked_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column("projects", sa.Column("seo_title", sa.String(200), nullable=True))
    op.add_column("projects", sa.Column("seo_description", sa.Text(), nullable=True))
    op.add_column("projects", sa.Column("og_image", sa.String(1000), nullable=True))
    op.create_index(
        "ix_projects_deployment_status", "projects", ["deployment_status"]
    )
    op.create_index(
        "ix_projects_public_visibility", "projects", ["public_visibility"]
    )
    with op.batch_alter_table("projects") as batch:
        batch.create_check_constraint(
            "deployment_status_valid",
            "deployment_status IN ('not_deployed', 'deploying', 'live', 'failed', 'offline')",
        )

    # --- Media folders ----------------------------------------------------
    op.add_column(
        "media_assets",
        sa.Column("folder", sa.String(40), server_default="misc", nullable=False),
    )
    op.create_index("ix_media_assets_folder", "media_assets", ["folder"])

    # --- Contact message spam status -------------------------------------
    with op.batch_alter_table("contact_messages") as batch:
        batch.drop_constraint("status_valid", type_="check")
        batch.create_check_constraint(
            "status_valid",
            "status IN ('new', 'read', 'replied', 'archived', 'spam')",
        )

    # --- Social links -----------------------------------------------------
    op.create_table(
        "social_links",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("platform", sa.String(40), nullable=False),
        sa.Column("label", sa.String(120), nullable=False),
        sa.Column("url", sa.String(500), nullable=False),
        sa.Column("handle", sa.String(120), nullable=True),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("is_visible", sa.Boolean(), server_default="true", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name="pk_social_links"),
    )
    op.create_index("ix_social_links_platform", "social_links", ["platform"])
    op.create_index("ix_social_links_is_visible", "social_links", ["is_visible"])

    # --- Page content and SEO --------------------------------------------
    op.create_table(
        "page_contents",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("page_key", sa.String(60), nullable=False),
        sa.Column("eyebrow", sa.String(120), nullable=True),
        sa.Column("title", sa.String(240), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("intro", sa.Text(), nullable=True),
        sa.Column("hero_image", sa.String(1000), nullable=True),
        sa.Column("seo_title", sa.String(200), nullable=True),
        sa.Column("seo_description", sa.Text(), nullable=True),
        sa.Column("og_image", sa.String(1000), nullable=True),
        sa.Column("canonical_path", sa.String(300), nullable=True),
        sa.Column("is_published", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("content", sa.JSON(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name="pk_page_contents"),
        sa.UniqueConstraint("page_key", name="uq_page_contents_page_key"),
    )
    op.create_index("ix_page_contents_page_key", "page_contents", ["page_key"])
    op.create_index(
        "ix_page_contents_is_published", "page_contents", ["is_published"]
    )


def downgrade() -> None:
    op.drop_index("ix_page_contents_is_published", table_name="page_contents")
    op.drop_index("ix_page_contents_page_key", table_name="page_contents")
    op.drop_table("page_contents")

    op.drop_index("ix_social_links_is_visible", table_name="social_links")
    op.drop_index("ix_social_links_platform", table_name="social_links")
    op.drop_table("social_links")

    with op.batch_alter_table("contact_messages") as batch:
        batch.drop_constraint("status_valid", type_="check")
        batch.create_check_constraint(
            "status_valid",
            "status IN ('new', 'read', 'replied', 'archived')",
        )

    op.drop_index("ix_media_assets_folder", table_name="media_assets")
    op.drop_column("media_assets", "folder")

    with op.batch_alter_table("projects") as batch:
        batch.drop_constraint("deployment_status_valid", type_="check")
    op.drop_index("ix_projects_public_visibility", table_name="projects")
    op.drop_index("ix_projects_deployment_status", table_name="projects")
    for column in (
        "og_image",
        "seo_description",
        "seo_title",
        "github_metadata_checked_at",
        "github_open_issues",
        "github_language",
        "github_forks",
        "github_stars",
        "public_visibility",
        "last_verified_at",
        "embed_enabled",
        "deployment_url",
        "deployment_status",
        "deployment_provider",
        "external_project_url",
        "video_url",
        "demo_url",
        "github_url",
    ):
        op.drop_column("projects", column)
