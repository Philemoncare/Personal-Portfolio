"""Unit tests for public analytics collection and admin reporting."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.analytics import AnalyticsVisit


def test_public_collect_endpoint(client: TestClient, db_session: Session):
    response = client.post(
        "/api/v1/analytics/collect",
        json={
            "path": "/work",
            "title": "Work - Personal Portfolio",
            "referrer": "https://google.com",
            "visitor_id": "test_visitor_123",
            "session_id": "test_session_456",
        },
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"},
    )
    assert response.status_code == 200
    assert response.json()["recorded"] is True

    visit = db_session.query(AnalyticsVisit).filter_by(visitor_id="test_visitor_123").first()
    assert visit is not None
    assert visit.path == "/work"
    assert visit.referrer_source == "Google"
    assert visit.device_type == "Desktop"


def test_public_collect_ignores_bots(client: TestClient, db_session: Session):
    response = client.post(
        "/api/v1/analytics/collect",
        json={"path": "/about", "visitor_id": "bot_visitor_999"},
        headers={"User-Agent": "Googlebot/2.1 (+http://www.google.com/bot.html)"},
    )
    assert response.status_code == 200
    assert response.json()["recorded"] is False

    visit = db_session.query(AnalyticsVisit).filter_by(visitor_id="bot_visitor_999").first()
    assert visit is None


def test_public_collect_ignores_admin_paths(client: TestClient, db_session: Session):
    response = client.post(
        "/api/v1/analytics/collect",
        json={"path": "/admin/dashboard", "visitor_id": "admin_path_visitor"},
        headers={"User-Agent": "Mozilla/5.0"},
    )
    assert response.status_code == 200
    assert response.json()["recorded"] is False


def test_admin_analytics_auth_protection(client: TestClient):
    response = client.get("/api/v1/admin/analytics/overview")
    assert response.status_code == 401


def test_admin_analytics_reporting(admin_client: TestClient, client: TestClient):
    # Record a couple of visits
    client.post(
        "/api/v1/analytics/collect",
        json={"path": "/", "visitor_id": "v1", "session_id": "s1", "referrer": "https://github.com"},
        headers={"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)"},
    )
    client.post(
        "/api/v1/analytics/collect",
        json={"path": "/articles", "visitor_id": "v2", "session_id": "s2", "referrer": "https://linkedin.com"},
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0)"},
    )

    overview = admin_client.get("/api/v1/admin/analytics/overview?period=7d")
    assert overview.status_code == 200
    data = overview.json()
    assert data["unique_visitors"] >= 2
    assert data["page_views"] >= 2

    trends = admin_client.get("/api/v1/admin/analytics/trends?period=7d")
    assert trends.status_code == 200
    assert len(trends.json()["buckets"]) == 7

    pages = admin_client.get("/api/v1/admin/analytics/pages?period=7d")
    assert pages.status_code == 200
    assert len(pages.json()["items"]) >= 1

    sources = admin_client.get("/api/v1/admin/analytics/sources?period=7d")
    assert sources.status_code == 200
    source_names = [s["source"] for s in sources.json()["items"]]
    assert "GitHub" in source_names or "LinkedIn" in source_names

    devices = admin_client.get("/api/v1/admin/analytics/devices?period=7d")
    assert devices.status_code == 200
    d_names = [d["name"] for d in devices.json()["device_types"]]
    assert "Mobile" in d_names or "Desktop" in d_names

    recent = admin_client.get("/api/v1/admin/analytics/recent")
    assert recent.status_code == 200
    assert len(recent.json()["items"]) >= 2
