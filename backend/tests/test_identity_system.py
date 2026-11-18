from datetime import date
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import (
    ContactMessage,
    LeadershipEntry,
    NowItem,
    Resume,
    SiteProfile,
    SiteSettings,
    TimelineEntry,
)


def _seed_profile(db: Session) -> SiteProfile:
    profile = SiteProfile(
        id=1,
        name="Test Person",
        display_name="Test",
        professional_title="Developer",
        short_bio="Short bio",
        long_bio="Long bio",
        what_i_build="Builds things",
        how_i_work="Works carefully",
        current_direction="Direction",
        personal_interests="Interests",
        location="Remote",
        email="person@example.com",
        availability="Open",
        is_placeholder=False,
    )
    db.add(profile)
    db.add(
        SiteSettings(
            id=1,
            site_name="Test Site",
            site_description="Site description",
            wordmark="Test",
            seo_title="Test SEO",
            seo_description="Test SEO description",
            is_placeholder=False,
        )
    )
    db.commit()
    return profile


def test_public_profile_and_settings(client: TestClient, db_session: Session) -> None:
    _seed_profile(db_session)

    profile = client.get("/api/v1/profile")
    assert profile.status_code == 200
    body = profile.json()
    assert body["display_name"] == "Test"
    assert body["email"] == "person@example.com"
    assert body["current_resume"] is None

    public = client.get("/api/v1/site-settings/public")
    assert public.status_code == 200
    settings_body = public.json()
    assert settings_body["display_name"] == "Test"
    assert settings_body["role_title"] == "Developer"
    assert settings_body["resume_available"] is False
    assert settings_body["contact_delivery"] == "stored_only"


def test_profile_endpoint_404_when_unconfigured(client: TestClient) -> None:
    assert client.get("/api/v1/profile").status_code == 404
    assert client.get("/api/v1/site-settings/public").status_code == 404


def test_now_only_returns_active_published_items(
    client: TestClient, db_session: Session
) -> None:
    db_session.add_all(
        [
            NowItem(
                title="Visible build",
                category="building",
                item_status="active",
                active=True,
                status="published",
                priority=5,
                sort_order=10,
            ),
            NowItem(
                title="Draft build",
                category="building",
                item_status="active",
                active=True,
                status="draft",
                sort_order=20,
            ),
            NowItem(
                title="Paused reading",
                category="reading",
                item_status="paused",
                active=False,
                status="published",
                sort_order=30,
            ),
        ]
    )
    db_session.commit()

    response = client.get("/api/v1/now")
    assert response.status_code == 200
    titles = [item["title"] for item in response.json()]
    assert titles == ["Visible build"]
    assert response.json()[0]["category"] == "building"
    assert response.json()[0]["status"] == "active"

    filtered = client.get("/api/v1/now?category=reading")
    assert filtered.status_code == 200
    assert filtered.json() == []


def test_timeline_visibility_and_detail(client: TestClient, db_session: Session) -> None:
    entry = TimelineEntry(
        slug="first-milestone",
        year=2026,
        month=3,
        start_date=date(2026, 3, 1),
        kind="technical",
        title="First milestone",
        summary="Summary",
        status="published",
        display_order=10,
    )
    draft = TimelineEntry(
        slug="hidden-milestone",
        year=2026,
        start_date=date(2026, 4, 1),
        kind="milestone",
        title="Hidden milestone",
        status="draft",
    )
    db_session.add_all([entry, draft])
    db_session.commit()

    response = client.get("/api/v1/timeline")
    assert response.status_code == 200
    titles = [item["title"] for item in response.json()]
    assert titles == ["First milestone"]

    detail = client.get("/api/v1/timeline/first-milestone")
    assert detail.status_code == 200
    assert detail.json()["kind"] == "technical"

    assert client.get("/api/v1/timeline/hidden-milestone").status_code == 404


def test_experience_and_leadership_slug_detail(
    client: TestClient, db_session: Session
) -> None:
    db_session.add(
        LeadershipEntry(
            organization="Community",
            title="Lead role",
            slug="lead-role",
            description="Description",
            status="published",
        )
    )
    db_session.commit()

    response = client.get("/api/v1/leadership/lead-role")
    assert response.status_code == 200
    assert response.json()["organization"] == "Community"
    assert client.get("/api/v1/leadership/missing").status_code == 404


def test_search_index_is_published_only(client: TestClient, db_session: Session) -> None:
    _seed_profile(db_session)
    db_session.add_all(
        [
            TimelineEntry(
                slug="indexed",
                year=2026,
                start_date=date(2026, 1, 1),
                kind="milestone",
                title="Indexed",
                status="published",
            ),
            TimelineEntry(
                slug="draft-indexed",
                year=2026,
                start_date=date(2026, 2, 1),
                kind="milestone",
                title="Draft indexed",
                status="draft",
            ),
        ]
    )
    db_session.commit()

    response = client.get("/api/v1/search-index")
    assert response.status_code == 200
    payload = response.json()
    slugs = {entry["slug"] for entry in payload["entries"]}
    assert "indexed" in slugs
    assert "draft-indexed" not in slugs


