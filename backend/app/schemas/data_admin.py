"""Admin input and response contracts for the Data Lab."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from app.schemas.common import ORMModel
from app.schemas.data import (
    DataCategoryOut,
    DataInsightOut,
    DataProjectSummary,
    DataResourceOut,
    DataToolOut,
    DataVisualizationOut,
)

DataProjectStatus = Literal["draft", "published", "archived", "experiment"]
DataProjectType = Literal[
    "eda",
    "sql",
    "excel",
    "dashboard",
    "bi",
    "statistical",
    "cleaning",
    "research",
    "visualization",
]
DataChartType = Literal[
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
]
DataResourceType = Literal[
    "dataset",
    "notebook",
    "sql",
    "excel",
    "pdf",
    "dashboard",
    "github",
    "external",
]

SLUG_PATTERN = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"
CHART_TYPES_REQUIRING_DATA = {
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
}
ROW_LIMIT = 500


def _validate_url(value: str | None) -> str | None:
    if value is None:
        return None
    trimmed = value.strip()
    if not trimmed:
        return None
    if trimmed.startswith(("/", "https://", "http://")):
        return trimmed
    raise ValueError("Use an http(s) URL or a site-relative path beginning with /.")


def _validate_chart_data(data: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if len(data) > ROW_LIMIT:
        raise ValueError(f"Charts are limited to {ROW_LIMIT} rows.")
    cleaned: list[dict[str, Any]] = []
    for index, row in enumerate(data, start=1):
        if not isinstance(row, dict):
            raise ValueError(f"Row {index} must be a JSON object.")
        clean_row: dict[str, Any] = {}
        for key, value in row.items():
            if not isinstance(key, str) or not key.strip():
                raise ValueError(f"Row {index} contains an invalid column name.")
            if value is not None and not isinstance(value, (str, int, float, bool)):
                raise ValueError(
                    f"Row {index}, column '{key}' must be a string, number, or boolean."
                )
            clean_row[key.strip()] = value
        if not clean_row:
            raise ValueError(f"Row {index} is empty.")
        cleaned.append(clean_row)
    return cleaned


class DataVisualizationInput(BaseModel):
    chart_type: DataChartType = "bar"
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    data: list[dict[str, Any]] = []
    x_axis: str | None = Field(default=None, max_length=100)
    y_axis: str | None = Field(default=None, max_length=100)
    series: list[str] = []
    display_order: int = 0
    source_note: str | None = Field(default=None, max_length=300)

    @field_validator("data", mode="before")
    @classmethod
    def _clean_data(cls, value: object) -> list[dict[str, Any]]:
        if value is None:
            return []
        if not isinstance(value, list):
            raise ValueError("Chart data must be a list of rows.")
        return _validate_chart_data(value)

    @field_validator("series", mode="before")
    @classmethod
    def _clean_series(cls, value: object) -> list[str]:
        if value is None:
            return []
        if not isinstance(value, list):
            raise ValueError("Series must be a list of column names.")
        return [str(item).strip() for item in value if str(item).strip()]

    @model_validator(mode="after")
    def _validate_configuration(self) -> "DataVisualizationInput":
        if self.chart_type in CHART_TYPES_REQUIRING_DATA and not self.data:
            raise ValueError("Add at least one data row before saving a chart.")

        rows = self.data
        if not rows:
            return self

        def has_key(key: str) -> bool:
            return any(key in row for row in rows)

        if self.chart_type in {"bar", "line", "area", "pie", "donut", "histogram"}:
            if not self.x_axis:
                raise ValueError("Choose the category column.")
            if not has_key(self.x_axis):
                raise ValueError(f"Column '{self.x_axis}' is not in the data.")
            if not self.series and not self.y_axis:
                raise ValueError("Choose a value column or add a series.")
            for key in self.series:
                if not has_key(key):
                    raise ValueError(f"Series column '{key}' is not in the data.")
            if self.y_axis and not has_key(self.y_axis):
                raise ValueError(f"Column '{self.y_axis}' is not in the data.")

        if self.chart_type == "scatter":
            if not self.x_axis or not self.y_axis:
                raise ValueError("Scatter charts need both an x-axis and a y-axis column.")
            if not has_key(self.x_axis) or not has_key(self.y_axis):
                raise ValueError("The scatter columns must exist in the data.")

        if self.chart_type == "heatmap":
            if not self.x_axis or not self.y_axis:
                raise ValueError("Heatmaps need both an x-axis and a y-axis column.")
            if len(self.series) != 1:
                raise ValueError("Heatmaps need exactly one numeric value column.")
            if not has_key(self.x_axis) or not has_key(self.y_axis):
                raise ValueError("The heatmap axis columns must exist in the data.")
            if not has_key(self.series[0]):
                raise ValueError(f"Value column '{self.series[0]}' is not in the data.")

        return self


class DataInsightInput(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    key_insight: str = Field(min_length=1)
    possible_explanation: str | None = None
    recommendation: str | None = None
    display_order: int = 0


class DataResourceInput(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    resource_type: DataResourceType = "external"
    url: str | None = Field(default=None, max_length=1000)
    description: str | None = None
    display_order: int = 0

    @field_validator("url", mode="before")
    @classmethod
    def _url_safe(cls, value: object) -> str | None:
        if value is None:
            return None
        return _validate_url(str(value))


class DataProjectInput(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    slug: str | None = Field(default=None, max_length=200, pattern=SLUG_PATTERN)
    short_description: str | None = None
    description: str | None = None
    keywords: str | None = Field(default=None, max_length=500)
    category_id: uuid.UUID | None = None
    extra_category: str | None = Field(default=None, max_length=100)
    tool_ids: list[uuid.UUID] = []
    extra_tools: list[str] = []
    project_type: DataProjectType = "eda"
    status: DataProjectStatus = "draft"
    year: int | None = Field(default=None, ge=1900, le=2200)
    featured: bool = False
    is_placeholder: bool = False
    is_demo: bool = False
    cover_image: str | None = Field(default=None, max_length=1000)

    question: str | None = None
    why_it_matters: str | None = None

    dataset_name: str | None = Field(default=None, max_length=300)
    dataset_source: str | None = Field(default=None, max_length=500)
    dataset_description: str | None = None
    dataset_rows: int | None = Field(default=None, ge=0)
    dataset_columns: int | None = Field(default=None, ge=0)
    dataset_time_period: str | None = Field(default=None, max_length=200)
    dataset_type: str | None = Field(default=None, max_length=80)
    dataset_license: str | None = Field(default=None, max_length=300)
    dataset_is_public: bool = True
    dataset_note: str | None = None

    data_preparation: str | None = None
    methodology: str | None = None
    analysis: str | None = None
    sql_query: str | None = None
    sql_result: list[dict[str, Any]] = []
    python_snippet: str | None = None

    what_the_data_shows: str | None = None
    why_the_findings_matter: str | None = None
    what_i_would_do_next: str | None = None
    key_findings: str | None = None
    recommendations: str | None = None
    limitations: str | None = None
    conclusion: str | None = None

    github_url: str | None = Field(default=None, max_length=500)
    notebook_url: str | None = Field(default=None, max_length=500)
    dashboard_url: str | None = Field(default=None, max_length=500)
    seo_title: str | None = Field(default=None, max_length=200)
    seo_description: str | None = Field(default=None, max_length=400)

    sort_order: int = 0

    visualizations: list[DataVisualizationInput] = []
    insights: list[DataInsightInput] = []
    resources: list[DataResourceInput] = []

    @field_validator("cover_image", "github_url", "notebook_url", "dashboard_url", mode="before")
    @classmethod
    def _optional_urls(cls, value: object) -> str | None:
        if value is None:
            return None
        return _validate_url(str(value))

    @field_validator("sql_result", mode="before")
    @classmethod
    def _clean_sql_result(cls, value: object) -> list[dict[str, Any]]:
        if value is None:
            return []
        if not isinstance(value, list):
            raise ValueError("SQL results must be a list of objects.")
        cleaned = _validate_chart_data(value)
        if len(cleaned) > ROW_LIMIT:
            raise ValueError(f"SQL results are limited to {ROW_LIMIT} rows.")
        return cleaned

    @field_validator("extra_tools", mode="before")
    @classmethod
    def _clean_extra_tools(cls, value: object) -> list[str]:
        if value is None:
            return []
        if not isinstance(value, list):
            raise ValueError("Extra tools must be a list of names.")
        return [str(item).strip() for item in value if str(item).strip()]


class DataProjectStatusInput(BaseModel):
    status: DataProjectStatus


class DataProjectAdminOut(ORMModel):
    id: uuid.UUID
    title: str
    slug: str
    short_description: str | None
    description: str | None
    keywords: str | None
    category: DataCategoryOut
    tools: list[DataToolOut] = []
    project_type: str
    status: str
    year: int | None
    featured: bool
    is_placeholder: bool
    is_demo: bool
    cover_image: str | None
    cover_image_url: str | None

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

    sort_order: int
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime
    visualizations: list[DataVisualizationOut] = []
    insights: list[DataInsightOut] = []
    resources: list[DataResourceOut] = []

    @field_validator("sql_result", mode="before")
    @classmethod
    def _coerce_sql_result(cls, value: object) -> list[dict[str, Any]]:
        if not isinstance(value, list):
            return []
        return [item for item in value if isinstance(item, dict)]


class DataCategoryInput(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = None
    sort_order: int = 0


class DataToolInput(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    kind: str = Field(default="tool", max_length=40)
    sort_order: int = 0


class DataReference(BaseModel):
    categories: list[DataCategoryOut]
    tools: list[DataToolOut]
    statuses: list[str]
    project_types: list[dict[str, str]]
    chart_types: list[str]
    resource_types: list[str]
    featured: list[DataProjectSummary]
