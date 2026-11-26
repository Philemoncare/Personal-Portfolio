import asyncio
import uuid
from datetime import UTC, datetime

import pytest
from sqlalchemy import select

from app.core.config import settings
from app.integrations.github import auth
from app.integrations.github import mapper as github_mapper
from app.integrations.github.contents import (
    UnsafePathError,
    extract_images,
    is_forbidden,
    is_safe_text_file,
    safe_repository_path,
    scan_repository_images,
)
from app.integrations.github.parser import (
    NOT_DOCUMENTED,
    contains_secret,
    detect_live_urls,
    detect_technologies,
    readme_groups,
    readme_sections,
)
from app.models import AdminUser
from app.models.project import Project, ProjectCategory
from app.schemas.github import (
    CaseStudyDraftOut,
    GitHubActivityOut,
    GitHubContentsOut,
    GitHubImagesOut,
    GitHubImportRequest,
    GitHubReadmeOut,
    GitHubRepositoryOut,
    RepositoryInspectionOut,
)

README = """# Reading Tracker

[![Build](https://img.shields.io/badge/build-passing-green)](https://example.com)

A small tool that tracks reading progress.

## Features
- Track books
- Add notes

## Tech Stack
- React
- FastAPI

## Deployment
Live at https://reading-tracker.vercel.app

![Screenshot](./docs/preview.png)
![Badge](https://img.shields.io/badge/x-y-z)
"""


def _unconfigure_github(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "github_client_id", None)
    monkeypatch.setattr(settings, "github_client_secret", None)
    monkeypatch.setattr(settings, "github_redirect_uri", None)


def test_status_requires_authentication(client):
    response = client.get("/api/v1/integrations/github/status")
    assert response.status_code == 401


def test_status_reports_not_configured(admin_client, monkeypatch):
    _unconfigure_github(monkeypatch)
    response = admin_client.get("/api/v1/integrations/github/status")
    assert response.status_code == 200
    body = response.json()
    assert body["configured"] is False
    assert body["connected"] is False
    assert body["requested_scopes"] == ["read:user", "public_repo"]
    assert body["private_access_requested"] is False
    assert body["authorize_url"] is None


def test_connect_returns_service_unavailable_when_not_configured(admin_client, monkeypatch):
    _unconfigure_github(monkeypatch)
    response = admin_client.get("/api/v1/integrations/github/connect")
    assert response.status_code == 503
    assert "not configured" in response.json()["detail"].lower()


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("get", "/api/v1/github/repositories"),
        ("get", "/api/v1/github/repositories/123/inspection"),
    ],
)
def test_repository_routes_require_a_connection(admin_client, method, path):
    response = getattr(admin_client, method)(path)
    assert response.status_code == 409
    assert "not connected" in response.json()["detail"].lower()


def test_import_requires_a_connection(admin_client):
    response = admin_client.post("/api/v1/admin/projects/import/github/123", json={})
    assert response.status_code == 409
    assert "not connected" in response.json()["detail"].lower()


def test_import_logs_are_admin_only(client):
    assert client.get("/api/v1/admin/integrations/github/logs").status_code == 401


def test_import_logs_start_empty(admin_client):
    response = admin_client.get("/api/v1/admin/integrations/github/logs")
    assert response.status_code == 200
    assert response.json() == {"items": [], "total": 0}


def test_disconnect_without_a_connection_is_safe(admin_client):
    response = admin_client.post("/api/v1/integrations/github/disconnect")
    assert response.status_code == 200
    assert response.json()["connected"] is False


def test_project_link_reports_unlinked_booleans(admin_client, db_session):
    category = ProjectCategory(name="Web Development", slug="web")
    db_session.add(category)
    db_session.commit()
    project = Project(title="Manual project", slug="manual-project", category_id=category.id)
    db_session.add(project)
    db_session.commit()

    response = admin_client.get(f"/api/v1/admin/projects/{project.id}/github")
    assert response.status_code == 200
    body = response.json()
    assert body["connected"] is False
    assert body["repository_id"] is None
    assert body["is_fork"] is False
    assert body["is_archived"] is False
    assert body["sync_enabled"] is False


def test_oauth_state_round_trip_and_tampering():
    user_id = uuid.uuid4()
    state = auth.create_oauth_state(user_id)
    assert auth.verify_oauth_state(state) == user_id
    assert auth.verify_oauth_state(state + "x") is None
    assert auth.verify_oauth_state("not-a-state") is None
    assert auth.verify_oauth_state(None) is None