def test_contact_persists_inquiry_type(client: TestClient, db_session: Session) -> None:
    response = client.post(
        "/api/v1/contact",
        json={
            "name": "Ada Lovelace",
            "email": "ada@example.com",
            "subject": "Collaboration",
            "inquiry_type": "project_collaboration",
            "message": "I would like to discuss a project with you.",
        },
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["stored"] is True
    assert body["email_delivery"] == "not_configured"

    message = db_session.scalar(select(ContactMessage))
    assert message is not None
    assert message.inquiry_type == "project_collaboration"
    assert message.status == "new"
    assert message.email_status == "not_configured"


def test_contact_rejects_invalid_inquiry_and_honeypot(client: TestClient) -> None:
    base = {
        "name": "Ada Lovelace",
        "email": "ada@example.com",
        "subject": "Collaboration",
        "message": "I would like to discuss a project with you.",
    }
    invalid = client.post(
        "/api/v1/contact", json={**base, "inquiry_type": "not-a-real-type"}
    )
    assert invalid.status_code == 422

    honeypot = client.post("/api/v1/contact", json={**base, "website": "spam"})
    assert honeypot.status_code == 422


@pytest.fixture()
def resume_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "resume_storage_dir", str(tmp_path))
    return tmp_path


def test_resume_upload_requires_admin(client: TestClient, resume_dir) -> None:
    response = client.post(
        "/api/v1/admin/resume",
        data={"title": "CV", "version_label": "v1", "publish_status": "published"},
        files={"file": ("cv.pdf", b"%PDF-1.4 test", "application/pdf")},
    )
    assert response.status_code == 401


def test_resume_upload_accepts_pdf_and_serves_download(
    admin_client: TestClient, db_session: Session, resume_dir
) -> None:
    response = admin_client.post(
        "/api/v1/admin/resume",
        data={
            "title": "CV",
            "version_label": "v1",
            "publish_status": "published",
            "is_current": "true",
        },
        files={"file": ("cv.pdf", b"%PDF-1.4 test body", "application/pdf")},
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert "storage_path" not in body
    assert body["mime_type"] == "application/pdf"
    assert body["is_current"] is True

    # The stored reference must be a server-generated file name, never an
    # absolute path that leaks the filesystem layout.
    stored = db_session.execute(select(Resume)).scalars().one()
    assert stored.storage_path == Path(stored.storage_path).name
    assert ":" not in stored.storage_path and "\\" not in stored.storage_path
    assert (resume_dir / stored.storage_path).is_file()

    download = admin_client.get(body["download_url"])
    assert download.status_code == 200
    assert download.headers["content-type"].startswith("application/pdf")
    assert download.content.startswith(b"%PDF-")

    public = admin_client.get("/api/v1/resume/current")
    assert public.status_code == 200
    assert public.json()["version_label"] == "v1"


def test_resume_upload_rejects_non_pdf_and_wrong_magic(
    admin_client: TestClient, resume_dir
) -> None:
    exe = admin_client.post(
        "/api/v1/admin/resume",
        data={"title": "CV", "version_label": "v1"},
        files={
            "file": (
                "malware.exe",
                b"MZ\x90\x00",
                "application/octet-stream",
            )
        },
    )
    assert exe.status_code == 400

    fake = admin_client.post(
        "/api/v1/admin/resume",
        data={"title": "CV", "version_label": "v1"},
        files={"file": ("cv.pdf", b"not really a pdf", "application/pdf")},
    )
    assert fake.status_code == 400

    traversal = admin_client.post(
        "/api/v1/admin/resume",
        data={"title": "CV", "version_label": "v1"},
        files={"file": ("../cv.pdf", b"%PDF-1.4", "application/pdf")},
    )
    assert traversal.status_code == 400


def test_admin_settings_updates_profile_and_global_fields(
    admin_client: TestClient, db_session: Session
) -> None:
    _seed_profile(db_session)

    current = admin_client.get("/api/v1/admin/settings")
    assert current.status_code == 200
    payload = current.json()

    payload["profile"].update(
        {
            "name": "Renamed Person",
            "display_name": "Renamed",
            "professional_title": "Engineer",
            "short_bio": "New bio",
            "personal_interests": "Reading",
            "is_placeholder": False,
        }
    )
    payload["site"].update(
        {
            "site_name": "Renamed Site",
            "wordmark": "Renamed",
            "seo_title": "New SEO",
            "footer_text": "Footer copy",
        }
    )

    response = admin_client.put("/api/v1/admin/settings", json=payload)
    assert response.status_code == 200, response.text
    updated = response.json()
    assert updated["profile"]["display_name"] == "Renamed"
    assert updated["profile"]["personal_interests"] == "Reading"
    assert updated["site"]["site_name"] == "Renamed Site"

    db_session.expire_all()
    profile = db_session.get(SiteProfile, 1)
    settings_row = db_session.get(SiteSettings, 1)
    assert profile is not None and profile.display_name == "Renamed"
    assert settings_row is not None and settings_row.footer_text == "Footer copy"
    # Legacy identity columns stay aligned with the authoritative profile.
    assert settings_row.display_name == "Renamed"


def test_admin_message_status_lifecycle(
    admin_client: TestClient, db_session: Session
) -> None:
    for index in range(2):
        admin_client.post(
            "/api/v1/contact",
            json={
                "name": f"Sender {index}",
                "email": f"sender{index}@example.com",
                "subject": "Hello",
                "message": "A message long enough to pass validation.",
            },
        )

    listing = admin_client.get("/api/v1/admin/messages")
    assert listing.status_code == 200
    assert listing.json()["unread"] == 2

    message_id = listing.json()["items"][0]["id"]
    read = admin_client.patch(
        f"/api/v1/admin/messages/{message_id}/status", json={"status": "read"}
    )
    assert read.status_code == 200
    assert read.json()["read_at"] is not None

    replied = admin_client.patch(
        f"/api/v1/admin/messages/{message_id}/status", json={"status": "replied"}
    )
    assert replied.status_code == 200
    assert replied.json()["replied_at"] is not None

    deleted = admin_client.delete(f"/api/v1/admin/messages/{message_id}")
    assert deleted.status_code == 204
