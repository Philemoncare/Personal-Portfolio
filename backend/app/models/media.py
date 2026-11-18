import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class MediaAsset(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """An uploaded image managed from the admin media library."""

    __tablename__ = "media_assets"
    __table_args__ = (
        Index("ix_media_assets_checksum", "checksum"),
        Index("ix_media_assets_attached", "attached_to_type", "attached_to_id"),
        Index("ix_media_assets_kind", "kind"),
    )

    filename: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    url: Mapped[str] = mapped_column(String(1000), nullable=False)
    alt_text: Mapped[str] = mapped_column(String(300), nullable=False)
    caption: Mapped[str | None] = mapped_column(String(400), nullable=True)
    mime_type: Mapped[str] = mapped_column(String(80), nullable=False)
    extension: Mapped[str] = mapped_column(String(10), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    width: Mapped[int] = mapped_column(Integer, nullable=False)
    height: Mapped[int] = mapped_column(Integer, nullable=False)
    kind: Mapped[str] = mapped_column(
        String(20), default="image", server_default="image", nullable=False
    )
    folder: Mapped[str] = mapped_column(
        String(40), default="misc", server_default="misc", nullable=False, index=True
    )
    checksum: Mapped[str] = mapped_column(String(64), nullable=False)
    attached_to_type: Mapped[str | None] = mapped_column(String(40), nullable=True)
    attached_to_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), nullable=True
    )
    uploaded_by_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("admin_users.id", ondelete="SET NULL"),
        nullable=True,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class ArkeselWebhookEvent(UUIDPrimaryKeyMixin, Base):
    """Replay protection for provider callbacks."""

    __tablename__ = "arkesel_webhook_events"
    __table_args__ = (
        Index("ix_arkesel_webhook_events_webhook_id", "webhook_id", unique=True),
        Index("ix_arkesel_webhook_events_received_at", "received_at"),
    )

    webhook_id: Mapped[str] = mapped_column(String(160), nullable=False)
    event_type: Mapped[str | None] = mapped_column(String(80), nullable=True)
    payload_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    processed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
