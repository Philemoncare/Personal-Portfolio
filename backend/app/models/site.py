"""Site-wide, administrator-managed presentation content.

These records are intentionally small and typed. They store the content that
used to be hard-coded in the frontend: social profiles, page introductions, and
per-page SEO metadata. Public pages read them through the API.
"""

from sqlalchemy import Boolean, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class SocialLink(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A real, administrator-configured public profile or contact channel."""

    __tablename__ = "social_links"

    platform: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    handle: Mapped[str | None] = mapped_column(String(120), nullable=True)
    sort_order: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )
    is_visible: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true", nullable=False, index=True
    )


class PageContent(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Editable introduction and SEO for one public page."""

    __tablename__ = "page_contents"

    page_key: Mapped[str] = mapped_column(String(60), unique=True, nullable=False)
    eyebrow: Mapped[str | None] = mapped_column(String(120), nullable=True)
    title: Mapped[str | None] = mapped_column(String(240), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    intro: Mapped[str | None] = mapped_column(Text, nullable=True)
    hero_image: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    seo_title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    seo_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    og_image: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    canonical_path: Mapped[str | None] = mapped_column(String(300), nullable=True)
    is_published: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true", nullable=False, index=True
    )
    # Optional page-specific structured content (for example homepage section
    # copy). Kept generic so new sections do not require a migration.
    content: Mapped[dict | None] = mapped_column(JSON, nullable=True)
