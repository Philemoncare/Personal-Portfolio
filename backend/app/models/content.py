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
    __tablename__ = "timeline_entries"
    __table_args__ = (
        CheckConstraint(
            "kind IN ('education', 'project', 'leadership', 'cloud', 'development', 'milestone')",
            name="kind_valid",
        ),
        status_check(),
    )

    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    month: Mapped[int | None] = mapped_column(Integer, nullable=True)
    kind: Mapped[str] = mapped_column(
        String(30), default="milestone", server_default="milestone", nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )


class NowItem(UUIDPrimaryKeyMixin, TimestampMixin, PublishableMixin, Base):
    __tablename__ = "now_items"
    __table_args__ = (status_check(),)

    label: Mapped[str] = mapped_column(String(80), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )
