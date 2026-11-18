"""Publishing platform tests: deployment, social links, pages, media, messages."""

import io

from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy.orm import Session

from app.models import (
    ContactMessage,
    Project,
    ProjectCategory,
    SiteProfile,
    SiteSettings,
)
from app.services.github_metadata import parse_repository


def _image_bytes(color: str = "red", size: tuple[int, int] = (32, 24)) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", size, color).save(buffer, format="PNG")
    return buffer.getvalue()


def _category(db: Session) -> ProjectCategory:
    category = ProjectCategory(name="Web Development", slug="web")
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def _project(db: Session, category: ProjectCategory, **values) -> Project:
    project = Project(
        title=values.pop("title", "Signal Board"),
        slug=values.pop("slug", "signal-board"),
        summary="A deployment-aware project.",
        body="Overview.",
        category_id=category.id,
        primary_mode="build",
        project_status="completed",
        status="published",
        **values,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def _site(db: Session) -> None:
    db.add(SiteSettings(site_name="Phill", wordmark="Phill"))
    db.add(SiteProfile(name="Philemon Melabah", display_name="Phill"))
    db.commit()


def _project_payload(category_id: str, **values) -> dict:
    payload = {
        "title": "Signal Board",
        "category_id": category_id,
        "status": "published",
        "project_status": "completed",
        "summary": "A deployment-aware project.",
        "body": "Overview.",
    }
    payload.update(values)
    return payload


def test_project_deployment_fields_and_visibility(
    admin_client: TestClient, db_session: Session
) -> None:
    category = _category(db_session)

    created = admin_client.post(
        "/api/v1/admin/projects",
        json=_project_payload(
            str(category.id),
            github_url="https://github.com/example/signal-board",
            demo_url="https://demo.example.com",
            video_url="https://video.example.com/watch",
            deployment_provider="vercel",
            deployment_status="live",
            deployment_url="https://signal-board.example.com",
            embed_enabled=True,
            public_visibility=True,
            seo_title="Signal Board — case study",
            seo_description="How the board was built.",
            og_image="/media/signal-board.png",
        ),
    )
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["deployment_status"] == "live"
    assert body["embed_enabled"] is True
    assert body["github_url"].endswith("signal-board")

    public = admin_client.get("/api/v1/projects/signal-board")
    assert public.status_code == 200
    assert public.json()["deployment_provider"] == "vercel"
    assert public.json()["seo_title"] == "Signal Board — case study"

    hidden = admin_client.put(
        f"/api/v1/admin/projects/{body['id']}",
        json=_project_payload(
            str(category.id), status="published", public_visibility=False
        ),
    )
    assert hidden.status_code == 200, hidden.text
    assert admin_client.get("/api/v1/projects/signal-board").status_code == 404


def test_project_detail_includes_linked_case_study(
    admin_client: TestClient, db_session: Session
) -> None:
    category = _category(db_session)
    project = _project(db_session, category)
    created = admin_client.post(
        "/api/v1/admin/case-studies",
        json={
            "project_id": str(project.id),
            "title": "Signal Board case study",
            "slug": "signal-board-case-study",
            "status": "published",
            "problem": "Deployments were invisible to visitors.",
            "solution": "A live preview with an honest fallback.",
            "architecture": "Iframe checks in the browser.",
            "hidden_sections": ["research"],
        },
    )
    assert created.status_code == 201, created.text

    detail = admin_client.get("/api/v1/projects/signal-board")
    assert detail.status_code == 200
    payload = detail.json()
    assert payload["case_study_slug"] == "signal-board-case-study"
    assert payload["case_study"]["problem"].startswith("Deployments")
    assert payload["case_study"]["hidden_sections"] == ["research"]


def test_social_links_and_page_content_are_db_driven(
    admin_client: TestClient, db_session: Session
) -> None:
    _site(db_session)

    created = admin_client.post(
        "/api/v1/admin/social-links",
        json={
            "platform": "github",
            "label": "GitHub",
            "url": "https://github.com/phill",
            "handle": "@phill",
            "sort_order": 10,
            "is_visible": True,
        },
    )
    assert created.status_code == 201, created.text

    hidden = admin_client.post(
        "/api/v1/admin/social-links",
        json={
            "platform": "x",
            "label": "X",
            "url": "https://x.com/phill",
            "is_visible": False,
        },
    )
    assert hidden.status_code == 201, hidden.text

    public_links = admin_client.get("/api/v1/social-links").json()
    assert [item["platform"] for item in public_links] == ["github"]

    settings = admin_client.get("/api/v1/site-settings/public")
    assert settings.status_code == 200
    assert settings.json()["social_links"][0]["handle"] == "@phill"

    page = admin_client.put(
        "/api/v1/admin/pages/work",
        json={
            "eyebrow": "Selected work",
            "title": "Things that shipped",
            "description": "Real projects, real deployment state.",
            "seo_title": "Work — Philemon Melabah",
            "seo_description": "Selected product and data work.",
            "is_published": True,
        },
    )
    assert page.status_code == 200, page.text
    public_page = admin_client.get("/api/v1/pages/work")
    assert public_page.status_code == 200
    assert public_page.json()["title"] == "Things that shipped"

    pages = admin_client.get("/api/v1/pages").json()
    assert [item["page_key"] for item in pages] == ["work"]


def test_experience_and_leadership_admin_crud(
    admin_client: TestClient,
) -> None:
    experience = admin_client.post(
        "/api/v1/admin/experience",
        json={
            "organization": "Northstar Labs",
            "title": "Software Engineer",
            "started_on": "2024-01-01",
            "is_current": True,
            "publish_status": "published",
            "description": "Built internal tools.",
        },
    )
    assert experience.status_code == 201, experience.text
    assert experience.json()["status"] == "published"

    public = admin_client.get("/api/v1/experience")
    assert public.status_code == 200
    assert public.json()[0]["organization"] == "Northstar Labs"

    leadership = admin_client.post(
        "/api/v1/admin/leadership",
        json={
            "organization": "Campus Tech Society",
            "title": "Community Lead",
            "started_on": "2023-02-01",
            "publish_status": "published",
            "contribution": "Ran weekly sessions.",
        },
    )
    assert leadership.status_code == 201, leadership.text
    public_leadership = admin_client.get("/api/v1/leadership")
    assert public_leadership.status_code == 200
    assert public_leadership.json()[0]["contribution"] == "Ran weekly sessions."


def test_media_folder_usage_replace_and_delete_guard(
    admin_client: TestClient, db_session: Session
) -> None:
    category = _category(db_session)

    uploaded = admin_client.post(
        "/api/v1/admin/media",
        files={"file": ("screen.png", _image_bytes(), "image/png")},
        data={"title": "Screen", "alt_text": "A red test screen", "folder": "projects"},
    )
    assert uploaded.status_code == 201, uploaded.text
    asset = uploaded.json()
    assert asset["folder"] == "projects"
    assert asset["url"].startswith("/media/")

    project = _project(db_session, category, cover_image=asset["url"])
    assert project.cover_image == asset["url"]

    usage = admin_client.get(f"/api/v1/admin/media/{asset['id']}/usage")
    assert usage.status_code == 200
    assert usage.json()["count"] == 1

    blocked = admin_client.delete(f"/api/v1/admin/media/{asset['id']}")
    assert blocked.status_code == 400
    assert "Used in 1 place" in blocked.json()["detail"]

    replaced = admin_client.post(
        f"/api/v1/admin/media/{asset['id']}/replace",
        files={"file": ("screen.png", _image_bytes("blue", (40, 30)), "image/png")},
    )
    assert replaced.status_code == 200, replaced.text
    assert replaced.json()["url"] == asset["url"]
    assert replaced.json()["width"] == 40
    assert replaced.json()["height"] == 30

    wrong_type = admin_client.post(
        f"/api/v1/admin/media/{asset['id']}/replace",
        files={"file": ("screen.webp", _image_bytes(), "image/webp")},
    )
    assert wrong_type.status_code == 400

    filtered = admin_client.get("/api/v1/admin/media?folder=projects")
    assert filtered.status_code == 200
    assert filtered.json()["items"][0]["id"] == asset["id"]


def test_message_spam_status(admin_client: TestClient, db_session: Session) -> None:
    message = ContactMessage(
        name="Spam Sender",
        email="spam@example.com",
        subject="Cheap offers",
        message="Buy things.",
    )
    db_session.add(message)
    db_session.commit()

    updated = admin_client.patch(
        f"/api/v1/admin/messages/{message.id}/status", json={"status": "spam"}
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["status"] == "spam"

    spam = admin_client.get("/api/v1/admin/messages?status=spam")
    assert spam.status_code == 200
    assert spam.json()["total"] == 1
    assert spam.json()["spam"] == 1


def test_github_repository_parser_is_strict() -> None:
    assert parse_repository("https://github.com/owner/repo") == ("owner", "repo")
    assert parse_repository("https://github.com/owner/repo.git") == ("owner", "repo")
    assert parse_repository("https://gitlab.com/owner/repo") is None
    assert parse_repository("https://github.com/owner") is None
    assert parse_repository("javascript:alert(1)") is None
