import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class ExperienceOut(ORMModel):
    id: uuid.UUID
    organization: str
    title: str
    slug: str | None
    location: str | None
    description: str | None
    logo_url: str | None
    started_on: date
    ended_on: date | None
    is_current: bool


class LeadershipOut(ORMModel):
    id: uuid.UUID
    organization: str
    title: str
    slug: str | None
    description: str | None
    contribution: str | None
    outcome: str | None
    started_on: date | None
    ended_on: date | None
    url: str | None
    image_url: str | None
    is_placeholder: bool


class SkillOut(ORMModel):
    id: uuid.UUID
    name: str
    proficiency_label: str | None
    icon_key: str | None


class SkillGroupOut(ORMModel):
    id: uuid.UUID
    name: str
    slug: str
    skills: list[SkillOut]


class CertificateOut(ORMModel):
    id: uuid.UUID
    name: str
    issuer: str
    issued_on: date | None
    expires_on: date | None
    credential_url: str | None
    media_url: str | None


class ArticleSummary(ORMModel):
    id: uuid.UUID
    title: str
    slug: str
    excerpt: str | None
    cover_image_url: str | None
    external_url: str | None
    category: str | None
    tags: list[str] | None
    featured: bool
    published_at: datetime | None


class ArticleDetail(ArticleSummary):
    body: str | None
    seo_title: str | None
    seo_description: str | None


class ArticleInput(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    slug: str | None = Field(default=None, max_length=200)
    excerpt: str | None = None
    body: str | None = None
    cover_image_url: str | None = Field(default=None, max_length=1000)
    external_url: str | None = Field(default=None, max_length=500)
    category: str | None = Field(default=None, max_length=80)
    tags: list[str] = []
    featured: bool = False
    seo_title: str | None = Field(default=None, max_length=200)
    seo_description: str | None = None
    sort_order: int = 0
    publish_status: str = "draft"
    is_placeholder: bool = False


class ArticleAdminOut(ArticleSummary):
    body: str | None
    seo_title: str | None
    seo_description: str | None
    sort_order: int
    status: str
    is_placeholder: bool
    created_at: datetime
    updated_at: datetime


class ArticleReorderInput(BaseModel):
    ids: list[uuid.UUID]


class TimelineGroup(BaseModel):
    year: int
    entries: list[dict]
