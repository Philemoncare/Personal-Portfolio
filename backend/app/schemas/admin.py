from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.auth import AdminOut
from app.schemas.common import ORMModel
from app.schemas.project import ProjectCategoryOut, ProjectMediaOut, TechnologyOut

PublishStatus = Literal["draft", "published", "archived"]
ProjectStage = Literal["in_progress", "active", "completed", "archived", "experiment"]
PrimaryMode = Literal["build", "data", "lead", "explore"]
MediaType = Literal["image", "diagram", "video"]
DeploymentStatus = Literal["not_deployed", "deploying", "live", "failed", "offline"]

SLUG_PATTERN = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"


class AdminRecentProject(ORMModel):
    id: UUID
    title: str
    slug: str
    status: str
    is_placeholder: bool
    updated_at: datetime


class AdminRecentMessage(ORMModel):
    id: UUID
    name: str
    email: str
    subject: str
    status: str
    created_at: datetime


class AdminOverview(BaseModel):
    admin: AdminOut
    project_counts: dict[str, int]
    published_projects: int
    featured_projects: int
    placeholder_projects: int
    unread_messages: int
    total_messages: int
    leadership_entries: int
    now_items: int
    case_studies: int
    recent_projects: list[AdminRecentProject]
    recent_messages: list[AdminRecentMessage]


class ProjectMediaInput(BaseModel):
    url: str = Field(min_length=1, max_length=1000)
    alt_text: str = Field(min_length=1, max_length=300)
    caption: str | None = Field(default=None, max_length=300)
    media_type: MediaType = "image"
    sort_order: int = 0


class ProjectInput(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    slug: str | None = Field(default=None, max_length=160, pattern=SLUG_PATTERN)
    summary: str | None = None
    body: str | None = None
    category_id: UUID
    secondary_category_ids: list[UUID] = []
    technology_ids: list[UUID] = []
    extra_technologies: list[str] = []
    primary_mode: PrimaryMode = "build"
    project_status: ProjectStage = "in_progress"
    status: PublishStatus = "draft"
    featured: bool = False
    role: str | None = Field(default=None, max_length=160)
    year: int | None = Field(default=None, ge=1900, le=2200)
    started_on: date | None = None
    completed_on: date | None = None
    repository_url: str | None = Field(default=None, max_length=500)
    live_url: str | None = Field(default=None, max_length=500)
    documentation_url: str | None = Field(default=None, max_length=500)
    download_url: str | None = Field(default=None, max_length=500)
    external_url: str | None = Field(default=None, max_length=500)
    github_url: str | None = Field(default=None, max_length=500)
    demo_url: str | None = Field(default=None, max_length=500)
    video_url: str | None = Field(default=None, max_length=500)
    external_project_url: str | None = Field(default=None, max_length=500)
    deployment_provider: str | None = Field(default=None, max_length=80)
    deployment_status: DeploymentStatus = "not_deployed"
    deployment_url: str | None = Field(default=None, max_length=500)
    embed_enabled: bool = False
    last_verified_at: datetime | None = None
    public_visibility: bool = True
    seo_title: str | None = Field(default=None, max_length=200)
    seo_description: str | None = None
    og_image: str | None = Field(default=None, max_length=1000)
    cover_image: str | None = Field(default=None, max_length=1000)
    sort_order: int = 0
    is_placeholder: bool = False
    media: list[ProjectMediaInput] = []


class ProjectStatusInput(BaseModel):
    status: PublishStatus


class ProjectReorderInput(BaseModel):
    ids: list[UUID]


class ProjectAdminOut(ORMModel):
    id: UUID
    title: str
    slug: str
    summary: str | None
    body: str | None
    category: ProjectCategoryOut
    secondary_categories: list[ProjectCategoryOut] = []
    technologies: list[TechnologyOut] = []
    media: list[ProjectMediaOut] = []
    primary_mode: str
    project_status: str
    status: str
    featured: bool
    is_placeholder: bool
    role: str | None
    year: int | None
    started_on: date | None
    completed_on: date | None
    repository_url: str | None
    live_url: str | None
    documentation_url: str | None
    download_url: str | None
    external_url: str | None
    github_url: str | None
    demo_url: str | None
    video_url: str | None
    external_project_url: str | None
    deployment_provider: str | None
    deployment_status: str
    deployment_url: str | None
    embed_enabled: bool
    last_verified_at: datetime | None
    public_visibility: bool
    github_stars: int | None
    github_forks: int | None
    github_language: str | None
    github_open_issues: int | None
    github_metadata_checked_at: datetime | None
    github_repository_id: str | None = None
    github_owner: str | None = None
    github_repository_name: str | None = None
    github_default_branch: str | None = None
    github_last_synced_at: datetime | None = None
    github_repository_updated_at: datetime | None = None
    github_visibility: str | None = None
    github_is_fork: bool = False
    github_is_archived: bool = False
    github_metadata: dict | None = None
    github_sync_enabled: bool = False
    seo_title: str | None
    seo_description: str | None
    og_image: str | None
    cover_image: str | None
    cover_image_url: str | None
    sort_order: int
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime


class CaseStudyInput(BaseModel):
    project_id: UUID | None = None
    title: str = Field(min_length=1, max_length=200)
    slug: str | None = Field(default=None, max_length=200, pattern=SLUG_PATTERN)
    summary: str | None = None
    overview: str | None = None
    problem: str | None = None
    context: str | None = None
    goals: str | None = None
    idea: str | None = None
    research: str | None = None
    planning: str | None = None
    design: str | None = None
    solution: str | None = None
    role: str | None = None
    architecture: str | None = None
    technology: str | None = None
    key_features: str | None = None
    technical_decisions: str | None = None
    challenges: str | None = None
    implementation: str | None = None
    testing: str | None = None
    results: str | None = None
    result_type: str | None = Field(default=None, max_length=40)
    lessons: str | None = None
    future_improvements: str | None = None
    hidden_sections: list[str] = []
    featured: bool = False
    sort_order: int = 0
    status: PublishStatus = "draft"
    is_placeholder: bool = False


class CaseStudyAdminOut(ORMModel):
    id: UUID
    project_id: UUID | None
    title: str
    slug: str
    summary: str | None
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
    hidden_sections: list[str] | None
    featured: bool
    sort_order: int
    status: str
    is_placeholder: bool
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime


class AdminReference(BaseModel):
    categories: list[ProjectCategoryOut]
    technologies: list[TechnologyOut]
    statuses: list[str]
    stages: list[str]
    modes: list[dict[str, str]]
    case_study_sections: list[dict[str, str]]
    result_types: list[str]
    deployment_statuses: list[dict[str, str]] = []
    deployment_providers: list[str] = []
    media_folders: list[str] = []
