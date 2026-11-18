import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.project import Project
from app.models.mixins import (
    PublishableMixin,
    TimestampMixin,
    UUIDPrimaryKeyMixin,
    status_check,
)


class ExperienceEntry(UUIDPrimaryKeyMixin, TimestampMixin, PublishableMixin, Base):
    __tablename__ = "experience_entries"
    __table_args__ = (status_check(),)

    organization: Mapped[str] = mapped_column(String(160), nullable=False)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    slug: Mapped[str | None] = mapped_column(
        String(220), unique=True, nullable=True, index=True
    )
    location: Mapped[str | None] = mapped_column(String(120), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_on: Mapped[date] = mapped_column(Date, nullable=False)
    ended_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_current: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false", nullable=False
    )
    sort_order: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )


class LeadershipEntry(UUIDPrimaryKeyMixin, TimestampMixin, PublishableMixin, Base):
    __tablename__ = "leadership_entries"
    __table_args__ = (status_check(),)

    organization: Mapped[str] = mapped_column(String(160), nullable=False)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    slug: Mapped[str | None] = mapped_column(
        String(220), unique=True, nullable=True, index=True
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    contribution: Mapped[str | None] = mapped_column(Text, nullable=True)
    outcome: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    ended_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    sort_order: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )


class SkillGroup(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "skill_groups"

    name: Mapped[str] = mapped_column(String(80), nullable=False)
    slug: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )

    skills: Mapped[list["Skill"]] = relationship(
        back_populates="group", order_by="Skill.sort_order", lazy="selectin"
    )


class Skill(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "skills"

    skill_group_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("skill_groups.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    proficiency_label: Mapped[str | None] = mapped_column(String(40), nullable=True)
    icon_key: Mapped[str | None] = mapped_column(String(40), nullable=True)
    sort_order: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )
    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    group: Mapped[SkillGroup] = relationship(back_populates="skills")


class Certificate(UUIDPrimaryKeyMixin, TimestampMixin, PublishableMixin, Base):
    __tablename__ = "certificates"
    __table_args__ = (status_check(),)

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    issuer: Mapped[str] = mapped_column(String(160), nullable=False)
    issued_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    expires_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    credential_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    media_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    sort_order: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )


class Article(UUIDPrimaryKeyMixin, TimestampMixin, PublishableMixin, Base):
    __tablename__ = "articles"
    __table_args__ = (status_check(),)

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    excerpt: Mapped[str | None] = mapped_column(Text, nullable=True)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    cover_image_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    external_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    sort_order: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )


class TimelineEntry(UUIDPrimaryKeyMixin, TimestampMixin, PublishableMixin, Base):
    """A milestone in the professional/technical journey.

    Deliberately separate from experience and leadership records: an entry may
    reference those records, but it exists to tell the chronology.
    """

    __tablename__ = "timeline_entries"
    __table_args__ = (
        CheckConstraint(
            "kind IN ('education', 'project', 'experience', 'leadership', "
            "'certification', 'community', 'technical', 'milestone', 'other')",
            name="kind_valid",
        ),
        status_check(),
    )

    slug: Mapped[str | None] = mapped_column(
        String(220), unique=True, nullable=True, index=True
    )
    # Retained for grouping and backward compatibility; derived from start_date.
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    month: Mapped[int | None] = mapped_column(Integer, nullable=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    kind: Mapped[str] = mapped_column(
        String(30), default="milestone", server_default="milestone", nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    organization: Mapped[str | None] = mapped_column(String(200), nullable=True)
    location: Mapped[str | None] = mapped_column(String(160), nullable=True)
    related_project_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    related_experience_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("experience_entries.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    related_leadership_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("leadership_entries.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    external_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    featured: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="0", nullable=False, index=True
    )
    display_order: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )

    related_project: Mapped[Project | None] = relationship(
        foreign_keys=[related_project_id], lazy="selectin"
    )
    related_experience: Mapped[ExperienceEntry | None] = relationship(
        foreign_keys=[related_experience_id], lazy="selectin"
    )
    related_leadership: Mapped[LeadershipEntry | None] = relationship(
        foreign_keys=[related_leadership_id], lazy="selectin"
    )


class NowItem(UUIDPrimaryKeyMixin, TimestampMixin, PublishableMixin, Base):
    """A current-focus entry. Publication state and lifecycle state are separate."""

    __tablename__ = "now_items"
    __table_args__ = (
        CheckConstraint(
            "category IN ('building', 'learning', 'exploring', 'leading', "
            "'reading', 'experimenting', 'other')",
            name="now_category_valid",
        ),
        CheckConstraint(
            "item_status IN ('active', 'ongoing', 'paused', 'completed')",
            name="now_item_status_valid",
        ),
        status_check(),
    )

    # Optional legacy label; category is now the section heading.
    label: Mapped[str | None] = mapped_column(String(80), nullable=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(
        String(40), default="other", server_default="other", nullable=False, index=True
    )
    item_status: Mapped[str] = mapped_column(
        String(20), default="active", server_default="active", nullable=False, index=True
    )
    active: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="1", nullable=False, index=True
    )
    priority: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )
    external_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    related_project_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    related_build_lab_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    related_leadership_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("leadership_entries.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    sort_order: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )

    related_project: Mapped[Project | None] = relationship(
        foreign_keys=[related_project_id], lazy="selectin"
    )
    related_build_lab: Mapped[Project | None] = relationship(
        foreign_keys=[related_build_lab_id], lazy="selectin"
    )
    related_leadership: Mapped[LeadershipEntry | None] = relationship(
        foreign_keys=[related_leadership_id], lazy="selectin"
    )
