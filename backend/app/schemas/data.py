"""Pydantic contracts for the public Data Lab API."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import field_validator

from app.schemas.common import ORMModel


class DataCategoryOut(ORMModel):
    id: uuid.UUID
    name: str
    slug: str


class DataToolOut(ORMModel):
    id: uuid.UUID
    name: str
    slug: str
    kind: str


class DataVisualizationOut(ORMModel):
    id: uuid.UUID
    chart_type: str
    title: str
    description: str | None
    data: list[dict[str, Any]] = []
    x_axis: str | None
    y_axis: str | None
    series: list[str] = []
    display_order: int
    source_note: str | None

    @field_validator("data", mode="before")
    @classmethod
    def _coerce_data(cls, value: object) -> list[dict[str, Any]]:
        if not isinstance(value, list):
            return []
        return [item for item in value if isinstance(item, dict)]

    @field_validator("series", mode="before")
    @classmethod
    def _coerce_series(cls, value: object) -> list[str]:
        if not isinstance(value, list):
            return []
        return [str(item) for item in value]


class DataInsightOut(ORMModel):
    id: uuid.UUID
    title: str | None
    key_insight: str
    possible_explanation: str | None
    recommendation: str | None
    display_order: int


class DataResourceOut(ORMModel):
    id: uuid.UUID
    title: str
    resource_type: str
    url: str | None
    description: str | None
    display_order: int


class DataProjectSummary(ORMModel):
    id: uuid.UUID
    title: str
    slug: str
    short_description: str | None
    category: DataCategoryOut
    project_type: str
    status: str
    year: int | None
    featured: bool
    is_placeholder: bool
    is_demo: bool
    cover_image_url: str | None
    dataset_type: str | None
    tools: list[DataToolOut] = []
    hero_visualization: DataVisualizationOut | None = None
    published_at: datetime | None
    sort_order: int


class DataProjectDetail(DataProjectSummary):
    description: str | None
    keywords: str | None
    question: str | None
    why_it_matters: str | None

    dataset_name: str | None
    dataset_source: str | None
    dataset_description: str | None
    dataset_rows: int | None
    dataset_columns: int | None
    dataset_time_period: str | None
    dataset_type: str | None
    dataset_license: str | None
    dataset_is_public: bool
    dataset_note: str | None

    data_preparation: str | None
    methodology: str | None
    analysis: str | None
    sql_query: str | None
    sql_result: list[dict[str, Any]] = []
    python_snippet: str | None

    what_the_data_shows: str | None
    why_the_findings_matter: str | None
    what_i_would_do_next: str | None
    key_findings: str | None
    recommendations: str | None
    limitations: str | None
    conclusion: str | None

    github_url: str | None
    notebook_url: str | None
    dashboard_url: str | None
    seo_title: str | None
    seo_description: str | None

    visualizations: list[DataVisualizationOut] = []
    insights: list[DataInsightOut] = []
    resources: list[DataResourceOut] = []

    @field_validator("sql_result", mode="before")
    @classmethod
    def _coerce_sql_result(cls, value: object) -> list[dict[str, Any]]:
        if not isinstance(value, list):
            return []
        return [item for item in value if isinstance(item, dict)]
