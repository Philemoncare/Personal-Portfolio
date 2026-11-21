"""Schemas for social links, editable page content, and profile collection CRUD."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Literal
from urllib.parse import urlparse

from pydantic import BaseModel, Field, field_validator, model_validator

from app.schemas.common import ORMModel

PublishStatus = Literal["draft", "published", "archived"]


def _clean(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _validate_asset(value: str | None) -> str | None:
    """Accept an uploaded media path or an absolute http(s) URL."""

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
        raise ValueError("Upload an image or provide a full http(s) URL.")
    return cleaned


class SocialLinkOut(ORMModel):
    id: uuid.UUID
    platform: str
    label: str
    url: str
    handle: str | None
    sort_order: int
    is_visible: bool


class SocialLinkAdminOut(SocialLinkOut):
    created_at: datetime
    updated_at: datetime


class SocialLinkInput(BaseModel):
    platform: str = Field(min_length=1, max_length=40)
    label: str = Field(min_length=1, max_length=120)
    url: str = Field(min_length=1, max_length=500)
    handle: str | None = Field(default=None, max_length=120)
    sort_order: int = 0
    is_visible: bool = True

    @model_validator(mode="after")
    def _validate_url(self) -> "SocialLinkInput":
        platform = self.platform.lower()
        url = self.url.strip()
        if platform == "email":
            if not url.lower().startswith("mailto:") and "@" not in url:
                raise ValueError("Email links must be a mailto: URL or an email address.")
            if "@" not in url:
                raise ValueError("Enter a valid email address.")
        elif platform == "phone":
            if not url.lower().startswith("tel:") and not url.replace("+", "").replace(" ", "").isdigit():
                raise ValueError("Phone links must be a tel: URL or a phone number.")
        elif platform == "whatsapp":
            parsed = urlparse(url)
            if parsed.scheme not in {"http", "https"} or not parsed.netloc:
                raise ValueError("Enter the full WhatsApp URL (https://wa.me/...).")
        else:
            parsed = urlparse(url)
            if parsed.scheme not in {"http", "https"} or not parsed.netloc:
                raise ValueError("Enter a full URL starting with http:// or https://.")
        self.label = self.label.strip()
        self.handle = _clean(self.handle)
        return self


class PageContentOut(ORMModel):
    page_key: str
    eyebrow: str | None
    title: str | None
    description: str | None
    intro: str | None
    hero_image: str | None
    seo_title: str | None
    seo_description: str | None
    og_image: str | None
    canonical_path: str | None
    is_published: bool
    content: dict | None
    updated_at: datetime


class PageContentAdminOut(PageContentOut):
    id: uuid.UUID
    created_at: datetime


class PageContentInput(BaseModel):
    eyebrow: str | None = Field(default=None, max_length=120)
    title: str | None = Field(default=None, max_length=240)
    description: str | None = None
    intro: str | None = None
    hero_image: str | None = Field(default=None, max_length=1000)
    seo_title: str | None = Field(default=None, max_length=200)
    seo_description: str | None = None
    og_image: str | None = Field(default=None, max_length=1000)
    canonical_path: str | None = Field(default=None, max_length=300)
    is_published: bool = True
    content: dict | None = None


# --- Experience and Leadership -------------------------------------------


class ExperienceInput(BaseModel):
    organization: str = Field(min_length=1, max_length=160)
    title: str = Field(min_length=1, max_length=160)
    slug: str | None = Field(default=None, max_length=220)
    location: str | None = Field(default=None, max_length=120)
    description: str | None = None
    logo_url: str | None = Field(default=None, max_length=1000)
    started_on: date | None = None
    ended_on: date | None = None
    is_current: bool = False
    sort_order: int = 0
    publish_status: PublishStatus = "draft"
    is_placeholder: bool = False

    @field_validator("logo_url")
    @classmethod
    def _validate_logo(cls, value: str | None) -> str | None:
        return _validate_asset(value)


class ExperienceAdminOut(ORMModel):
    id: uuid.UUID
    organization: str
    title: str
    slug: str | None
    location: str | None
    description: str | None
    logo_url: str | None
    started_on: date | None
    ended_on: date | None
    is_current: bool
    sort_order: int
    status: str
    is_placeholder: bool
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime


class LeadershipInput(BaseModel):
    organization: str = Field(min_length=1, max_length=160)
    title: str = Field(min_length=1, max_length=160)
    slug: str | None = Field(default=None, max_length=220)
    description: str | None = None
    contribution: str | None = None
    outcome: str | None = None
    started_on: date | None = None
    ended_on: date | None = None
    url: str | None = Field(default=None, max_length=500)
    image_url: str | None = Field(default=None, max_length=1000)
    sort_order: int = 0
    publish_status: PublishStatus = "draft"
    is_placeholder: bool = False

    @model_validator(mode="after")
    def _validate_url(self) -> "LeadershipInput":
        if self.url:
            parsed = urlparse(self.url.strip())
            if parsed.scheme not in {"http", "https"} or not parsed.netloc:
                raise ValueError("Enter a full URL starting with http:// or https://.")
        return self

    @field_validator("image_url")
    @classmethod
    def _validate_image(cls, value: str | None) -> str | None:
        return _validate_asset(value)


class LeadershipAdminOut(ORMModel):
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
    sort_order: int
    status: str
    is_placeholder: bool
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime
