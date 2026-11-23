"""Protected administrator analytics management and reporting endpoints."""

from __future__ import annotations

import csv
import io
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, Query, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.db.session import get_db
from app.models.analytics import AnalyticsVisit
from app.models.user import AdminUser
from app.schemas.analytics import (
    AnalyticsCleanupOut,
    AnalyticsDevicesOut,
    AnalyticsLocationsOut,
    AnalyticsOverviewOut,
    AnalyticsPagesOut,
    AnalyticsRecentOut,
    AnalyticsSourcesOut,
    AnalyticsTrendsOut,
)
from app.services import analytics as analytics_service

logger = logging.getLogger("portfolio.analytics.admin")

router = APIRouter(prefix="/analytics", tags=["admin:analytics"])


@router.get("/overview", response_model=AnalyticsOverviewOut)
def get_analytics_overview(
    period: str = Query(default="30d", pattern="^(today|7d|30d|12m)$"),
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AnalyticsOverviewOut:
    return analytics_service.get_overview(db, period=period)


@router.get("/trends", response_model=AnalyticsTrendsOut)
def get_analytics_trends(
    period: str = Query(default="7d", pattern="^(today|7d|30d|12m)$"),
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AnalyticsTrendsOut:
    return analytics_service.get_trends(db, period=period)


@router.get("/pages", response_model=AnalyticsPagesOut)
def get_analytics_pages(
    period: str = Query(default="30d", pattern="^(today|7d|30d|12m)$"),
    limit: int = Query(default=20, ge=1, le=100),
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AnalyticsPagesOut:
    return analytics_service.get_pages(db, period=period, limit=limit)


@router.get("/sources", response_model=AnalyticsSourcesOut)
def get_analytics_sources(
    period: str = Query(default="30d", pattern="^(today|7d|30d|12m)$"),
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AnalyticsSourcesOut:
    return analytics_service.get_sources(db, period=period)


@router.get("/devices", response_model=AnalyticsDevicesOut)
def get_analytics_devices(
    period: str = Query(default="30d", pattern="^(today|7d|30d|12m)$"),
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AnalyticsDevicesOut:
    return analytics_service.get_devices(db, period=period)


@router.get("/locations", response_model=AnalyticsLocationsOut)
def get_analytics_locations(
    period: str = Query(default="30d", pattern="^(today|7d|30d|12m)$"),
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AnalyticsLocationsOut:
    return analytics_service.get_locations(db, period=period)


@router.get("/recent", response_model=AnalyticsRecentOut)
def get_analytics_recent(
    limit: int = Query(default=20, ge=1, le=100),
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AnalyticsRecentOut:
    return analytics_service.get_recent(db, limit=limit)


@router.post("/export")
def export_analytics(
    export_format: str = Query(default="csv", alias="format", pattern="^(csv|json)$"),
    period: str = Query(default="30d", pattern="^(today|7d|30d|12m)$"),
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> Response:
    p_start = analytics_service._period_start(period)
    rows = db.scalars(
        select(AnalyticsVisit)
        .where(AnalyticsVisit.timestamp >= p_start)
        .order_by(AnalyticsVisit.timestamp.desc())
        .limit(10000)
    ).all()

    if export_format == "json":
        data = [
            {
                "id": str(row.id),
                "timestamp": row.timestamp.isoformat(),
                "path": row.path,
                "title": row.title,
                "referrer_source": row.referrer_source,
                "device_type": row.device_type,
                "browser": row.browser,
                "os": row.os,
                "country": row.country,
            }
            for row in rows
        ]
        return Response(
            content=data,
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=analytics_{period}.json"},
        )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Timestamp", "Path", "Title", "Referrer Source", "Device Type", "Browser", "OS", "Country"
    ])
    for row in rows:
        writer.writerow([
            row.timestamp.isoformat(),
            row.path,
            row.title or "",
            row.referrer_source,
            row.device_type,
            row.browser,
            row.os,
            row.country,
        ])

    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=analytics_{period}.csv"},
    )


@router.delete("/cleanup", response_model=AnalyticsCleanupOut)
def cleanup_analytics(
    retention_days: int = Query(default=90, ge=1, le=365),
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AnalyticsCleanupOut:
    count = analytics_service.cleanup_old_visits(db, retention_days=retention_days)
    return AnalyticsCleanupOut(
        deleted_count=count,
        message=f"Purged {count} raw visit record(s) older than {retention_days} days.",
    )
