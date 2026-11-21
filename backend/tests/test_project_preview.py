"""Tests for verified homepage discovery and preview capture."""

from __future__ import annotations

import asyncio
import socket
from datetime import UTC, datetime
from io import BytesIO

import pytest
from PIL import Image
from sqlalchemy import select

from app.integrations.github import mapper as github_mapper
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
    LiveUrlCandidateOut,
    RepositoryInspectionOut,
)
from app.services import project_preview
from app.services.project_preview import (
    PreviewError,
    build_candidates,
    validate_homepage_url,
)


def _project(db_session, *, live_url: str | None = "https://example.com") -> Project:
    category = db_session.scalar(select(ProjectCategory))
    if category is None:
        category = ProjectCategory(name="Web Development", slug="web")
        db_session.add(category)
        db_session.commit()
    project = Project(
        title="Preview target",
        slug="preview-target",
        summary="A project used by preview tests.",
        category_id=category.id,
        status="draft",
        live_url=live_url,
    )
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)
    return project


@pytest.mark.parametrize(
    "value",
    [
        "javascript:alert(1)",
        "file:///C:/Windows/win.ini",
        "data:text/html,<h1>x</h1>",
        "ftp://example.com",
        "http://localhost:8000",
        "http://127.0.0.1/",
        "http://10.0.0.5/",
        "http://192.168.1.20/",
        "https://github.com/octocat/hello",
        "https://raw.githubusercontent.com/a/b/main/x.png",
        "https://api.example.com",
        "https://docs.example.com",
        "https://example.com/screenshot.png",
        "https://user:pass@example.com/",
        "https://example.com:8080/",
    ],
)
def test_unsafe_homepage_urls_are_rejected(value: str) -> None:
    with pytest.raises(PreviewError):
        validate_homepage_url(value)


def test_homepage_urls_are_normalised() -> None:
    assert validate_homepage_url(" HTTPS://Example.COM ") == "https://example.com/"
    assert (
        validate_homepage_url("https://example.com/path?q=1#section")
        == "https://example.com/path?q=1"
    )


def test_private_dns_resolution_is_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        socket,
        "getaddrinfo",
        lambda *args, **kwargs: [
            (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("127.0.0.1", 443))
        ],
    )
    with pytest.raises(PreviewError):
        asyncio.run(project_preview.resolve_public_host("example.com", 443))


def test_candidates_rank_pages_before_homepage_and_readme() -> None:
    candidates = build_candidates(
        homepage="https://example.com/",
        pages_url="https://octocat.github.io/project/",
        package_homepage="https://example.com/",
        cname="custom.example.org",
        readme_urls=[
            ("https://demo.example.net/", "medium", "README deployment section"),
            ("https://github.com/octocat/project", "low", "Source link"),
        ],
    )
    assert [item.source for item in candidates] == [
        "github_pages",
        "github_homepage",
        "cname",
        "readme",
    ]
    assert candidates[0].url == "https://octocat.github.io/project/"
    assert all("github.com" not in item.url for item in candidates)