def _configure_github(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "github_client_id", "test-client-id")
    monkeypatch.setattr(settings, "github_client_secret", "test-client-secret")
    monkeypatch.setattr(
        settings,
        "github_redirect_uri",
        "http://testserver/api/v1/integrations/github/callback",
    )


def _admin(db_session) -> AdminUser:
    admin = db_session.scalar(select(AdminUser).where(AdminUser.email == "admin@test.dev"))
    assert admin is not None
    return admin


def test_callback_stores_connection_and_returns_to_the_admin_page(
    admin_client, db_session, monkeypatch
):
    _configure_github(monkeypatch)
    admin = _admin(db_session)

    async def fake_exchange(code: str) -> dict:
        assert code == "valid-code"
        return {
            "access_token": "gho_test_token",
            "token_type": "bearer",
            "scope": "read:user public_repo",
        }

    async def fake_account(token: str) -> dict:
        assert token == "gho_test_token"
        return {
            "id": 42,
            "login": "octocat",
            "name": "Mona Lisa",
            "avatar_url": None,
            "html_url": "https://github.com/octocat",
        }

    monkeypatch.setattr(auth, "exchange_code", fake_exchange)
    monkeypatch.setattr(auth, "fetch_account", fake_account)

    state = auth.create_oauth_state(admin.id, origin="http://localhost:5173")
    response = admin_client.get(
        "/api/v1/integrations/github/callback",
        params={"code": "valid-code", "state": state},
        follow_redirects=False,
    )

    assert response.status_code == 302
    assert response.headers["location"] == (
        "http://localhost:5173/admin/integrations/github?github=connected"
    )

    connection = auth.get_connection(db_session, admin.id)
    assert connection is not None
    assert connection.username == "octocat"
    assert connection.display_name == "Mona Lisa"
    assert connection.revoked_at is None
    assert auth.connection_token(connection) == "gho_test_token"


def test_callback_reports_a_failed_exchange(admin_client, db_session, monkeypatch):
    _configure_github(monkeypatch)
    admin = _admin(db_session)

    async def failing_exchange(code: str) -> dict:
        raise auth.GitHubError(
            "GitHub rejected the authorization. Try connecting again.",
            code="oauth_exchange_failed",
            status_code=400,
        )

    monkeypatch.setattr(auth, "exchange_code", failing_exchange)

    state = auth.create_oauth_state(admin.id, origin="http://localhost:5173")
    response = admin_client.get(
        "/api/v1/integrations/github/callback",
        params={"code": "expired-code", "state": state},
        follow_redirects=False,
    )

    assert response.status_code == 302
    location = response.headers["location"]
    assert location.startswith("http://localhost:5173/admin/integrations/github?")
    assert "github=error" in location
    assert auth.get_connection(db_session, admin.id) is None


def test_callback_rejects_an_invalid_state(admin_client, monkeypatch):
    _configure_github(monkeypatch)

    response = admin_client.get(
        "/api/v1/integrations/github/callback",
        params={"code": "some-code", "state": "tampered.state"},
        follow_redirects=False,
    )

    assert response.status_code == 302
    assert "github=error" in response.headers["location"]


def test_readme_groups_and_live_url_detection():
    groups = readme_groups(README)
    assert "features" in groups
    assert "Track books" in groups["features"]

    candidates = detect_live_urls(
        homepage=None,
        markdown=README,
        repository_url="https://github.com/me/reading-tracker",
    )
    assert candidates
    assert candidates[0].url == "https://reading-tracker.vercel.app"
    assert candidates[0].confidence in {"medium", "high"}


def test_readme_sections_mark_missing_content_as_not_documented():
    sections = {section.key: section for section in readme_sections(README)}
    assert sections["features"].documented is True
    assert sections["problem"].documented is False
    assert sections["problem"].content == "Not documented in repository."


def test_technology_detection_uses_manifests_with_evidence():
    technologies = detect_technologies(
        {"TypeScript": 1000, "Python": 500},
        {
            "package.json": (
                '{"dependencies":{"react":"18","vite":"5"},'
                '"devDependencies":{"typescript":"5"}}'
            ),
            "requirements.txt": "fastapi>=0.115\nuvicorn\n",
        },
    )
    names = {technology.name for technology in technologies}
    assert {"React", "Vite", "TypeScript", "FastAPI"} <= names
    for technology in technologies:
        assert technology.confidence in {"high", "medium", "low"}
        assert technology.evidence


