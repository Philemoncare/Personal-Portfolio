"""Visitor analytics parsing, tracking, aggregation, and cleanup service."""

from __future__ import annotations

import hashlib
import re
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import urlparse

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.time import now_utc
from app.models.analytics import AnalyticsVisit
from app.schemas.analytics import (
    AnalyticsCollectRequest,
    AnalyticsDevicesOut,
    AnalyticsLocationsOut,
    AnalyticsOverviewOut,
    AnalyticsPagesOut,
    AnalyticsRecentOut,
    AnalyticsSourcesOut,
    AnalyticsTrendsOut,
    DeviceStat,
    LocationStat,
    MostViewedPageOut,
    PageStat,
    RecentVisitOut,
    SourceStat,
    TrendBucket,
)

# Known bot patterns in User-Agent header
BOT_KEYWORDS = (
    "bot", "crawler", "spider", "slurp", "lighthouse", "headless",
    "googlebot", "bingbot", "duckduckbot", "yandexbot", "facebookexternalhit",
    "twitterbot", "linkedinbot", "embedly", "baiduspider", "python-requests",
    "httpx", "curl", "wget", "postman", "go-http-client", "axios", "uptime",
)

IGNORED_PATH_PREFIXES = (
    "/api/",
    "/admin/",
    "/health",
    "/media/",
    "/docs",
    "/openapi.json",
    "/favicon.ico",
)

IGNORED_PATH_EXTENSIONS = (
    ".js", ".css", ".png", ".jpg", ".jpeg", ".gif", ".svg",
    ".ico", ".woff", ".woff2", ".ttf", ".map", ".json",
)


def parse_user_agent(ua: str | None) -> dict[str, Any]:
    if not ua:
        return {"is_bot": False, "device_type": "Desktop", "browser": "Unknown", "os": "Unknown"}

    ua_lower = ua.lower()
    is_bot = any(keyword in ua_lower for keyword in BOT_KEYWORDS)

    # Device detection
    if any(k in ua_lower for k in ("ipad", "tablet", "kindle", "playbook")):
        device_type = "Tablet"
    elif any(k in ua_lower for k in ("mobile", "android", "iphone", "ipod", "blackberry", "windows phone")):
        device_type = "Mobile"
    else:
        device_type = "Desktop"

    # Browser detection
    if "edg/" in ua_lower or "edge/" in ua_lower:
        browser = "Edge"
    elif "chrome/" in ua_lower or "crios/" in ua_lower:
        browser = "Chrome"
    elif "firefox/" in ua_lower or "fxios/" in ua_lower:
        browser = "Firefox"
    elif "safari/" in ua_lower and "chrome/" not in ua_lower:
        browser = "Safari"
    elif "opera/" in ua_lower or "opr/" in ua_lower:
        browser = "Opera"
    else:
        browser = "Other"

    # Operating System detection
    if "windows" in ua_lower:
        os_name = "Windows"
    elif "macintosh" in ua_lower or "mac os" in ua_lower:
        os_name = "macOS"
    elif "android" in ua_lower:
        os_name = "Android"
    elif "iphone" in ua_lower or "ipad" in ua_lower or "ipod" in ua_lower:
        os_name = "iOS"
    elif "linux" in ua_lower:
        os_name = "Linux"
    elif "cros" in ua_lower:
        os_name = "Chrome OS"
    else:
        os_name = "Other"

    return {
        "is_bot": is_bot,
        "device_type": device_type,
        "browser": browser,
        "os": os_name,
    }


def parse_referrer(referrer: str | None, current_host: str | None = None) -> str:
    if not referrer or not referrer.strip():
        return "Unknown / Direct"

    ref = referrer.strip().lower()

    if current_host and current_host.lower() in ref:
        return "Direct"

    try:
        parsed = urlparse(ref)
        domain = parsed.netloc or parsed.path
    except Exception:
        return "Unknown / Direct"

    if not domain:
        return "Unknown / Direct"

    if "google." in domain:
        return "Google"
    if "github.com" in domain:
        return "GitHub"
    if "linkedin.com" in domain or "lnkd.in" in domain:
        return "LinkedIn"
    if "twitter.com" in domain or "t.co" in domain or "x.com" in domain:
        return "Twitter / X"
    if "facebook.com" in domain or "fb.me" in domain:
        return "Facebook"
    if "instagram.com" in domain:
        return "Instagram"
    if "reddit.com" in domain:
        return "Reddit"
    if "youtube.com" in domain or "youtu.be" in domain:
        return "YouTube"

    return f"Referral: {domain.replace('www.', '')}"


