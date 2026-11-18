"""Identity layer models: the public profile and managed resume versions."""

import uuid

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import (
    PublishableMixin,
    TimestampMixin,
    UUIDPrimaryKeyMixin,
    status_check,
)


class SiteProfile(TimestampMixin, Base):
    """Single controlled profile record (id = 1).

    The profile is the authoritative source for the person's identity, contact
    details, social links, and About narrative. Global site configuration lives
    in ``site_settings``.
    """

    __tablename__ = "site_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)

    name: Mapped[str] = mapped_column(String(160), nullable=False)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    professional_title: Mapped[str | None] = mapped_column(String(200), nullable=True)

    short_bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    long_bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    what_i_build: Mapped[str | None] = mapped_column(Text, nullable=True)
    how_i_work: Mapped[str | None] = mapped_column(Text, nullable=True)
    current_direction: Mapped[str | None] = mapped_column(Text, nullable=True)
    personal_interests: Mapped[str | None] = mapped_column(Text, nullable=True)

    profile_image: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    location: Mapped[str | None] = mapped_column(String(160), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    availability: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # Optional manual link. The managed ``resumes`` table is preferred.
    resume_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    github_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    website_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    is_placeholder: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="0", nullable=False
    )


class Resume(UUIDPrimaryKeyMixin, TimestampMixin, PublishableMixin, Base):
    """An uploaded, admin-managed resume document.

    ``storage_path`` is server-local and must never leave the backend. The
    public API exposes a download route built from the record id instead.
    """

    __tablename__ = "resumes"
    __table_args__ = (
        status_check(),
        CheckConstraint("file_size > 0", name="resume_file_size_positive"),
    )

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    version_label: Mapped[str] = mapped_column(String(80), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    # Server-generated filename only (never a user-controlled path).
    file_name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    storage_path: Mapped[str] = mapped_column(String(500), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    is_current: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="0", nullable=False, index=True
    )
    download_count: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )
