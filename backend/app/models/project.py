import uuid
from datetime import date, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Table,
    Text,
    Uuid,
    false,
    true,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import (
    PublishableMixin,
    TimestampMixin,
    UUIDPrimaryKeyMixin,
    status_check,
)

project_technologies = Table(
    "project_technologies",
    Base.metadata,
    Column(
        "project_id",
        Uuid(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "technology_id",
        Uuid(as_uuid=True),
        ForeignKey("technologies.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Index("ix_project_technologies_technology_id", "technology_id"),
)

project_secondary_categories = Table(
    "project_secondary_categories",
    Base.metadata,
    Column(
        "project_id",
        Uuid(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "category_id",
        Uuid(as_uuid=True),
        ForeignKey("project_categories.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Index("ix_project_secondary_categories_category_id", "category_id"),
)


class ProjectCategory(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "project_categories"

    name: Mapped[str] = mapped_column(String(80), nullable=False)
    slug: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )

    projects: Mapped[list["Project"]] = relationship(back_populates="category")
    secondary_projects: Mapped[list["Project"]] = relationship(
        secondary=project_secondary_categories, back_populates="secondary_categories"
    )


class Technology(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "technologies"

    name: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    kind: Mapped[str] = mapped_column(
        String(40), default="tool", server_default="tool", nullable=False
    )
    sort_order: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )

    projects: Mapped[list["Project"]] = relationship(
        secondary=project_technologies, back_populates="technologies"
    )


class Project(UUIDPrimaryKeyMixin, TimestampMixin, PublishableMixin, Base):
    __tablename__ = "projects"
    __table_args__ = (
        status_check(),
        CheckConstraint(
            "primary_mode IN ('build', 'data', 'lead', 'explore')",
            name="primary_mode_valid",
        ),
        CheckConstraint(
            "project_status IN ('in_progress', 'active', 'completed', 'archived', 'experiment')",
            name="project_status_valid",
        ),
        CheckConstraint(
            "deployment_status IN ('not_deployed', 'deploying', 'live', 'failed', 'offline')",
            name="deployment_status_valid",
        ),
    )

    title: Mapped[str] = mapped_column(String(160), nullable=False)
    slug: Mapped[str] = mapped_column(String(160), unique=True, nullable=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    category_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("project_categories.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    primary_mode: Mapped[str] = mapped_column(
        String(20), default="build", server_default="build", nullable=False, index=True
    )
    project_status: Mapped[str] = mapped_column(
        String(20),
        default="in_progress",
        server_default="in_progress",
        nullable=False,
        index=True,
    )
    featured: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false", nullable=False, index=True
    )
    role: Mapped[str | None] = mapped_column(String(160), nullable=True)
    year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    started_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    completed_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    repository_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    live_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    documentation_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    download_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    external_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # --- Deployment and publishing ---------------------------------------
    github_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    demo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    video_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    external_project_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    deployment_provider: Mapped[str | None] = mapped_column(String(80), nullable=True)
    deployment_status: Mapped[str] = mapped_column(
        String(20),
        default="not_deployed",
        server_default="not_deployed",
        nullable=False,
        index=True,
    )
    deployment_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # The administrator explicitly states whether the project may be framed.
    # The browser still verifies the frame client-side; this is a permission
    # flag, never a claim that embedding will succeed.
    embed_enabled: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false", nullable=False
    )
    last_verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    public_visibility: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true", nullable=False, index=True
    )

    # --- Cached public GitHub metadata (never fabricated) -----------------
    github_stars: Mapped[int | None] = mapped_column(Integer, nullable=True)
    github_forks: Mapped[int | None] = mapped_column(Integer, nullable=True)
    github_language: Mapped[str | None] = mapped_column(String(80), nullable=True)
    github_open_issues: Mapped[int | None] = mapped_column(Integer, nullable=True)
    github_metadata_checked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # --- Linked GitHub repository (provider-owned metadata) --------------
    # One repository may be linked to at most one portfolio project, which is
    # what prevents duplicate imports. Editorial fields stay untouched by sync.
    github_repository_id: Mapped[str | None] = mapped_column(
        String(40), unique=True, nullable=True, index=True
    )
    github_owner: Mapped[str | None] = mapped_column(String(120), nullable=True)
    github_repository_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    github_default_branch: Mapped[str | None] = mapped_column(String(200), nullable=True)
    github_last_synced_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    github_repository_updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    github_visibility: Mapped[str | None] = mapped_column(String(20), nullable=True)
    github_is_fork: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=false(), nullable=False
    )
    github_is_archived: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=false(), nullable=False
    )
    github_metadata: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    github_sync_enabled: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default=true(), nullable=False
    )

    # --- Per-project SEO --------------------------------------------------
    seo_title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    seo_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    og_image: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    cover_image: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    sort_order: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )

    category: Mapped[ProjectCategory] = relationship(back_populates="projects")
    secondary_categories: Mapped[list[ProjectCategory]] = relationship(
        secondary=project_secondary_categories,
        back_populates="secondary_projects",
        lazy="selectin",
    )
    technologies: Mapped[list[Technology]] = relationship(
        secondary=project_technologies,
        back_populates="projects",
        lazy="selectin",
    )
    media: Mapped[list["ProjectMedia"]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="ProjectMedia.sort_order",
        lazy="selectin",
    )
    case_studies: Mapped[list["CaseStudy"]] = relationship(back_populates="project")

    @property
    def cover_image_url(self) -> str | None:
        if self.cover_image:
            return self.cover_image
        for item in self.media:
            if item.media_type == "image":
                return item.url
        return None


