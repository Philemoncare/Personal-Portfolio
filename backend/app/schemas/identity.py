"""Public identity-layer response models."""

import uuid
from datetime import date, datetime
from typing import Literal
from urllib.parse import urlparse

from pydantic import BaseModel, field_validator

from app.schemas.common import ORMModel
from app.schemas.site import SocialLinkOut


def validate_http_url(value: str | None) -> str | None:
    """Accept empty values or absolute http(s) URLs only."""

    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    if len(cleaned) > 500:
        raise ValueError("URL is too long")
    parsed = urlparse(cleaned)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("Enter a full URL starting with http:// or https://")
    return cleaned


def validate_asset_reference(value: str | None) -> str | None:
    """Accept empty values, http(s) URLs, or a site-relative path."""

    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    if len(cleaned) > 1000:
        raise ValueError("Asset path is too long")
    if cleaned.startswith("/"):
        return cleaned
    parsed = urlparse(cleaned)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("Enter a full URL or a site-relative path starting with /")
    return cleaned


class ContentLink(BaseModel):
    """Small, reusable reference used across identity surfaces."""

    kind: Literal["project", "build_lab", "leadership", "experience", "external"]
    title: str
    slug: str | None = None
    href: str
    label: str | None = None


class ResumePublic(ORMModel):
    id: uuid.UUID
    title: str
    version_label: str
    file_size: int
    download_url: str
    published_at: datetime | None
    updated_at: datetime


class ProfilePublic(ORMModel):
    name: str
    display_name: str
    professional_title: str | None
    short_bio: str | None
    long_bio: str | None
    what_i_build: str | None
    how_i_work: str | None
    current_direction: str | None
    personal_interests: str | None
    profile_image: str | None
    location: str | None
    email: str | None
    phone: str | None
    availability: str | None
    resume_url: str | None
    github_url: str | None
    linkedin_url: str | None
    website_url: str | None
    is_placeholder: bool
    updated_at: datetime
    current_resume: ResumePublic | None = None


class ProfileAdminOut(ProfilePublic):
    created_at: datetime


