import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Integer,
    String,
    Text,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SiteSettings(Base):
    """Single controlled settings record (id = 1).

    Global site configuration only. Person identity, contact details, and social
    links are authoritative in ``site_profiles``. The legacy identity columns
    below are retained so existing consumers keep working and are populated from
    the profile in the public response.
    """

    __tablename__ = "site_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)

    # --- Global configuration ---------------------------------------------
    site_name: Mapped[str] = mapped_column(
        String(120), default="Phill", server_default="Phill", nullable=False
    )
    site_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    wordmark: Mapped[str] = mapped_column(
        String(80), default="Phill", server_default="Phill", nullable=False
    )
    seo_title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    seo_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    social_image: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    favicon: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    accent: Mapped[str] = mapped_column(
        String(40), default="signal", server_default="signal", nullable=False
    )
    footer_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    copyright_text: Mapped[str | None] = mapped_column(String(300), nullable=True)

    # --- Legacy identity fields (kept in sync from the profile) -----------
    display_name: Mapped[str] = mapped_column(
        String(120), default="Phill", server_default="Phill", nullable=False
    )
    role_title: Mapped[str] = mapped_column(
        String(200),
        default="Full-Stack Developer",
        server_default="Full-Stack Developer",
        nullable=False,
    )
    hero_intro: Mapped[str | None] = mapped_column(Text, nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[str | None] = mapped_column(String(120), nullable=True)
    availability: Mapped[str | None] = mapped_column(String(160), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    website_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    github_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    cv_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    is_placeholder: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false", nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class ContactMessage(Base):
    __tablename__ = "contact_messages"
    __table_args__ = (
        CheckConstraint(
            "status IN ('new', 'read', 'replied', 'archived', 'spam')",
            name="status_valid",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    subject: Mapped[str] = mapped_column(String(160), nullable=False)
    inquiry_type: Mapped[str | None] = mapped_column(String(80), nullable=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), default="new", server_default="new", nullable=False, index=True
    )
    # Honest email-delivery state: not_configured | sent | failed
    email_status: Mapped[str] = mapped_column(
        String(20),
        default="not_configured",
        server_default="not_configured",
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    read_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    replied_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