def resolve_country_from_headers(headers: dict[str, str]) -> tuple[str, str | None]:
    # Check standard cloud proxy headers for geographic coarse information
    country_code = (
        headers.get("cf-ipcountry")
        or headers.get("x-country-code")
        or headers.get("cloudfront-viewer-country")
        or headers.get("x-appengine-country")
    )
    if country_code and len(country_code) == 2 and country_code.upper() != "XX":
        code = country_code.upper()
        # Common ISO country code mapping
        names = {
            "GH": "Ghana",
            "NG": "Nigeria",
            "US": "United States",
            "GB": "United Kingdom",
            "CA": "Canada",
            "DE": "Germany",
            "FR": "France",
            "IN": "India",
            "KE": "Kenya",
            "ZA": "South Africa",
            "AU": "Australia",
            "BR": "Brazil",
            "NL": "Netherlands",
        }
        return names.get(code, f"Country ({code})"), code

    return "Unknown", None


def is_public_trackable_path(path: str) -> bool:
    clean = path.strip()
    if not clean.startswith("/"):
        return False
    clean_lower = clean.lower()

    if any(clean_lower.startswith(prefix) for prefix in IGNORED_PATH_PREFIXES):
        return False

    if any(clean_lower.endswith(ext) for ext in IGNORED_PATH_EXTENSIONS):
        return False

    return True


def record_visit(
    db: Session,
    payload: AnalyticsCollectRequest,
    user_agent: str | None,
    headers: dict[str, str],
) -> bool:
    if not is_public_trackable_path(payload.path):
        return False

    ua_meta = parse_user_agent(user_agent)
    if ua_meta["is_bot"]:
        return False

    host = headers.get("host")
    referrer_source = parse_referrer(payload.referrer, host)
    country, country_code = resolve_country_from_headers(headers)

    # Hash user agent for lightweight privacy tracking
    ua_hash = (
        hashlib.sha256(user_agent.encode("utf-8")).hexdigest()[:16]
        if user_agent
        else None
    )

    visitor_id = (payload.visitor_id or "").strip()
    session_id = (payload.session_id or "").strip()

    if not visitor_id:
        # Fallback pseudonymous visitor hash derived from user agent and session
        visitor_id = hashlib.sha256(
            f"{ua_hash}-{headers.get('accept-language', '')}".encode("utf-8")
        ).hexdigest()[:32]

    if not session_id:
        session_id = visitor_id

    visit = AnalyticsVisit(
        visitor_id=visitor_id[:64],
        session_id=session_id[:64],
        path=payload.path[:255],
        title=(payload.title or "")[:255] if payload.title else None,
        referrer=(payload.referrer or "")[:500] if payload.referrer else None,
        referrer_source=referrer_source[:50],
        device_type=ua_meta["device_type"],
        browser=ua_meta["browser"],
        os=ua_meta["os"],
        country=country[:100],
        country_code=country_code,
        user_agent_hash=ua_hash,
        timestamp=now_utc(),
    )

    db.add(visit)
    db.commit()
    return True


def _period_start(period: str) -> datetime:
    now = now_utc()
    if period == "today":
        return datetime(now.year, now.month, now.day, tzinfo=UTC)
    if period == "7d":
        return now - timedelta(days=7)
    if period == "30d":
        return now - timedelta(days=30)
    if period == "12m":
        return now - timedelta(days=365)
    return now - timedelta(days=30)


