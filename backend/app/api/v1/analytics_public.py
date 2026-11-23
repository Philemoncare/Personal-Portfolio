"""Public visitor analytics ingestion route."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.core.rate_limit import SlidingWindowLimiter
from app.db.session import get_db
from app.schemas.analytics import AnalyticsCollectRequest, AnalyticsCollectResponse
from app.services import analytics as analytics_service

logger = logging.getLogger("portfolio.analytics")

router = APIRouter(prefix="/analytics", tags=["analytics:public"])

# Rate limit analytics collection to 120 hits per 5 minutes per IP
collect_limiter = SlidingWindowLimiter(limit=120, window_seconds=300)


@router.post(
    "/collect",
    response_model=AnalyticsCollectResponse,
    status_code=status.HTTP_200_OK,
)
def collect_visit(
    payload: AnalyticsCollectRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> AnalyticsCollectResponse:
    # Fail silently on rate limit or error to never break client rendering
    client_ip = request.client.host if request.client else "unknown"
    allowed, _ = collect_limiter.hit(client_ip)
    if not allowed:
        return AnalyticsCollectResponse(recorded=False)

    try:
        user_agent = request.headers.get("user-agent")
        headers = {k.lower(): v for k, v in request.headers.items()}
        recorded = analytics_service.record_visit(
            db, payload=payload, user_agent=user_agent, headers=headers
        )
        return AnalyticsCollectResponse(recorded=recorded)
    except Exception:
        logger.exception("Failed to record visitor analytics")
        return AnalyticsCollectResponse(recorded=False)