def _inspection(
    repository: GitHubRepositoryOut,
    *,
    live: list[LiveUrlCandidateOut] | None = None,
) -> RepositoryInspectionOut:
    return RepositoryInspectionOut(
        repository=repository,
        structure=GitHubContentsOut(path="", entries=[], default_branch="main"),
        readme=GitHubReadmeOut(),
        images=GitHubImagesOut(),
        activity=GitHubActivityOut(default_branch="main"),
        live_url_candidates=live or [],
        case_study=CaseStudyDraftOut(
            **{
                field: "Not documented in repository."
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


def _repository() -> GitHubRepositoryOut:
    return GitHubRepositoryOut(
        id="9001",
        name="preview-repo",
        full_name="octocat/preview-repo",
        description="A deployed project.",
        owner="octocat",
        html_url="https://github.com/octocat/preview-repo",
        homepage="https://preview-repo.vercel.app",
        default_branch="main",
        visibility="public",
    )


def test_import_marks_preview_awaiting_without_capturing(
    db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    admin = db_session.scalar(select(AdminUser)) or AdminUser(
        email="preview-importer@example.com", password_hash="x"
    )
    if admin.id is None:
        db_session.add(admin)
        db_session.commit()

    category = ProjectCategory(name="Preview imports", slug="preview-imports")
    db_session.add(category)
    db_session.commit()

    repository = _repository()
    inspection = _inspection(
        repository,
        live=[
            LiveUrlCandidateOut(
                url="https://preview-repo.vercel.app",
                source="GitHub repository homepage",
                confidence="high",
                source_key="github_homepage",
            )
        ],
    )

    async def fake_analysis(client, repository_id):
        return inspection

    async def fail_capture(*args, **kwargs):  # pragma: no cover - asserted below
        raise AssertionError("preview capture must not run when disabled")

    monkeypatch.setattr(github_mapper, "analyze_repository", fake_analysis)
    monkeypatch.setattr(project_preview, "capture_homepage", fail_capture)

    project, _ = asyncio.run(
        github_mapper.import_repository(
            db_session,
            admin=admin,
            client=object(),
            repository_id=repository.id,
            payload=GitHubImportRequest(
                category_id=category.id,
                import_images=False,
                generate_preview=False,
            ),
        )
    )

    assert project.status == "draft"
    assert project.live_url == "https://preview-repo.vercel.app"
    assert project.preview_status == "awaiting_verification"
    assert project.preview_source == "github_homepage"
    assert project.preview_source_url == "https://preview-repo.vercel.app"
    assert project.preview_image is None


def test_import_without_live_url_has_no_invented_homepage(
    db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    admin = db_session.scalar(select(AdminUser)) or AdminUser(
        email="preview-importer-2@example.com", password_hash="x"
    )
    if admin.id is None:
        db_session.add(admin)
        db_session.commit()

    category = ProjectCategory(name="Preview imports 2", slug="preview-imports-2")
    db_session.add(category)
    db_session.commit()

    repository = _repository()
    repository = repository.model_copy(
        update={"homepage": None, "html_url": "https://github.com/octocat/preview-repo"}
    )
    inspection = _inspection(repository)

    async def fake_analysis(client, repository_id):
        return inspection

    monkeypatch.setattr(github_mapper, "analyze_repository", fake_analysis)

    project, _ = asyncio.run(
        github_mapper.import_repository(
            db_session,
            admin=admin,
            client=object(),
            repository_id=repository.id,
            payload=GitHubImportRequest(category_id=category.id, import_images=False),
        )
    )

    assert project.live_url is None
    assert project.preview_status == "not_discovered"
    assert project.preview_image is None


def test_verify_endpoint_rejects_unsafe_url(admin_client, db_session) -> None:
    project = _project(db_session)
    response = admin_client.post(
        f"/api/v1/admin/projects/{project.id}/preview/verify",
        json={"url": "javascript:alert(1)"},
    )
    assert response.status_code == 400
    assert "http" in response.json()["detail"].lower()


def test_generate_endpoint_stores_a_real_capture(
    admin_client, db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    project = _project(db_session, live_url="https://preview.example.com/")

    buffer = BytesIO()
    Image.new("RGB", (640, 400), (32, 96, 148)).save(buffer, format="WEBP")
    data = buffer.getvalue()

    probe = project_preview.ProbeResult(
        requested_url="https://preview.example.com/",
        final_url="https://preview.example.com/",
        status_code=200,
        content_type="text/html",
        resolved_ip="203.0.113.10",
    )

    async def fake_capture(url: str):
        return data, probe

    monkeypatch.setattr(project_preview, "capture_homepage", fake_capture)

    response = admin_client.post(
        f"/api/v1/admin/projects/{project.id}/preview",
        json={"url": None},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["preview_status"] == "generated"
    assert body["verified"] is True
    assert body["preview_image"]

    db_session.refresh(project)
    assert project.preview_status == "generated"
    assert project.preview_image == body["preview_image"]
    assert project.last_verified_at is not None
    assert project.preview_checked_at is not None