def test_image_extraction_ignores_badges_and_external_hosts():
    images = extract_images(
        README,
        full_name="me/reading-tracker",
        readme_path="README.md",
        repository_id="42",
    )
    assert [image.path for image in images.items] == ["docs/preview.png"]
    assert images.items[0].preview_url.startswith("/api/v1/github/repositories/42/images/preview")
    assert images.ignored
    assert all("shields.io" in entry["reference"] for entry in images.ignored)


def test_secret_detection_matches_common_tokens():
    assert contains_secret("token = 'ghp_" + "a" * 36 + "'") is not None
    assert contains_secret("This README has no credentials.") is None


def test_scanned_image_paths_are_offered_and_traversal_is_rejected():
    images = extract_images(
        "",
        full_name="me/app",
        readme_path="README.md",
        repository_id="9",
        scanned_paths=[
            "screenshots/dashboard.png",
            "../outside.png",
            "docs/logo.svg",
            "screenshots/dashboard.png",
        ],
    )
    assert [image.path for image in images.items] == ["screenshots/dashboard.png"]
    assert images.items[0].markdown is None
    assert images.items[0].preview_url.startswith("/api/v1/github/repositories/9/images/preview")


def test_scan_repository_images_reads_conventional_folders():
    class FakeClient:
        async def get_json(self, path, params=None):
            if path.endswith("/screenshots"):
                return [
                    {"name": "a.png", "path": "screenshots/a.png", "type": "file"},
                    {"name": "notes.txt", "path": "screenshots/notes.txt", "type": "file"},
                    {"name": "nested", "path": "screenshots/nested", "type": "dir"},
                ]
            return []

    paths = asyncio.run(scan_repository_images(FakeClient(), full_name="me/app"))
    assert paths == ["screenshots/a.png"]


def test_safe_file_allow_list_and_traversal():
    assert is_safe_text_file("README.md")
    assert is_safe_text_file("package.json")
    assert is_safe_text_file(".env.example")
    assert not is_safe_text_file(".env")
    assert is_forbidden("config/secrets.yml")
    assert safe_repository_path("./README.md") == "README.md"

    with pytest.raises(UnsafePathError):
        safe_repository_path("../etc/passwd")
    with pytest.raises(UnsafePathError):
        safe_repository_path(".env")


def _repository(**overrides) -> GitHubRepositoryOut:
    moment = datetime(2026, 11, 18, 12, 0, tzinfo=UTC)
    data = {
        "id": "12345678",
        "name": "school-management",
        "full_name": "octocat/school-management",
        "description": "School management platform",
        "owner": "octocat",
        "html_url": "https://github.com/octocat/school-management",
        "homepage": "https://school.example.com",
        "language": "Python",
        "languages": {"Python": 5000, "TypeScript": 2000},
        "topics": ["fastapi", "education"],
        "visibility": "public",
        "default_branch": "main",
        "created_at": moment,
        "updated_at": moment,
        "pushed_at": moment,
    }
    data.update(overrides)
    return GitHubRepositoryOut(**data)


def _project(db_session, **overrides) -> Project:
    category = db_session.scalar(select(ProjectCategory).limit(1))
    if category is None:
        category = ProjectCategory(name="Web Development", slug="web")
        db_session.add(category)
        db_session.commit()
    project = Project(
        title="Editorial title",
        slug=f"project-{uuid.uuid4().hex[:8]}",
        category_id=category.id,
        summary="Editorial summary",
        body="Editorial body",
        role="Developer",
        year=2026,
        **overrides,
    )
    db_session.add(project)
    db_session.commit()
    return project


def test_private_repository_withholds_provider_url(db_session):
    project = _project(db_session)

    github_mapper._apply_provider_fields(
        project, _repository(private=True, visibility="private")
    )
    assert project.github_url is None
    assert project.github_visibility == "private"

    github_mapper._apply_provider_fields(project, _repository())
    assert project.github_url == "https://github.com/octocat/school-management"


