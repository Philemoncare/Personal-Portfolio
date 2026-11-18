import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, field_validator

from app.schemas.common import ORMModel

DeploymentStatus = Literal["not_deployed", "deploying", "live", "failed", "offline"]


class ProjectCategoryOut(ORMModel):
    id: uuid.UUID
    name: str
    slug: str


class TechnologyOut(ORMModel):
    id: uuid.UUID
    name: str
    slug: str
    kind: str


class ProjectMediaOut(ORMModel):
    id: uuid.UUID
    url: str
    alt_text: str
    caption: str | None
    media_type: str
    sort_order: int


class ProjectLink(BaseModel):
    title: str
    slug: str


class CaseStudySummary(ORMModel):
    id: uuid.UUID
    title: str
    slug: str
    summary: str | None
    featured: bool
    is_placeholder: bool
    published_at: datetime | None
    project_slug: str | None = None


class CaseStudyDetail(CaseStudySummary):
    overview: str | None
    problem: str | None
    context: str | None
    goals: str | None
    idea: str | None
    research: str | None
    planning: str | None
    design: str | None
    solution: str | None
    role: str | None
    architecture: str | None
    technology: str | None
    key_features: str | None
    technical_decisions: str | None
    challenges: str | None
    implementation: str | None
    testing: str | None
    results: str | None
    result_type: str | None
    lessons: str | None
    future_improvements: str | None
    hidden_sections: list[str] = []

    @field_validator("hidden_sections", mode="before")
    @classmethod
    def _coerce_hidden_sections(cls, value: object) -> list[str]:
        if value is None:
            return []
        if isinstance(value, list):
            return [str(item) for item in value]
        return []


class ProjectSummary(ORMModel):
    id: uuid.UUID
    title: str
    slug: str
    summary: str | None
    category: ProjectCategoryOut
    secondary_categories: list[ProjectCategoryOut] = []
    primary_mode: str
    project_status: str
    featured: bool
    is_placeholder: bool
    role: str | None
    year: int | None
    repository_url: str | None
    live_url: str | None
    documentation_url: str | None
    download_url: str | None
    external_url: str | None
    external_project_url: str | None = None
    github_url: str | None = None
    demo_url: str | None = None
    video_url: str | None = None
    deployment_provider: str | None = None
    deployment_status: DeploymentStatus = "not_deployed"
    deployment_url: str | None = None
    embed_enabled: bool = False
    last_verified_at: datetime | None = None
    public_visibility: bool = True
    github_stars: int | None = None
    github_forks: int | None = None
    github_language: str | None = None
    github_open_issues: int | None = None
    github_metadata_checked_at: datetime | None = None
    seo_title: str | None = None
    seo_description: str | None = None
    og_image: str | None = None
    cover_image_url: str | None
    technologies: list[TechnologyOut]
    sort_order: int
    published_at: datetime | None


class ProjectDetail(ProjectSummary):
    body: str | None
    started_on: date | None
    completed_on: date | None
    media: list[ProjectMediaOut]
    case_study_slug: str | None = None
    case_study: CaseStudyDetail | None = None
    related: list[ProjectSummary] = []
    previous: ProjectLink | None = None
    next: ProjectLink | None = None
