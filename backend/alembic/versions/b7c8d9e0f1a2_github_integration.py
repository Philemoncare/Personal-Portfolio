"""GitHub integration: OAuth connections, imports, and repository linkage.

Revision ID: b7c8d9e0f1a2
Revises: a1b2c3d4e5f6
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "b7c8d9e0f1a2"
down_revision: str | None = "a1b2c3d4e5f6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


PROJECT_COLUMNS = (
    "github_repository_id",
    "github_owner",
    "github_repository_name",
    "github_default_branch",
    "github_last_synced_at",
    "github_repository_updated_at",
    "github_visibility",
    "github_is_fork",
    "github_is_archived",
    "github_metadata",
    "github_sync_enabled",
)


def upgrade() -> None:
    op.create_table(
        "github_connections",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("user_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("github_account_id", sa.String(40), nullable=False),
        sa.Column("username", sa.String(120), nullable=False),
        sa.Column("display_name", sa.String(160), nullable=True),
        sa.Column("avatar_url", sa.String(1000), nullable=True),
        sa.Column("account_url", sa.String(500), nullable=True),
        sa.Column("encrypted_access_token", sa.Text(), nullable=False),
        sa.Column("encrypted_refresh_token", sa.Text(), nullable=True),
        sa.Column(
            "token_type", sa.String(40), server_default="bearer", nullable=False
        ),
        sa.Column("scopes", sa.String(300), server_default="", nullable=False),
        sa.Column("repository_count", sa.Integer(), nullable=True),
        sa.Column(
            "private_repository_access",
            sa.Boolean(),
            server_default=sa.false(),
            nullable=False,
        ),
        sa.Column("connected_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["admin_users.id"],
            name="fk_github_connections_user_id_admin_users",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_github_connections"),
    )
    op.create_index(
        "ix_github_connections_user_id",
        "github_connections",
        ["user_id"],
        unique=True,
    )
    op.create_index(
        "ix_github_connections_account_id",
        "github_connections",
        ["github_account_id"],
    )

    op.create_table(
        "github_import_logs",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("user_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("project_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("repository_id", sa.String(40), nullable=False),
        sa.Column("repository_full_name", sa.String(300), nullable=False),
        sa.Column("action", sa.String(40), nullable=False),
        sa.Column("status", sa.String(20), server_default="success", nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["admin_users.id"],
            name="fk_github_import_logs_user_id_admin_users",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            name="fk_github_import_logs_project_id_projects",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_github_import_logs"),
        sa.CheckConstraint(
            "status IN ('success', 'failed', 'skipped')",
            name="github_import_status_valid",
        ),
    )
    op.create_index(
        "ix_github_import_logs_repository_id",
        "github_import_logs",
        ["repository_id"],
    )
    op.create_index(
        "ix_github_import_logs_created_at",
        "github_import_logs",
        ["created_at"],
    )

    op.add_column(
        "projects", sa.Column("github_repository_id", sa.String(40), nullable=True)
    )
    op.add_column("projects", sa.Column("github_owner", sa.String(120), nullable=True))
    op.add_column(
        "projects", sa.Column("github_repository_name", sa.String(200), nullable=True)
    )
    op.add_column(
        "projects", sa.Column("github_default_branch", sa.String(200), nullable=True)
    )
    op.add_column(
        "projects",
        sa.Column("github_last_synced_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "projects",
        sa.Column(
            "github_repository_updated_at", sa.DateTime(timezone=True), nullable=True
        ),
    )
    op.add_column(
        "projects", sa.Column("github_visibility", sa.String(20), nullable=True)
    )
    op.add_column(
        "projects",
        sa.Column(
            "github_is_fork", sa.Boolean(), server_default=sa.false(), nullable=False
        ),
    )
    op.add_column(
        "projects",
        sa.Column(
            "github_is_archived",
            sa.Boolean(),
            server_default=sa.false(),
            nullable=False,
        ),
    )
    op.add_column("projects", sa.Column("github_metadata", sa.JSON(), nullable=True))
    op.add_column(
        "projects",
        sa.Column(
            "github_sync_enabled",
            sa.Boolean(),
            server_default=sa.true(),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_projects_github_repository_id",
        "projects",
        ["github_repository_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_projects_github_repository_id", table_name="projects")
    for column in reversed(PROJECT_COLUMNS):
        op.drop_column("projects", column)

    op.drop_index("ix_github_import_logs_created_at", table_name="github_import_logs")
    op.drop_index(
        "ix_github_import_logs_repository_id", table_name="github_import_logs"
    )
    op.drop_table("github_import_logs")

    op.drop_index(
        "ix_github_connections_account_id", table_name="github_connections"
    )
    op.drop_index("ix_github_connections_user_id", table_name="github_connections")
    op.drop_table("github_connections")