def get_overview(
    db: Session,
    period: str = "30d",
    start_date: datetime | None = None,
    end_date: datetime | None = None,
) -> AnalyticsOverviewOut:
    now = now_utc()
    today_start = datetime(now.year, now.month, now.day, tzinfo=UTC)
    week_start = now - timedelta(days=7)
    month_start = now - timedelta(days=30)

    # Quick counters
    v_today = int(
        db.scalar(
            select(func.count(func.distinct(AnalyticsVisit.visitor_id))).where(
                AnalyticsVisit.timestamp >= today_start
            )
        )
        or 0
    )
    v_week = int(
        db.scalar(
            select(func.count(func.distinct(AnalyticsVisit.visitor_id))).where(
                AnalyticsVisit.timestamp >= week_start
            )
        )
        or 0
    )
    v_month = int(
        db.scalar(
            select(func.count(func.distinct(AnalyticsVisit.visitor_id))).where(
                AnalyticsVisit.timestamp >= month_start
            )
        )
        or 0
    )
    v_total = int(
        db.scalar(select(func.count(func.distinct(AnalyticsVisit.visitor_id)))) or 0
    )

    # Period filtered scope
    p_start = start_date or _period_start(period)
    p_end = end_date or now

    unique_v = int(
        db.scalar(
            select(func.count(func.distinct(AnalyticsVisit.visitor_id))).where(
                AnalyticsVisit.timestamp >= p_start, AnalyticsVisit.timestamp <= p_end
            )
        )
        or 0
    )

    total_visits = int(
        db.scalar(
            select(func.count(func.distinct(AnalyticsVisit.session_id))).where(
                AnalyticsVisit.timestamp >= p_start, AnalyticsVisit.timestamp <= p_end
            )
        )
        or 0
    )

    page_views = int(
        db.scalar(
            select(func.count(AnalyticsVisit.id)).where(
                AnalyticsVisit.timestamp >= p_start, AnalyticsVisit.timestamp <= p_end
            )
        )
        or 0
    )

    # Most viewed page
    most_viewed_row = db.execute(
        select(AnalyticsVisit.path, func.count(AnalyticsVisit.id).label("views"))
        .where(AnalyticsVisit.timestamp >= p_start, AnalyticsVisit.timestamp <= p_end)
        .group_by(AnalyticsVisit.path)
        .order_by(func.count(AnalyticsVisit.id).desc())
        .limit(1)
    ).first()

    most_viewed = (
        MostViewedPageOut(path=most_viewed_row.path, views=most_viewed_row.views)
        if most_viewed_row
        else None
    )

    # Active visitors in last 5 minutes
    five_mins_ago = now - timedelta(minutes=5)
    active_now = int(
        db.scalar(
            select(func.count(func.distinct(AnalyticsVisit.visitor_id))).where(
                AnalyticsVisit.timestamp >= five_mins_ago
            )
        )
        or 0
    )

    last_visit = db.scalar(
        select(AnalyticsVisit.timestamp).order_by(AnalyticsVisit.timestamp.desc()).limit(1)
    )

    return AnalyticsOverviewOut(
        visitors_today=v_today,
        visitors_this_week=v_week,
        visitors_this_month=v_month,
        total_visitors=v_total,
        unique_visitors=unique_v,
        total_visits=total_visits,
        page_views=page_views,
        most_viewed_page=most_viewed,
        active_now=active_now,
        last_visit_at=last_visit,
    )