class ProjectMedia(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "project_media"
    __table_args__ = (
        CheckConstraint(
            "media_type IN ('image', 'diagram', 'video')",
            name="media_type_valid",
        ),
    )

    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    url: Mapped[str] = mapped_column(String(1000), nullable=False)
    alt_text: Mapped[str] = mapped_column(String(300), nullable=False)
    caption: Mapped[str | None] = mapped_column(String(300), nullable=True)
    media_type: Mapped[str] = mapped_column(
        String(20), default="image", server_default="image", nullable=False
    )
    sort_order: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )

    project: Mapped[Project] = relationship(back_populates="media")


class CaseStudy(UUIDPrimaryKeyMixin, TimestampMixin, PublishableMixin, Base):
    __tablename__ = "case_studies"
    __table_args__ = (status_check(),)

    project_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    overview: Mapped[str | None] = mapped_column(Text, nullable=True)
    problem: Mapped[str | None] = mapped_column(Text, nullable=True)
    context: Mapped[str | None] = mapped_column(Text, nullable=True)
    goals: Mapped[str | None] = mapped_column(Text, nullable=True)
    idea: Mapped[str | None] = mapped_column(Text, nullable=True)
    research: Mapped[str | None] = mapped_column(Text, nullable=True)
    planning: Mapped[str | None] = mapped_column(Text, nullable=True)
    design: Mapped[str | None] = mapped_column(Text, nullable=True)
    solution: Mapped[str | None] = mapped_column(Text, nullable=True)
    role: Mapped[str | None] = mapped_column(Text, nullable=True)
    architecture: Mapped[str | None] = mapped_column(Text, nullable=True)
    technology: Mapped[str | None] = mapped_column(Text, nullable=True)
    key_features: Mapped[str | None] = mapped_column(Text, nullable=True)
    technical_decisions: Mapped[str | None] = mapped_column(Text, nullable=True)
    challenges: Mapped[str | None] = mapped_column(Text, nullable=True)
    implementation: Mapped[str | None] = mapped_column(Text, nullable=True)
    testing: Mapped[str | None] = mapped_column(Text, nullable=True)
    results: Mapped[str | None] = mapped_column(Text, nullable=True)
    result_type: Mapped[str | None] = mapped_column(String(40), nullable=True)
    lessons: Mapped[str | None] = mapped_column(Text, nullable=True)
    future_improvements: Mapped[str | None] = mapped_column(Text, nullable=True)
    hidden_sections: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    featured: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false", nullable=False
    )
    sort_order: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )

    project: Mapped[Project | None] = relationship(back_populates="case_studies")