class NowOut(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None
    category: Literal[
        "building", "learning", "exploring", "leading", "reading", "experimenting", "other"
    ]
    status: Literal["active", "ongoing", "paused", "completed"]
    active: bool
    priority: int
    display_order: int
    external_url: str | None
    related_project: ContentLink | None
    related_build_lab: ContentLink | None
    related_leadership: ContentLink | None
    is_placeholder: bool
    created_at: datetime
    updated_at: datetime


class NowGroup(BaseModel):
    category: str
    label: str
    items: list[NowOut]


class NowAdminOut(NowOut):
    publish_status: str
    related_project_id: uuid.UUID | None
    related_build_lab_id: uuid.UUID | None
    related_leadership_id: uuid.UUID | None
    related_project_title: str | None = None
    related_build_lab_title: str | None = None
    related_leadership_title: str | None = None


class TimelineOut(BaseModel):
    id: uuid.UUID
    slug: str | None
    title: str
    kind: Literal[
        "education",
        "project",
        "experience",
        "leadership",
        "certification",
        "community",
        "technical",
        "milestone",
        "other",
    ]
    summary: str | None
    description: str | None
    organization: str | None
    location: str | None
    start_date: date | None
    end_date: date | None
    year: int
    month: int | None
    external_url: str | None
    image_url: str | None
    featured: bool
    display_order: int
    related_project: ContentLink | None
    related_experience: ContentLink | None
    related_leadership: ContentLink | None
    is_placeholder: bool
    published_at: datetime | None


class TimelineAdminOut(TimelineOut):
    publish_status: str
    related_project_id: uuid.UUID | None
    related_experience_id: uuid.UUID | None
    related_leadership_id: uuid.UUID | None
    related_project_title: str | None = None
    related_experience_title: str | None = None
    related_leadership_title: str | None = None


class SiteSettingsPublic(ORMModel):
    site_name: str
    site_description: str | None
    wordmark: str
    accent: str
    footer_text: str | None
    copyright_text: str | None
    social_image: str | None
    favicon: str | None
    # Identity fields merged from the profile for global consumers.
    display_name: str
    role_title: str
    hero_intro: str | None
    bio: str | None
    location: str | None
    availability: str | None
    email: str | None
    phone: str | None
    website_url: str | None
    github_url: str | None
    linkedin_url: str | None
    cv_url: str | None
    seo_title: str | None
    seo_description: str | None
    is_placeholder: bool
    updated_at: datetime
    contact_delivery: Literal["email_configured", "stored_only"] = "stored_only"
    resume_available: bool = False
    social_links: list[SocialLinkOut] = []


class SearchIndexEntry(BaseModel):
    """Prepared unified-search record. No search engine is implemented yet."""

    kind: Literal[
        "project", "data_project", "leadership", "experience", "timeline", "article"
    ]
    title: str
    slug: str
    description: str | None
    category: str | None
    url: str
    updated_at: datetime | None = None


class SearchIndexOut(BaseModel):
    entries: list[SearchIndexEntry]
    generated_at: datetime
    note: str


# --- Admin inputs ---------------------------------------------------------


class ProfileInput(BaseModel):
    name: str
    display_name: str
    professional_title: str | None = None
    short_bio: str | None = None
    long_bio: str | None = None
    what_i_build: str | None = None
    how_i_work: str | None = None
    current_direction: str | None = None
    personal_interests: str | None = None
    profile_image: str | None = None
    location: str | None = None
    email: str | None = None
    phone: str | None = None
    availability: str | None = None
    resume_url: str | None = None
    github_url: str | None = None
    linkedin_url: str | None = None
    website_url: str | None = None
    is_placeholder: bool = False

    @field_validator(
        "profile_image", "resume_url", "github_url", "linkedin_url", "website_url"
    )
    @classmethod
    def _validate_urls(cls, value: str | None) -> str | None:
        return validate_asset_reference(value)

    @field_validator("email", "phone", mode="before")
    @classmethod
    def _trim_optional_text(cls, value: object) -> str | None:
        if value is None:
            return None
        cleaned = str(value).strip()
        return cleaned or None


NowCategory = Literal[
    "building", "learning", "exploring", "leading", "reading", "experimenting", "other"
]
NowStatus = Literal["active", "ongoing", "paused", "completed"]
TimelineKind = Literal[
    "education",
    "project",
    "experience",
    "leadership",
    "certification",
    "community",
    "technical",
    "milestone",
    "other",
]
PublishStatus = Literal["draft", "published", "archived"]


class NowInput(BaseModel):
    title: str
    description: str | None = None
    category: NowCategory = "other"
    status: NowStatus = "active"
    active: bool = True
    priority: int = 0
    display_order: int = 0
    external_url: str | None = None
    related_project_id: uuid.UUID | None = None
    related_build_lab_id: uuid.UUID | None = None
    related_leadership_id: uuid.UUID | None = None
    publish_status: PublishStatus = "published"
    is_placeholder: bool = False

    @field_validator("external_url")
    @classmethod
    def _validate_external_url(cls, value: str | None) -> str | None:
        return validate_http_url(value)


class NowReorderInput(BaseModel):
    ids: list[uuid.UUID]


class TimelineInput(BaseModel):
    title: str
    slug: str | None = None
    kind: TimelineKind = "milestone"
    summary: str | None = None
    description: str | None = None
    organization: str | None = None
    location: str | None = None
    start_date: date
    end_date: date | None = None
    external_url: str | None = None
    image_url: str | None = None
    related_project_id: uuid.UUID | None = None
    related_experience_id: uuid.UUID | None = None
    related_leadership_id: uuid.UUID | None = None
    featured: bool = False
    display_order: int = 0
    publish_status: PublishStatus = "draft"
    is_placeholder: bool = False

    @field_validator("external_url")
    @classmethod
    def _validate_external_url(cls, value: str | None) -> str | None:
        return validate_http_url(value)


class TimelineReorderInput(BaseModel):
    ids: list[uuid.UUID]


class ResumeAdminOut(ORMModel):
    id: uuid.UUID
    title: str
    version_label: str
    original_filename: str
    mime_type: str
    file_size: int
    status: str
    is_current: bool
    download_url: str
    download_count: int
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime


class ResumePatch(BaseModel):
    title: str | None = None
    version_label: str | None = None
    is_current: bool | None = None
    publish_status: PublishStatus | None = None


class MessageStatusInput(BaseModel):
    status: Literal["new", "read", "replied", "archived", "spam"]


class ContactMessageAdmin(ORMModel):
    id: uuid.UUID
    name: str
    email: str
    subject: str
    inquiry_type: str | None
    message: str
    status: str
    email_status: str
    created_at: datetime
    read_at: datetime | None
    replied_at: datetime | None


class AdminMessageList(BaseModel):
    items: list[ContactMessageAdmin]
    total: int
    unread: int
    spam: int = 0
    email_delivery_configured: bool
    notification_email: str | None


class SiteSettingsAdminOut(ORMModel):
    site_name: str
    site_description: str | None
    wordmark: str
    accent: str
    footer_text: str | None
    copyright_text: str | None
    social_image: str | None
    favicon: str | None
    seo_title: str | None
    seo_description: str | None
    display_name: str
    role_title: str
    hero_intro: str | None
    bio: str | None
    location: str | None
    email: str | None
    is_placeholder: bool
    updated_at: datetime


class SiteSettingsInput(BaseModel):
    site_name: str
    site_description: str | None = None
    wordmark: str = "Phill"
    accent: str = "signal"
    footer_text: str | None = None
    copyright_text: str | None = None
    social_image: str | None = None
    favicon: str | None = None
    seo_title: str | None = None
    seo_description: str | None = None

    @field_validator("social_image", "favicon")
    @classmethod
    def _validate_assets(cls, value: str | None) -> str | None:
        return validate_asset_reference(value)


class AdminSettingsOut(BaseModel):
    profile: ProfileAdminOut
    site: SiteSettingsAdminOut
    resume: ResumeAdminOut | None
    email_delivery_configured: bool
    notification_email: str | None
    options: dict[str, list[dict[str, str]]]


class AdminSettingsInput(BaseModel):
    profile: ProfileInput
    site: SiteSettingsInput


class LinkedRecord(BaseModel):
    id: uuid.UUID
    title: str
    subtitle: str | None = None
    slug: str | None = None
    status: str


class ContentReference(BaseModel):
    projects: list[LinkedRecord]
    leadership: list[LinkedRecord]
    experience: list[LinkedRecord]
    now_categories: list[dict[str, str]]
    now_statuses: list[str]
    timeline_kinds: list[dict[str, str]]
    publish_statuses: list[str]
    message_statuses: list[str]
    inquiry_types: list[dict[str, str]]