def get_trends(db: Session, period: str = "7d") -> AnalyticsTrendsOut:
    now = now_utc()
    buckets: list[TrendBucket] = []

    if period == "today":
        today_start = datetime(now.year, now.month, now.day, tzinfo=UTC)
        for hour in range(24):
            b_start = today_start + timedelta(hours=hour)
            b_end = b_start + timedelta(hours=1)
            p_views = int(
                db.scalar(
                    select(func.count(AnalyticsVisit.id)).where(
                        AnalyticsVisit.timestamp >= b_start,
                        AnalyticsVisit.timestamp < b_end,
                    )
                )
                or 0
            )
            u_visitors = int(
                db.scalar(
                    select(func.count(func.distinct(AnalyticsVisit.visitor_id))).where(
                        AnalyticsVisit.timestamp >= b_start,
                        AnalyticsVisit.timestamp < b_end,
                    )
                )
                or 0
            )
            visits = int(
                db.scalar(
                    select(func.count(func.distinct(AnalyticsVisit.session_id))).where(
                        AnalyticsVisit.timestamp >= b_start,
                        AnalyticsVisit.timestamp < b_end,
                    )
                )
                or 0
            )
            label = f"{hour:02d}:00"
            buckets.append(
                TrendBucket(
                    label=label,
                    timestamp=b_start.isoformat(),
                    visits=visits,
                    unique_visitors=u_visitors,
                    page_views=p_views,
                )
            )

    elif period in ("7d", "30d"):
        num_days = 7 if period == "7d" else 30
        today_start = datetime(now.year, now.month, now.day, tzinfo=UTC)
        for d in range(num_days - 1, -1, -1):
            b_start = today_start - timedelta(days=d)
            b_end = b_start + timedelta(days=1)
            p_views = int(
                db.scalar(
                    select(func.count(AnalyticsVisit.id)).where(
                        AnalyticsVisit.timestamp >= b_start,
                        AnalyticsVisit.timestamp < b_end,
                    )
                )
                or 0
            )
            u_visitors = int(
                db.scalar(
                    select(func.count(func.distinct(AnalyticsVisit.visitor_id))).where(
                        AnalyticsVisit.timestamp >= b_start,
                        AnalyticsVisit.timestamp < b_end,
                    )
                )
                or 0
            )
            visits = int(
                db.scalar(
                    select(func.count(func.distinct(AnalyticsVisit.session_id))).where(
                        AnalyticsVisit.timestamp >= b_start,
                        AnalyticsVisit.timestamp < b_end,
                    )
                )
                or 0
            )
            label = b_start.strftime("%b %d")
            buckets.append(
                TrendBucket(
                    label=label,
                    timestamp=b_start.isoformat(),
                    visits=visits,
                    unique_visitors=u_visitors,
                    page_views=p_views,
                )
            )

    elif period == "12m":
        curr_month = datetime(now.year, now.month, 1, tzinfo=UTC)
        for m in range(11, -1, -1):
            # Calculate month start
            y = curr_month.year
            mo = curr_month.month - m
            while mo <= 0:
                mo += 12
                y -= 1
            b_start = datetime(y, mo, 1, tzinfo=UTC)
            if mo == 12:
                b_end = datetime(y + 1, 1, 1, tzinfo=UTC)
            else:
                b_end = datetime(y, mo + 1, 1, tzinfo=UTC)

            p_views = int(
                db.scalar(
                    select(func.count(AnalyticsVisit.id)).where(
                        AnalyticsVisit.timestamp >= b_start,
                        AnalyticsVisit.timestamp < b_end,
                    )
                )
                or 0
            )
            u_visitors = int(
                db.scalar(
                    select(func.count(func.distinct(AnalyticsVisit.visitor_id))).where(
                        AnalyticsVisit.timestamp >= b_start,
                        AnalyticsVisit.timestamp < b_end,
                    )
                )
                or 0
            )
            visits = int(
                db.scalar(
                    select(func.count(func.distinct(AnalyticsVisit.session_id))).where(
                        AnalyticsVisit.timestamp >= b_start,
                        AnalyticsVisit.timestamp < b_end,
                    )
                )
                or 0
            )
            label = b_start.strftime("%b %Y")
            buckets.append(
                TrendBucket(
                    label=label,
                    timestamp=b_start.isoformat(),
                    visits=visits,
                    unique_visitors=u_visitors,
                    page_views=p_views,
                )
            )

    return AnalyticsTrendsOut(period=period, buckets=buckets)


def get_pages(db: Session, period: str = "30d", limit: int = 20) -> AnalyticsPagesOut:
    p_start = _period_start(period)

    total_pages = int(
        db.scalar(
            select(func.count(func.distinct(AnalyticsVisit.path))).where(
                AnalyticsVisit.timestamp >= p_start
            )
        )
        or 0
    )

    rows = db.execute(
        select(
            AnalyticsVisit.path,
            func.max(AnalyticsVisit.title).label("title"),
            func.count(AnalyticsVisit.id).label("views"),
            func.count(func.distinct(AnalyticsVisit.visitor_id)).label("unique_visitors"),
        )
        .where(AnalyticsVisit.timestamp >= p_start)
        .group_by(AnalyticsVisit.path)
        .order_by(func.count(AnalyticsVisit.id).desc())
        .limit(limit)
    ).all()

    items = [
        PageStat(
            path=row.path,
            title=row.title,
            views=row.views,
            unique_visitors=row.unique_visitors,
        )
        for row in rows
    ]

    return AnalyticsPagesOut(items=items, total_pages=total_pages)


