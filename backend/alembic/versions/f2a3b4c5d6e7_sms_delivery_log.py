"""SMS delivery log and activity status index.

Revision ID: f2a3b4c5d6e7
Revises: e1f2a3b4c5d6
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "f2a3b4c5d6e7"
down_revision: str | None = "e1f2a3b4c5d6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "sms_logs",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("user_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("otp_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("purpose", sa.String(length=40), nullable=False),
        sa.Column("recipient_phone", sa.String(length=20), nullable=False),
        sa.Column("sender_id", sa.String(length=40), nullable=True),
        sa.Column(
            "message_type",
            sa.String(length=30),
            server_default="otp",
            nullable=False,
        ),
        sa.Column(
            "provider",
            sa.String(length=30),
            server_default="arkesel",
            nullable=False,
        ),
        sa.Column("provider_message_id", sa.String(length=160), nullable=True),
        sa.Column(
            "status",
            sa.String(length=20),
            server_default="QUEUED",
            nullable=False,
        ),
        sa.Column("failure_reason", sa.String(length=200), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
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
            "status IN ('QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'EXPIRED', 'CANCELLED')",
            name="sms_status_valid",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["admin_users.id"],
            name="fk_sms_logs_user_id_admin_users",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["otp_id"],
            ["otp_verifications.id"],
            name="fk_sms_logs_otp_id_otp_verifications",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_sms_logs"),
    )
    op.create_index("ix_sms_logs_user_id", "sms_logs", ["user_id"])
    op.create_index("ix_sms_logs_status", "sms_logs", ["status"])
    op.create_index("ix_sms_logs_purpose", "sms_logs", ["purpose"])
    op.create_index("ix_sms_logs_created_at", "sms_logs", ["created_at"])
    op.create_index(
        "ix_sms_logs_provider_message_id", "sms_logs", ["provider_message_id"]
    )

    op.create_index("ix_activity_logs_status", "activity_logs", ["status"])


def downgrade() -> None:
    op.drop_index("ix_activity_logs_status", table_name="activity_logs")

    op.drop_index("ix_sms_logs_provider_message_id", table_name="sms_logs")
    op.drop_index("ix_sms_logs_created_at", table_name="sms_logs")
    op.drop_index("ix_sms_logs_purpose", table_name="sms_logs")
    op.drop_index("ix_sms_logs_status", table_name="sms_logs")
    op.drop_index("ix_sms_logs_user_id", table_name="sms_logs")
    op.drop_table("sms_logs")
