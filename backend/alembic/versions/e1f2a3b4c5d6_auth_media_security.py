"""Authentication, OTP, activity log, media library and webhook replay guard.

Revision ID: e1f2a3b4c5d6
Revises: d8e9f0a1b2c3
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "e1f2a3b4c5d6"
down_revision: str | None = "d8e9f0a1b2c3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("admin_users") as batch_op:
        batch_op.add_column(sa.Column("phone", sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column("full_name", sa.String(length=160), nullable=True))
        batch_op.add_column(
            sa.Column(
                "role",
                sa.String(length=20),
                server_default="SUPER_ADMIN",
                nullable=False,
            )
        )
        batch_op.add_column(
            sa.Column(
                "must_change_password",
                sa.Boolean(),
                server_default=sa.text("false"),
                nullable=False,
            )
        )
        batch_op.add_column(
            sa.Column(
                "failed_login_attempts",
                sa.Integer(),
                server_default="0",
                nullable=False,
            )
        )
        batch_op.add_column(
            sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True)
        )
        batch_op.add_column(
            sa.Column("password_changed_at", sa.DateTime(timezone=True), nullable=True)
        )

    op.create_index("ix_admin_users_phone", "admin_users", ["phone"], unique=True)
    with op.batch_alter_table("admin_users") as batch_op:
        batch_op.create_check_constraint(
            "admin_role_valid",
            "role IN ('SUPER_ADMIN', 'EDITOR', 'ANALYST', 'VIEWER')",
        )

    # The previous session table stored the token hash in the primary key. The
    # new shape separates identity from the hash and records client metadata.
    op.drop_table("admin_sessions")

    op.create_table(
        "auth_sessions",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("user_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("user_agent", sa.String(length=400), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.Column(
            "last_used_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["admin_users.id"],
            name="fk_auth_sessions_user_id_admin_users",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_auth_sessions"),
    )
    op.create_index("ix_auth_sessions_user_id", "auth_sessions", ["user_id"])
    op.create_index(
        "ix_auth_sessions_token_hash", "auth_sessions", ["token_hash"], unique=True
    )
    op.create_index("ix_auth_sessions_expires_at", "auth_sessions", ["expires_at"])

    op.create_table(
        "otp_verifications",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("user_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("purpose", sa.String(length=20), nullable=False),
        sa.Column("phone_number", sa.String(length=20), nullable=False),
        sa.Column("code_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("invalidated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("attempts", sa.Integer(), server_default="0", nullable=False),
        sa.Column("max_attempts", sa.Integer(), server_default="5", nullable=False),
        sa.Column("resend_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "last_sent_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.Column("provider_message_id", sa.String(length=160), nullable=True),
        sa.Column("delivery_status", sa.String(length=40), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "purpose IN ('login', 'password_reset')",
            name="otp_purpose_valid",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["admin_users.id"],
            name="fk_otp_verifications_user_id_admin_users",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_otp_verifications"),
    )
    op.create_index(
        "ix_otp_verifications_user_purpose",
        "otp_verifications",
        ["user_id", "purpose"],
    )
    op.create_index("ix_otp_verifications_expires_at", "otp_verifications", ["expires_at"])
    op.create_index("ix_otp_verifications_phone", "otp_verifications", ["phone_number"])

    op.create_table(
        "activity_logs",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("user_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("event", sa.String(length=60), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="success", nullable=False),
        sa.Column("identifier", sa.String(length=255), nullable=True),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("user_agent", sa.String(length=400), nullable=True),
        sa.Column("detail", sa.String(length=500), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["admin_users.id"],
            name="fk_activity_logs_user_id_admin_users",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_activity_logs"),
    )
    op.create_index("ix_activity_logs_user_id", "activity_logs", ["user_id"])
    op.create_index("ix_activity_logs_event", "activity_logs", ["event"])
    op.create_index("ix_activity_logs_created_at", "activity_logs", ["created_at"])

    op.create_table(
        "media_assets",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("url", sa.String(length=1000), nullable=False),
        sa.Column("alt_text", sa.String(length=300), nullable=False),
        sa.Column("caption", sa.String(length=400), nullable=True),
        sa.Column("mime_type", sa.String(length=80), nullable=False),
        sa.Column("extension", sa.String(length=10), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("width", sa.Integer(), nullable=False),
        sa.Column("height", sa.Integer(), nullable=False),
        sa.Column("kind", sa.String(length=20), server_default="image", nullable=False),
        sa.Column("checksum", sa.String(length=64), nullable=False),
        sa.Column("attached_to_type", sa.String(length=40), nullable=True),
        sa.Column("attached_to_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("uploaded_by_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
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
            ["uploaded_by_id"],
            ["admin_users.id"],
            name="fk_media_assets_uploaded_by_id_admin_users",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_media_assets"),
        sa.UniqueConstraint("filename", name="uq_media_assets_filename"),
    )
    op.create_index("ix_media_assets_checksum", "media_assets", ["checksum"])
    op.create_index(
        "ix_media_assets_attached", "media_assets", ["attached_to_type", "attached_to_id"]
    )
    op.create_index("ix_media_assets_kind", "media_assets", ["kind"])

    op.create_table(
        "arkesel_webhook_events",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("webhook_id", sa.String(length=160), nullable=False),
        sa.Column("event_type", sa.String(length=80), nullable=True),
        sa.Column("payload_hash", sa.String(length=64), nullable=False),
        sa.Column(
            "received_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id", name="pk_arkesel_webhook_events"),
    )
    op.create_index(
        "ix_arkesel_webhook_events_webhook_id",
        "arkesel_webhook_events",
        ["webhook_id"],
        unique=True,
    )
    op.create_index(
        "ix_arkesel_webhook_events_received_at", "arkesel_webhook_events", ["received_at"]
    )


def downgrade() -> None:
    op.drop_index("ix_arkesel_webhook_events_received_at", table_name="arkesel_webhook_events")
    op.drop_index("ix_arkesel_webhook_events_webhook_id", table_name="arkesel_webhook_events")
    op.drop_table("arkesel_webhook_events")

    op.drop_index("ix_media_assets_kind", table_name="media_assets")
    op.drop_index("ix_media_assets_attached", table_name="media_assets")
    op.drop_index("ix_media_assets_checksum", table_name="media_assets")
    op.drop_table("media_assets")

    op.drop_index("ix_activity_logs_created_at", table_name="activity_logs")
    op.drop_index("ix_activity_logs_event", table_name="activity_logs")
    op.drop_index("ix_activity_logs_user_id", table_name="activity_logs")
    op.drop_table("activity_logs")

    op.drop_index("ix_otp_verifications_phone", table_name="otp_verifications")
    op.drop_index("ix_otp_verifications_expires_at", table_name="otp_verifications")
    op.drop_index("ix_otp_verifications_user_purpose", table_name="otp_verifications")
    op.drop_table("otp_verifications")

    op.drop_index("ix_auth_sessions_expires_at", table_name="auth_sessions")
    op.drop_index("ix_auth_sessions_token_hash", table_name="auth_sessions")
    op.drop_index("ix_auth_sessions_user_id", table_name="auth_sessions")
    op.drop_table("auth_sessions")

    op.create_table(
        "admin_sessions",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("admin_user_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.Column(
            "last_seen_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["admin_user_id"],
            ["admin_users.id"],
            name="fk_admin_sessions_admin_user_id_admin_users",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_admin_sessions"),
    )
    op.create_index("ix_admin_sessions_admin_user_id", "admin_sessions", ["admin_user_id"])
    op.create_index("ix_admin_sessions_expires_at", "admin_sessions", ["expires_at"])

    with op.batch_alter_table("admin_users") as batch_op:
        batch_op.drop_constraint("admin_role_valid", type_="check")
    op.drop_index("ix_admin_users_phone", table_name="admin_users")
    with op.batch_alter_table("admin_users") as batch_op:
        batch_op.drop_column("password_changed_at")
        batch_op.drop_column("locked_until")
        batch_op.drop_column("failed_login_attempts")
        batch_op.drop_column("must_change_password")
        batch_op.drop_column("role")
        batch_op.drop_column("full_name")
        batch_op.drop_column("phone")
