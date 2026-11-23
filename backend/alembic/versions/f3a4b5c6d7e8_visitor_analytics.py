"""Visitor analytics and traffic tracking table.

Revision ID: f3a4b5c6d7e8
Revises: e2f3a4b5c6d7
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "f3a4b5c6d7e8"
down_revision: str | None = "e2f3a4b5c6d7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "analytics_visits",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("visitor_id", sa.String(length=64), nullable=False),
        sa.Column("session_id", sa.String(length=64), nullable=False),
        sa.Column("path", sa.String(length=255), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column("referrer", sa.Text(), nullable=True),
        sa.Column("referrer_source", sa.String(length=50), nullable=False, server_default="Direct"),
        sa.Column("device_type", sa.String(length=20), nullable=False, server_default="Desktop"),
        sa.Column("browser", sa.String(length=50), nullable=False, server_default="Unknown"),
        sa.Column("os", sa.String(length=50), nullable=False, server_default="Unknown"),
        sa.Column("country", sa.String(length=100), nullable=False, server_default="Unknown"),
        sa.Column("country_code", sa.String(length=10), nullable=True),
        sa.Column("user_agent_hash", sa.String(length=64), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_analytics_visits_visitor_id", "analytics_visits", ["visitor_id"])
    op.create_index("ix_analytics_visits_session_id", "analytics_visits", ["session_id"])
    op.create_index("ix_analytics_visits_path", "analytics_visits", ["path"])
    op.create_index("ix_analytics_visits_referrer_source", "analytics_visits", ["referrer_source"])
    op.create_index("ix_analytics_visits_device_type", "analytics_visits", ["device_type"])
    op.create_index("ix_analytics_visits_country", "analytics_visits", ["country"])
    op.create_index("ix_analytics_visits_timestamp", "analytics_visits", ["timestamp"])
    op.create_index("idx_analytics_ts_visitor", "analytics_visits", ["timestamp", "visitor_id"])
    op.create_index("idx_analytics_ts_path", "analytics_visits", ["timestamp", "path"])
    op.create_index("idx_analytics_ts_session", "analytics_visits", ["timestamp", "session_id"])


def downgrade() -> None:
    op.drop_index("idx_analytics_ts_session", table_name="analytics_visits")
    op.drop_index("idx_analytics_ts_path", table_name="analytics_visits")
    op.drop_index("idx_analytics_ts_visitor", table_name="analytics_visits")
    op.drop_index("ix_analytics_visits_timestamp", table_name="analytics_visits")
    op.drop_index("ix_analytics_visits_country", table_name="analytics_visits")
    op.drop_index("ix_analytics_visits_device_type", table_name="analytics_visits")
    op.drop_index("ix_analytics_visits_referrer_source", table_name="analytics_visits")
    op.drop_index("ix_analytics_visits_path", table_name="analytics_visits")
    op.drop_index("ix_analytics_visits_session_id", table_name="analytics_visits")
    op.drop_index("ix_analytics_visits_visitor_id", table_name="analytics_visits")
    op.drop_table("analytics_visits")
