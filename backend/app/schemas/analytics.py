"""Schemas for visitor analytics collection and reporting."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class AnalyticsCollectRequest(BaseModel):
    path: str = Field(..., min_length=1, max_length=255)
    title: str | None = Field(default=None, max_length=255)
    referrer: str | None = Field(default=None, max_length=500)
    visitor_id: str | None = Field(default=None, max_length=64)
    session_id: str | None = Field(default=None, max_length=64)


class AnalyticsCollectResponse(BaseModel):
    recorded: bool = True


class MostViewedPageOut(BaseModel):
    path: str
    views: int


class AnalyticsOverviewOut(BaseModel):
    visitors_today: int
    visitors_this_week: int
    visitors_this_month: int
    total_visitors: int
    unique_visitors: int
    total_visits: int
    page_views: int
    most_viewed_page: MostViewedPageOut | None = None
    active_now: int
    last_visit_at: datetime | None = None


class TrendBucket(BaseModel):
    label: str
    timestamp: str
    visits: int
    unique_visitors: int
    page_views: int


class AnalyticsTrendsOut(BaseModel):
    period: str
    buckets: list[TrendBucket]


class PageStat(BaseModel):
    path: str
    title: str | None = None
    views: int
    unique_visitors: int


class AnalyticsPagesOut(BaseModel):
    items: list[PageStat]
    total_pages: int


class SourceStat(BaseModel):
    source: str
    count: int
    percentage: float


class AnalyticsSourcesOut(BaseModel):
    items: list[SourceStat]


class DeviceStat(BaseModel):
    name: str
    count: int
    percentage: float


class AnalyticsDevicesOut(BaseModel):
    device_types: list[DeviceStat]
    browsers: list[DeviceStat]
    os_list: list[DeviceStat]


class LocationStat(BaseModel):
    country: str
    country_code: str | None = None
    count: int
    percentage: float


class AnalyticsLocationsOut(BaseModel):
    items: list[LocationStat]


class RecentVisitOut(BaseModel):
    id: uuid.UUID
    path: str
    title: str | None = None
    referrer_source: str
    device_type: str
    browser: str
    os: str
    country: str
    timestamp: datetime


class AnalyticsRecentOut(BaseModel):
    items: list[RecentVisitOut]
    active_now: int


class AnalyticsCleanupOut(BaseModel):
    deleted_count: int
    message: str
