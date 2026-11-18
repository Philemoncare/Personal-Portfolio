import uuid
from datetime import date, datetime

from pydantic import BaseModel

from app.schemas.common import ORMModel


class ExperienceOut(ORMModel):
    id: uuid.UUID
    organization: str
    title: str
    slug: str | None
    location: str | None
    description: str | None
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
    published_at: datetime | None


class ArticleDetail(ArticleSummary):
    body: str | None


class TimelineGroup(BaseModel):
    year: int
    entries: list[dict]
