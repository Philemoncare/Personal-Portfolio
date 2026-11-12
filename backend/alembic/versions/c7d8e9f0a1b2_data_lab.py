"""data lab: data projects, tools, categories, visualizations, insights, resources

Revision ID: c7d8e9f0a1b2
Revises: b3c4d5e6f7a8
Create Date: 2026-11-11 23:10:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c7d8e9f0a1b2"
down_revision: str | None = "b3c4d5e6f7a8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "data_project_categories",
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_data_project_categories")),
        sa.UniqueConstraint("slug", name=op.f("uq_data_project_categories_slug")),
    )
    op.create_table(
        "data_tools",
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column("kind", sa.String(length=40), server_default="tool", nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_data_tools")),
        sa.UniqueConstraint("name", name=op.f("uq_data_tools_name")),
        sa.UniqueConstraint("slug", name=op.f("uq_data_tools_slug")),
    )
    op.create_table(
        "data_projects",
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("slug", sa.String(length=200), nullable=False),
        sa.Column("short_description", sa.Text(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("keywords", sa.String(length=500), nullable=True),
        sa.Column("category_id", sa.Uuid(), nullable=False),
        sa.Column(
            "project_type",
            sa.String(length=40),
            server_default="eda",
            nullable=False,
        ),
        sa.Column("status", sa.String(length=20), server_default="draft", nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("year", sa.Integer(), nullable=True),
        sa.Column("featured", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("is_placeholder", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("is_demo", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("cover_image", sa.String(length=1000), nullable=True),
        sa.Column("question", sa.Text(), nullable=True),
        sa.Column("why_it_matters", sa.Text(), nullable=True),
        sa.Column("dataset_name", sa.String(length=300), nullable=True),
        sa.Column("dataset_source", sa.String(length=500), nullable=True),
        sa.Column("dataset_description", sa.Text(), nullable=True),
        sa.Column("dataset_rows", sa.Integer(), nullable=True),
        sa.Column("dataset_columns", sa.Integer(), nullable=True),
        sa.Column("dataset_time_period", sa.String(length=200), nullable=True),
        sa.Column("dataset_type", sa.String(length=80), nullable=True),
        sa.Column("dataset_license", sa.String(length=300), nullable=True),
        sa.Column(
            "dataset_is_public", sa.Boolean(), server_default="true", nullable=False
        ),
        sa.Column("dataset_note", sa.Text(), nullable=True),
        sa.Column("data_preparation", sa.Text(), nullable=True),
        sa.Column("methodology", sa.Text(), nullable=True),
        sa.Column("analysis", sa.Text(), nullable=True),
        sa.Column("sql_query", sa.Text(), nullable=True),
        sa.Column("sql_result", sa.JSON(), nullable=True),
        sa.Column("python_snippet", sa.Text(), nullable=True),
        sa.Column("what_the_data_shows", sa.Text(), nullable=True),
        sa.Column("why_the_findings_matter", sa.Text(), nullable=True),
        sa.Column("what_i_would_do_next", sa.Text(), nullable=True),
        sa.Column("key_findings", sa.Text(), nullable=True),
        sa.Column("recommendations", sa.Text(), nullable=True),
        sa.Column("limitations", sa.Text(), nullable=True),
        sa.Column("conclusion", sa.Text(), nullable=True),
        sa.Column("github_url", sa.String(length=500), nullable=True),
        sa.Column("notebook_url", sa.String(length=500), nullable=True),
        sa.Column("dashboard_url", sa.String(length=500), nullable=True),
        sa.Column("seo_title", sa.String(length=200), nullable=True),
        sa.Column("seo_description", sa.String(length=400), nullable=True),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('draft', 'published', 'archived', 'experiment')",
            name=op.f("ck_data_projects_status_valid"),
        ),
        sa.CheckConstraint(
            "project_type IN ('eda', 'sql', 'excel', 'dashboard', 'bi', "
            "'statistical', 'cleaning', 'research', 'visualization')",
            name=op.f("ck_data_projects_project_type_valid"),
        ),
        sa.CheckConstraint(
            "dataset_rows IS NULL OR dataset_rows >= 0",
            name=op.f("ck_data_projects_dataset_rows_non_negative"),
        ),
        sa.CheckConstraint(
            "dataset_columns IS NULL OR dataset_columns >= 0",
            name=op.f("ck_data_projects_dataset_columns_non_negative"),
        ),
        sa.ForeignKeyConstraint(
            ["category_id"],
            ["data_project_categories.id"],
            name=op.f("fk_data_projects_category_id_data_project_categories"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_data_projects")),
        sa.UniqueConstraint("slug", name=op.f("uq_data_projects_slug")),
    )
    op.create_index(
        op.f("ix_data_projects_category_id"), "data_projects", ["category_id"]
    )
    op.create_index(
        op.f("ix_data_projects_project_type"), "data_projects", ["project_type"]
    )
    op.create_index(op.f("ix_data_projects_status"), "data_projects", ["status"])
    op.create_index(op.f("ix_data_projects_featured"), "data_projects", ["featured"])

    op.create_table(
        "data_project_tools",
        sa.Column("data_project_id", sa.Uuid(), nullable=False),
        sa.Column("data_tool_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(
            ["data_project_id"],
            ["data_projects.id"],
            name=op.f("fk_data_project_tools_data_project_id_data_projects"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["data_tool_id"],
            ["data_tools.id"],
            name=op.f("fk_data_project_tools_data_tool_id_data_tools"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint(
            "data_project_id",
            "data_tool_id",
            name=op.f("pk_data_project_tools"),
        ),
    )
    op.create_index(
        "ix_data_project_tools_tool_id", "data_project_tools", ["data_tool_id"]
    )

    op.create_table(
        "data_visualizations",
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("chart_type", sa.String(length=20), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("data", sa.JSON(), nullable=True),
        sa.Column("x_axis", sa.String(length=100), nullable=True),
        sa.Column("y_axis", sa.String(length=100), nullable=True),
        sa.Column("series", sa.JSON(), nullable=True),
        sa.Column("display_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("source_note", sa.String(length=300), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "chart_type IN ('bar', 'line', 'area', 'pie', 'donut', 'scatter', "
            "'histogram', 'heatmap', 'table', 'kpi')",
            name=op.f("ck_data_visualizations_chart_type_valid"),
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["data_projects.id"],
            name=op.f("fk_data_visualizations_project_id_data_projects"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_data_visualizations")),
    )
    op.create_index(
        op.f("ix_data_visualizations_project_id"),
        "data_visualizations",
        ["project_id"],
    )

    op.create_table(
        "data_insights",
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=True),
        sa.Column("key_insight", sa.Text(), nullable=False),
        sa.Column("possible_explanation", sa.Text(), nullable=True),
        sa.Column("recommendation", sa.Text(), nullable=True),
        sa.Column("display_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["data_projects.id"],
            name=op.f("fk_data_insights_project_id_data_projects"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_data_insights")),
    )
    op.create_index(op.f("ix_data_insights_project_id"), "data_insights", ["project_id"])

    op.create_table(
        "data_resources",
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column(
            "resource_type", sa.String(length=30), server_default="external", nullable=False
        ),
        sa.Column("url", sa.String(length=1000), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("display_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "resource_type IN ('dataset', 'notebook', 'sql', 'excel', 'pdf', "
            "'dashboard', 'github', 'external')",
            name=op.f("ck_data_resources_resource_type_valid"),
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["data_projects.id"],
            name=op.f("fk_data_resources_project_id_data_projects"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_data_resources")),
    )
    op.create_index(op.f("ix_data_resources_project_id"), "data_resources", ["project_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_data_resources_project_id"), table_name="data_resources")
    op.drop_table("data_resources")
    op.drop_index(op.f("ix_data_insights_project_id"), table_name="data_insights")
    op.drop_table("data_insights")
    op.drop_index(
        op.f("ix_data_visualizations_project_id"), table_name="data_visualizations"
    )
    op.drop_table("data_visualizations")
    op.drop_index("ix_data_project_tools_tool_id", table_name="data_project_tools")
    op.drop_table("data_project_tools")
    op.drop_index(op.f("ix_data_projects_featured"), table_name="data_projects")
    op.drop_index(op.f("ix_data_projects_status"), table_name="data_projects")
    op.drop_index(op.f("ix_data_projects_project_type"), table_name="data_projects")
    op.drop_index(op.f("ix_data_projects_category_id"), table_name="data_projects")
    op.drop_table("data_projects")
    op.drop_table("data_tools")
    op.drop_table("data_project_categories")
