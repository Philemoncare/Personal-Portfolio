"""Data Lab models.

These tables are deliberately separate from the Work project tables. A data
project has its own analysis narrative, visualizations, insights, and
resources; overloading `projects` would make both systems harder to reason
about.
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Table,
    Text,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin

DATA_PROJECT_STATUSES = ("draft", "published", "archived", "experiment")
DATA_PROJECT_TYPES = (
    "eda",
    "sql",
    "excel",
    "dashboard",
    "bi",
    "statistical",
    "cleaning",
    "research",
    "visualization",
)
DATA_CHART_TYPES = (
    "bar",
    "line",
    "area",
    "pie",
    "donut",
    "scatter",
    "histogram",
    "heatmap",
    "table",
    "kpi",
)
DATA_RESOURCE_TYPES = (
    "dataset",
    "notebook",
    "sql",
    "excel",
    "pdf",
    "dashboard",
    "github",
    "external",
)

data_project_tools = Table(
    "data_project_tools",
    Base.metadata,
    Column(
        "data_project_id",
        Uuid(as_uuid=True),
        ForeignKey("data_projects.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "data_tool_id",
        Uuid(as_uuid=True),
        ForeignKey("data_tools.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Index("ix_data_project_tools_tool_id", "data_tool_id"),
)


class DataProjectCategory(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "data_project_categories"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )

    projects: Mapped[list["DataProject"]] = relationship(back_populates="category")


class DataTool(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "data_tools"

    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    kind: Mapped[str] = mapped_column(
        String(40), default="tool", server_default="tool", nullable=False
    )
    sort_order: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )

    projects: Mapped[list["DataProject"]] = relationship(
        secondary=data_project_tools, back_populates="tools"
    )


class DataProject(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "data_projects"
    __table_args__ = (
        CheckConstraint(
            "status IN ('draft', 'published', 'archived', 'experiment')",
            name="status_valid",
        ),
        CheckConstraint(
            "project_type IN ('eda', 'sql', 'excel', 'dashboard', 'bi', "
            "'statistical', 'cleaning', 'research', 'visualization')",
            name="project_type_valid",
        ),
        CheckConstraint(
            "dataset_rows IS NULL OR dataset_rows >= 0",
            name="dataset_rows_non_negative",
        ),
        CheckConstraint(
            "dataset_columns IS NULL OR dataset_columns >= 0",
            name="dataset_columns_non_negative",
        ),
    )

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    short_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    keywords: Mapped[str | None] = mapped_column(String(500), nullable=True)
    category_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("data_project_categories.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    project_type: Mapped[str] = mapped_column(
        String(40), default="eda", server_default="eda", nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(
        String(20), default="draft", server_default="draft", nullable=False, index=True
    )
    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    featured: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false", nullable=False, index=True
    )
    is_placeholder: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false", nullable=False
    )
    is_demo: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false", nullable=False
    )
    cover_image: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    question: Mapped[str | None] = mapped_column(Text, nullable=True)
    why_it_matters: Mapped[str | None] = mapped_column(Text, nullable=True)

    dataset_name: Mapped[str | None] = mapped_column(String(300), nullable=True)
    dataset_source: Mapped[str | None] = mapped_column(String(500), nullable=True)
    dataset_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    dataset_rows: Mapped[int | None] = mapped_column(Integer, nullable=True)
    dataset_columns: Mapped[int | None] = mapped_column(Integer, nullable=True)
    dataset_time_period: Mapped[str | None] = mapped_column(String(200), nullable=True)
    dataset_type: Mapped[str | None] = mapped_column(String(80), nullable=True)
    dataset_license: Mapped[str | None] = mapped_column(String(300), nullable=True)
    dataset_is_public: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true", nullable=False
    )
    dataset_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    data_preparation: Mapped[str | None] = mapped_column(Text, nullable=True)
    methodology: Mapped[str | None] = mapped_column(Text, nullable=True)
    analysis: Mapped[str | None] = mapped_column(Text, nullable=True)
    sql_query: Mapped[str | None] = mapped_column(Text, nullable=True)
    sql_result: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)
    python_snippet: Mapped[str | None] = mapped_column(Text, nullable=True)

    what_the_data_shows: Mapped[str | None] = mapped_column(Text, nullable=True)
    why_the_findings_matter: Mapped[str | None] = mapped_column(Text, nullable=True)
    what_i_would_do_next: Mapped[str | None] = mapped_column(Text, nullable=True)
    key_findings: Mapped[str | None] = mapped_column(Text, nullable=True)
    recommendations: Mapped[str | None] = mapped_column(Text, nullable=True)
    limitations: Mapped[str | None] = mapped_column(Text, nullable=True)
    conclusion: Mapped[str | None] = mapped_column(Text, nullable=True)

    github_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    notebook_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    dashboard_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    seo_title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    seo_description: Mapped[str | None] = mapped_column(String(400), nullable=True)

    sort_order: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )

    category: Mapped[DataProjectCategory] = relationship(back_populates="projects")
    tools: Mapped[list[DataTool]] = relationship(
        secondary=data_project_tools, back_populates="projects", lazy="selectin"
    )
    visualizations: Mapped[list["DataVisualization"]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="DataVisualization.display_order",
        lazy="selectin",
    )
    insights: Mapped[list["DataInsight"]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="DataInsight.display_order",
        lazy="selectin",
    )
    resources: Mapped[list["DataResource"]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="DataResource.display_order",
        lazy="selectin",
    )

    @property
    def cover_image_url(self) -> str | None:
        return self.cover_image

    @property
    def hero_visualization(self) -> "DataVisualization | None":
        return self.visualizations[0] if self.visualizations else None


class DataVisualization(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "data_visualizations"
    __table_args__ = (
        CheckConstraint(
            "chart_type IN ('bar', 'line', 'area', 'pie', 'donut', 'scatter', "
            "'histogram', 'heatmap', 'table', 'kpi')",
            name="chart_type_valid",
        ),
    )

    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("data_projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    chart_type: Mapped[str] = mapped_column(String(20), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    data: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)
    x_axis: Mapped[str | None] = mapped_column(String(100), nullable=True)
    y_axis: Mapped[str | None] = mapped_column(String(100), nullable=True)
    series: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    display_order: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )
    source_note: Mapped[str | None] = mapped_column(String(300), nullable=True)

    project: Mapped[DataProject] = relationship(back_populates="visualizations")


class DataInsight(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "data_insights"

    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("data_projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    key_insight: Mapped[str] = mapped_column(Text, nullable=False)
    possible_explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    recommendation: Mapped[str | None] = mapped_column(Text, nullable=True)
    display_order: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )

    project: Mapped[DataProject] = relationship(back_populates="insights")


class DataResource(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "data_resources"
    __table_args__ = (
        CheckConstraint(
            "resource_type IN ('dataset', 'notebook', 'sql', 'excel', 'pdf', "
            "'dashboard', 'github', 'external')",
            name="resource_type_valid",
        ),
    )

    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("data_projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    resource_type: Mapped[str] = mapped_column(
        String(30), default="external", server_default="external", nullable=False
    )
    url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    display_order: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )

    project: Mapped[DataProject] = relationship(back_populates="resources")