def test_admin_link_derives_url_for_private_repository(db_session):
    project = _project(
        db_session,
        github_repository_id="12345678",
        github_owner="octocat",
        github_repository_name="school-management",
        github_visibility="private",
        github_url=None,
    )

    link = github_mapper.project_github_link(project)
    assert link["repository_url"] == "https://github.com/octocat/school-management"


def test_sync_never_overwrites_editorial_fields(db_session, monkeypatch):
    project = _project(
        db_session,
        github_repository_id="12345678",
        github_owner="octocat",
        github_repository_name="school-management",
        github_sync_enabled=True,
    )
    repository = _repository()

    async def fake_repository(client, repository_id):
        return {
            "id": 12345678,
            "name": "school-management",
            "full_name": "octocat/school-management",
            "description": "School management platform",
            "owner": {"login": "octocat"},
            "html_url": "https://github.com/octocat/school-management",
            "homepage": "https://school.example.com",
            "language": "Python",
            "visibility": "public",
            "default_branch": "main",
        }

    async def fake_languages(client, full_name):
        return {"Python": 5000, "TypeScript": 2000}

    monkeypatch.setattr(github_mapper, "get_repository", fake_repository)
    monkeypatch.setattr(github_mapper, "get_languages", fake_languages)

    result = asyncio.run(
        github_mapper.sync_project(db_session, client=object(), project=project)
    )

    db_session.refresh(project)
    assert "github_last_synced_at" in result.updated_fields
    assert "title" in result.preserved_fields
    assert project.title == "Editorial title"
    assert project.summary == "Editorial summary"
    assert project.body == "Editorial body"
    assert project.role == "Developer"
    assert project.year == 2026
    assert project.github_repository_id == "12345678"
    assert project.live_url == "https://school.example.com"
    assert project.repository_url == "https://github.com/octocat/school-management"


def test_import_logs_include_the_acting_admin(admin_client, db_session):
    admin = db_session.scalar(select(AdminUser))
    project = _project(db_session)
    github_mapper.record_log(
        db_session,
        admin=admin,
        project=project,
        repository_id="12345678",
        repository_full_name="octocat/school-management",
        action="import",
        summary="Draft created from octocat/school-management.",
    )

    response = admin_client.get("/api/v1/admin/integrations/github/logs")
    assert response.status_code == 200
    item = response.json()["items"][0]
    assert item["user_id"] == str(admin.id)
    assert item["user_email"] == admin.email


def test_private_import_creates_hidden_draft_and_blocks_duplicates(
    db_session, monkeypatch
):
    admin = db_session.scalar(select(AdminUser)) or AdminUser(
        email="importer@example.com", password_hash="x"
    )
    if admin.id is None:
        db_session.add(admin)
        db_session.commit()

    category = ProjectCategory(name="Web Development", slug="web")
    db_session.add(category)
    db_session.commit()

    repository = _repository(private=True, visibility="private")
    inspection = RepositoryInspectionOut(
        repository=repository,
        structure=GitHubContentsOut(path="", entries=[], default_branch="main"),
        readme=GitHubReadmeOut(),
        images=GitHubImagesOut(),
        activity=GitHubActivityOut(default_branch="main"),
        case_study=CaseStudyDraftOut(
            **{
                field: NOT_DOCUMENTED
                for field in (
                    "overview",
                    "problem",
                    "solution",
                    "features",
                    "architecture",
                    "technology",
                    "implementation",
                    "challenges",
                    "testing",
                    "lessons",
                    "future_improvements",
                )
            }
        ),
        fetched_at=datetime.now(UTC),
    )

    async def fake_analysis(client, repository_id):
        return inspection

    monkeypatch.setattr(github_mapper, "analyze_repository", fake_analysis)
    payload = GitHubImportRequest(category_id=category.id, import_images=False)

    project, log = asyncio.run(
        github_mapper.import_repository(
            db_session,
            admin=admin,
            client=object(),
            repository_id=repository.id,
            payload=payload,
        )
    )

    assert project.status == "draft"
    assert project.public_visibility is False
    assert project.repository_url is None
    assert project.github_url is None
    assert project.github_visibility == "private"
    assert log.action == "import"

    with pytest.raises(github_mapper.DuplicateRepositoryError):
        asyncio.run(
            github_mapper.import_repository(
                db_session,
                admin=admin,
                client=object(),
                repository_id=repository.id,
                payload=payload,
            )
        )
