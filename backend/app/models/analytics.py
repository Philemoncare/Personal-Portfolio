"""Visitor analytics and traffic tracking model."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.time import now_utc
from app.db.base import Base


class AnalyticsVisit(Base):
    """Anonymous, privacy-preserving visitor page view record."""

    __tablename__ = "analytics_visits"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    visitor_id: Mapped[str] = mapped_column(String(64), index=True)
    session_id: Mapped[str] = mapped_column(String(64), index=True)
    path: Mapped[str] = mapped_column(String(255), index=True)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    referrer: Mapped[str | None] = mapped_column(Text, nullable=True)
    referrer_source: Mapped[str] = mapped_column(
        String(50), default="Direct", index=True
    )
    device_type: Mapped[str] = mapped_column(
        String(20), default="Desktop", index=True
    )
    browser: Mapped[str] = mapped_column(String(50), default="Unknown")
    os: Mapped[str] = mapped_column(String(50), default="Unknown")
    country: Mapped[str] = mapped_column(
        String(100), default="Unknown", index=True
    )
    country_code: Mapped[str | None] = mapped_column(String(10), nullable=True)
    user_agent_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now_utc, index=True
    )

    __table_args__ = (
        Index("idx_analytics_ts_visitor", "timestamp", "visitor_id"),
        Index("idx_analytics_ts_path", "timestamp", "path"),
        Index("idx_analytics_ts_session", "timestamp", "session_id"),
    )