def get_sources(db: Session, period: str = "30d") -> AnalyticsSourcesOut:
    p_start = _period_start(period)

    total = int(
        db.scalar(
            select(func.count(AnalyticsVisit.id)).where(
                AnalyticsVisit.timestamp >= p_start
            )
        )
        or 0
    )

    if total == 0:
        return AnalyticsSourcesOut(items=[])

    rows = db.execute(
        select(
            AnalyticsVisit.referrer_source,
            func.count(AnalyticsVisit.id).label("cnt"),
        )
        .where(AnalyticsVisit.timestamp >= p_start)
        .group_by(AnalyticsVisit.referrer_source)
        .order_by(func.count(AnalyticsVisit.id).desc())
    ).all()

    items = [
        SourceStat(
            source=row.referrer_source,
            count=row.cnt,
            percentage=round((row.cnt / total) * 100, 1),
        )
        for row in rows
    ]

    return AnalyticsSourcesOut(items=items)


def get_devices(db: Session, period: str = "30d") -> AnalyticsDevicesOut:
    p_start = _period_start(period)

    total = int(
        db.scalar(
            select(func.count(AnalyticsVisit.id)).where(
                AnalyticsVisit.timestamp >= p_start
            )
        )
        or 0
    )

    if total == 0:
        return AnalyticsDevicesOut(device_types=[], browsers=[], os_list=[])

    def _stats_for_column(col) -> list[DeviceStat]:
        rows = db.execute(
            select(col, func.count(AnalyticsVisit.id).label("cnt"))
            .where(AnalyticsVisit.timestamp >= p_start)
            .group_by(col)
            .order_by(func.count(AnalyticsVisit.id).desc())
        ).all()
        return [
            DeviceStat(
                name=row[0] or "Unknown",
                count=row.cnt,
                percentage=round((row.cnt / total) * 100, 1),
            )
            for row in rows
        ]

    return AnalyticsDevicesOut(
        device_types=_stats_for_column(AnalyticsVisit.device_type),
        browsers=_stats_for_column(AnalyticsVisit.browser),
        os_list=_stats_for_column(AnalyticsVisit.os),
    )


def get_locations(db: Session, period: str = "30d") -> AnalyticsLocationsOut:
    p_start = _period_start(period)

    total = int(
        db.scalar(
            select(func.count(AnalyticsVisit.id)).where(
                AnalyticsVisit.timestamp >= p_start
            )
        )
        or 0
    )

    if total == 0:
        return AnalyticsLocationsOut(items=[])

    rows = db.execute(
        select(
            AnalyticsVisit.country,
            func.max(AnalyticsVisit.country_code).label("country_code"),
            func.count(AnalyticsVisit.id).label("cnt"),
        )
        .where(AnalyticsVisit.timestamp >= p_start)
        .group_by(AnalyticsVisit.country)
        .order_by(func.count(AnalyticsVisit.id).desc())
    ).all()

    items = [
        LocationStat(
            country=row.country,
            country_code=row.country_code,
            count=row.cnt,
            percentage=round((row.cnt / total) * 100, 1),
        )
        for row in rows
    ]

    return AnalyticsLocationsOut(items=items)


def get_recent(db: Session, limit: int = 20) -> AnalyticsRecentOut:
    now = now_utc()
    five_mins_ago = now - timedelta(minutes=5)

    active_now = int(
        db.scalar(
            select(func.count(func.distinct(AnalyticsVisit.visitor_id))).where(
                AnalyticsVisit.timestamp >= five_mins_ago
            )
        )
        or 0
    )

    rows = db.scalars(
        select(AnalyticsVisit)
        .order_by(AnalyticsVisit.timestamp.desc())
        .limit(limit)
    ).all()

    items = [
        RecentVisitOut(
            id=row.id,
            path=row.path,
            title=row.title,
            referrer_source=row.referrer_source,
            device_type=row.device_type,
            browser=row.browser,
            os=row.os,
            country=row.country,
            timestamp=row.timestamp,
        )
        for row in rows
    ]

    return AnalyticsRecentOut(items=items, active_now=active_now)


def cleanup_old_visits(db: Session, retention_days: int = 90) -> int:
    cutoff = now_utc() - timedelta(days=retention_days)
    old_visits = db.scalars(
        select(AnalyticsVisit).where(AnalyticsVisit.timestamp < cutoff)
    ).all()
    count = len(old_visits)
    for visit in old_visits:
        db.delete(visit)
    db.commit()
    return count
