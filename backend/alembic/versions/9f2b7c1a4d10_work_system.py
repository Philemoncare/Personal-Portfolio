"""work system: project metadata, secondary categories, case study sections

Revision ID: 9f2b7c1a4d10
Revises: 124afe045fe3
Create Date: 2026-11-11 20:30:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "9f2b7c1a4d10"
down_revision: str | None = "124afe045fe3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("projects") as batch_op:
        batch_op.add_column(
            sa.Column(
                "project_status",
                sa.String(length=20),
                server_default="in_progress",
                nullable=False,
            )
        )
        batch_op.add_column(sa.Column("year", sa.Integer(), nullable=True))
        batch_op.add_column(
            sa.Column("documentation_url", sa.String(length=500), nullable=True)
        )
        batch_op.add_column(
            sa.Column("cover_image", sa.String(length=1000), nullable=True)
        )
        batch_op.create_check_constraint(
            "project_status_valid",
            "project_status IN ('in_progress', 'active', 'completed', 'archived', 'experiment')",
        )

    op.create_index(
        op.f("ix_projects_project_status"),
        "projects",
        ["project_status"],
        unique=False,
    )

    op.create_table(
        "project_secondary_categories",
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("category_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            name=op.f("fk_project_secondary_categories_project_id_projects"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["category_id"],
            ["project_categories.id"],
            name=op.f("fk_project_secondary_categories_category_id_project_categories"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint(
            "project_id",
            "category_id",
            name=op.f("pk_project_secondary_categories"),
        ),
    )
    op.create_index(
        op.f("ix_project_secondary_categories_category_id"),
        "project_secondary_categories",
        ["category_id"],
        unique=False,
    )

    with op.batch_alter_table("case_studies") as batch_op:
        batch_op.add_column(sa.Column("context", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("goals", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("planning", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("design", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("testing", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("result_type", sa.String(length=40), nullable=True))
        batch_op.add_column(sa.Column("hidden_sections", sa.JSON(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("case_studies") as batch_op:
        batch_op.drop_column("hidden_sections")
        batch_op.drop_column("result_type")
        batch_op.drop_column("testing")
        batch_op.drop_column("design")
        batch_op.drop_column("planning")
        batch_op.drop_column("goals")
        batch_op.drop_column("context")

    op.drop_index(
        op.f("ix_project_secondary_categories_category_id"),
        table_name="project_secondary_categories",
    )
    op.drop_table("project_secondary_categories")

    op.drop_index(op.f("ix_projects_project_status"), table_name="projects")

    with op.batch_alter_table("projects") as batch_op:
        batch_op.drop_constraint("ck_projects_project_status_valid", type_="check")
        batch_op.drop_column("cover_image")
        batch_op.drop_column("documentation_url")
        batch_op.drop_column("year")
        batch_op.drop_column("project_status")
