"""Schemas for the GitHub integration API.

These payloads are the only GitHub-shaped data the admin UI ever receives.
Access tokens and client secrets are never part of any response.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class GitHubConnectionOut(BaseModel):
    connected: bool
    username: str | None = None
    display_name: str | None = None
    avatar_url: str | None = None
    account_url: str | None = None
    github_account_id: str | None = None
    scopes: list[str] = []
    repository_access: str | None = None
    private_repository_access: bool = False
    connected_at: datetime | None = None
    updated_at: datetime | None = None
    revoked_at: datetime | None = None


class GitHubRateLimitOut(BaseModel):
    limit: int | None = None
    remaining: int | None = None
    reset_at: datetime | None = None


class GitHubStatusOut(BaseModel):
    configured: bool
    connected: bool
    connection: GitHubConnectionOut | None = None
    requested_scopes: list[str] = []
    private_access_requested: bool = False
    authorize_url: str | None = None
    redirect_uri: str | None = None
    account_api_available: bool | None = None
    rate_limit: GitHubRateLimitOut | None = None
    message: str | None = None


class GitHubConnectOut(BaseModel):
    authorize_url: str
    scopes: list[str]
    redirect_uri: str
    expires_in_minutes: int


class GitHubRepositoryOut(BaseModel):
    id: str
    name: str
    full_name: str
    description: str | None = None
    owner: str
    owner_avatar_url: str | None = None
    private: bool = False
    visibility: str = "public"
    html_url: str
    homepage: str | None = None
    language: str | None = None
    languages: dict[str, int] = {}
    topics: list[str] = []
    stargazers_count: int = 0
    forks_count: int = 0
    watchers_count: int = 0
    open_issues_count: int = 0
    default_branch: str = "main"
    created_at: datetime | None = None
    updated_at: datetime | None = None
    pushed_at: datetime | None = None
    license: str | None = None
    archived: bool = False
    fork: bool = False
    size_kb: int = 0
    # Portfolio linkage, resolved from the local database.
    linked_project_id: UUID | None = None
    linked_project_title: str | None = None
    linked_project_status: str | None = None
    import_state: str = "not_imported"
    sync_available: bool = False
    last_synced_at: datetime | None = None


class GitHubRepositoryListOut(BaseModel):
    items: list[GitHubRepositoryOut] = []
    total: int = 0
    page: int = 1
    per_page: int = 30
    has_more: bool = False
    truncated: bool = False
    languages: list[str] = []
    rate_limit_remaining: int | None = None
    fetched_at: datetime | None = None
    cached: bool = False


class GitHubTreeEntryOut(BaseModel):
    name: str
    path: str
    type: str
    size: int | None = None
    html_url: str | None = None


class GitHubContentsOut(BaseModel):
    path: str
    entries: list[GitHubTreeEntryOut] = []
    truncated: bool = False
    default_branch: str


class GitHubReadmeOut(BaseModel):
    path: str | None = None
    content: str | None = None
    html_url: str | None = None
    truncated: bool = False
    available: bool = False


class GitHubImageOut(BaseModel):
    path: str
    name: str
    markdown: str | None = None
    source_url: str
    preview_url: str
    mime_type: str | None = None
    size_bytes: int | None = None


class GitHubImagesOut(BaseModel):
    items: list[GitHubImageOut] = []
    readme_path: str | None = None
    ignored: list[dict[str, str]] = []


class DetectedTechnologyOut(BaseModel):
    name: str
    confidence: str
    evidence: list[str] = []


class DetectedArchitectureLayerOut(BaseModel):
    layer: str
    technologies: list[str] = []
    evidence: list[str] = []


class LiveUrlCandidateOut(BaseModel):
    url: str
    source: str
    confidence: str


class CategorySuggestionOut(BaseModel):
    name: str
    slug: str
    reason: str
    category_id: UUID | None = None


class ReadmeSectionOut(BaseModel):
    key: str
    label: str
    content: str
    documented: bool = True


class CaseStudyDraftOut(BaseModel):
    overview: str
    problem: str
    solution: str
    features: str
    architecture: str
    technology: str
    implementation: str
    challenges: str
    testing: str
    lessons: str
    future_improvements: str


class GitHubCommitOut(BaseModel):
    sha: str
    message: str | None = None
    author: str | None = None
    authored_at: datetime | None = None
    html_url: str | None = None


class GitHubActivityOut(BaseModel):
    default_branch: str
    pushed_at: datetime | None = None
    updated_at: datetime | None = None
    open_issues_count: int = 0
    recent_commits: list[GitHubCommitOut] = []
    commits_available: bool = True


class RepositoryInspectionOut(BaseModel):
    repository: GitHubRepositoryOut
    structure: GitHubContentsOut
    inspected_files: list[str] = []
    skipped_files: list[dict[str, str]] = []
    readme: GitHubReadmeOut
    readme_sections: list[ReadmeSectionOut] = []
    technologies: list[DetectedTechnologyOut] = []
    architecture: list[DetectedArchitectureLayerOut] = []
    category_suggestions: list[CategorySuggestionOut] = []
    live_url_candidates: list[LiveUrlCandidateOut] = []
    documentation_url: str | None = None
    images: GitHubImagesOut
    activity: GitHubActivityOut
    case_study: CaseStudyDraftOut
    limitations: list[str] = []
    fetched_at: datetime


class GitHubImportRequest(BaseModel):
    category_id: UUID | None = None
    title: str | None = Field(default=None, max_length=160)
    summary: str | None = None
    body: str | None = None
    use_readme: bool = True
    case_study: bool = False
    live_url: str | None = Field(default=None, max_length=500)
    documentation_url: str | None = Field(default=None, max_length=500)
    technology_names: list[str] = []
    cover_image_path: str | None = Field(default=None, max_length=500)
    gallery_image_paths: list[str] = []
    featured: bool = False
    primary_mode: str = "build"
    project_status: str = "in_progress"
    import_images: bool = True


class GitHubImportResultOut(BaseModel):
    project_id: UUID
    project_slug: str
    project_title: str
    status: str
    case_study_id: UUID | None = None
    images_imported: int = 0
    technologies: list[str] = []
    repository_full_name: str
    message: str


class GitHubSyncOut(BaseModel):
    project_id: UUID
    repository_full_name: str
    updated_fields: list[str] = []
    preserved_fields: list[str] = []
    stars: int | None = None
    forks: int | None = None
    language: str | None = None
    open_issues: int | None = None
    default_branch: str | None = None
    last_synced_at: datetime
    message: str


class GitHubProjectLinkOut(BaseModel):
    connected: bool
    project_id: UUID
    repository_id: str | None = None
    repository_full_name: str | None = None
    repository_url: str | None = None
    owner: str | None = None
    default_branch: str | None = None
    visibility: str | None = None
    is_fork: bool = False
    is_archived: bool = False
    sync_enabled: bool = False
    last_synced_at: datetime | None = None
    repository_updated_at: datetime | None = None
    description: str | None = None
    homepage: str | None = None
    topics: list[str] = []


class GitHubImageImportRequest(BaseModel):
    path: str = Field(min_length=1, max_length=500)
    role: str = "gallery"
    alt_text: str | None = Field(default=None, max_length=300)
    caption: str | None = Field(default=None, max_length=300)


class GitHubImportLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID | None
    repository_id: str
    repository_full_name: str
    action: str
    status: str
    summary: str | None
    details: dict | None
    error_message: str | None
    created_at: datetime


class GitHubImportLogListOut(BaseModel):
    items: list[GitHubImportLogOut] = []
    total: int = 0
