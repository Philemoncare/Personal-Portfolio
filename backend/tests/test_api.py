from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ContactMessage


def test_health_live(client: TestClient) -> None:
    response = client.get("/health/live")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_empty_public_projects(client: TestClient) -> None:
    response = client.get("/api/v1/projects")
    assert response.status_code == 200
    assert response.json() == {"items": [], "total": 0, "limit": 20, "offset": 0}


def test_public_settings_not_configured(client: TestClient) -> None:
    response = client.get("/api/v1/site-settings/public")
    assert response.status_code == 404


def test_contact_validation(client: TestClient) -> None:
    response = client.post("/api/v1/contact", json={"name": "x"})
    assert response.status_code == 422


def test_contact_submission_persists(client: TestClient, db_session: Session) -> None:
    response = client.post(
        "/api/v1/contact",
        json={
            "name": "Test Visitor",
            "email": "visitor@example.com",
            "subject": "Project inquiry",
            "message": "This is a functional contact form test.",
            "website": "",
        },
    )
    assert response.status_code == 201
    assert response.json()["status"] == "received"
    stored = db_session.scalar(
        select(ContactMessage).where(ContactMessage.email == "visitor@example.com")
    )
    assert stored is not None
    assert stored.status == "new"


def test_admin_requires_authentication(client: TestClient) -> None:
    response = client.get("/api/v1/admin/overview")
    assert response.status_code == 401
