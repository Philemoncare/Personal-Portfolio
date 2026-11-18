"""Work system tests: public filtering, detail navigation, admin lifecycle, case studies."""

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ActivityLog, Project, ProjectCategory, Technology


def _category(db: Session, name: str, slug: str) -> ProjectCategory:
    record = ProjectCategory(name=name, slug=slug, sort_order=0)
    db.add(record)
    db.commit()
    return record


def _technology(db: Session, name: str, slug: str) -> Technology:
    record = Technology(name=name, slug=slug, kind="tool", sort_order=0)
    db.add(record)
    db.commit()
    return record


def _project(
    db: Session,
    category: ProjectCategory,
    title: str,
    slug: str,
    *,
    status: str = "published",
    project_status: str = "completed",
    sort_order: int = 0,
    featured: bool = False,
    technologies: list[Technology] | None = None,
) -> Project:
    record = Project(
        title=title,
        slug=slug,
        summary=f"{title} summary.",
        body=f"{title} overview body.",
        category_id=category.id,
        primary_mode="build",
        project_status=project_status,
        status=status,
        featured=featured,
        sort_order=sort_order,
        technologies=technologies or [],
    )
    db.add(record)
    db.commit()
    return record


def _seed(db: Session) -> dict[str, object]:
    web = _category(db, "Web Development", "web")
    data = _category(db, "Data & Analytics", "data")
    python = _technology(db, "Python", "python")
    react = _technology(db, "React", "react")

    alpha = _project(
        db,
        web,
        "Alpha Platform",
        "alpha-platform",
        project_status="active",
        sort_order=10,
        featured=True,
        technologies=[python, react],
    )
    beta = _project(
        db,
        data,
        "Beta Data Study",
        "beta-data-study",
        sort_order=20,
        technologies=[python],
    )
    _project(db, web, "Gamma Draft", "gamma-draft", status="draft", sort_order=30)
    _project(
        db,
        web,
        "Delta Archive",
        "delta-archive",
        project_status="archived",
        sort_order=40,
    )
    return {"web": web, "data": data, "python": python, "alpha": alpha, "beta": beta}


def test_public_list_excludes_drafts_and_archives(client: TestClient, db_session: Session) -> None:
    _seed(db_session)

    response = client.get("/api/v1/projects")
    assert response.status_code == 200
    payload = response.json()
    assert [item["slug"] for item in payload["items"]] == ["alpha-platform", "beta-data-study"]
    assert payload["total"] == 2

    archived = client.get("/api/v1/projects?include_archived=true")
    assert [item["slug"] for item in archived.json()["items"]] == [
        "alpha-platform",
        "beta-data-study",
        "delta-archive",
    ]

    draft_list = client.get("/api/v1/projects?include_archived=true").json()
    assert "gamma-draft" not in [item["slug"] for item in draft_list["items"]]

    detail = client.get("/api/v1/projects/gamma-draft")
    assert detail.status_code == 404
    assert detail.json()["detail"] == "Project not found"


def test_public_filters_and_facets(client: TestClient, db_session: Session) -> None:
    _seed(db_session)

    def slugs(query: str) -> list[str]:
        response = client.get(f"/api/v1/projects?{query}")
        assert response.status_code == 200, response.text
        return [item["slug"] for item in response.json()["items"]]

    assert slugs("category=web") == ["alpha-platform"]
    assert slugs("category=data") == ["beta-data-study"]
    assert slugs("technology=python") == ["alpha-platform", "beta-data-study"]
    assert slugs("technology=react") == ["alpha-platform"]
    assert slugs("status=active") == ["alpha-platform"]
    assert slugs("featured=true") == ["alpha-platform"]
    assert slugs("search=beta") == ["beta-data-study"]
    assert slugs("search=overview") == ["alpha-platform", "beta-data-study"]

    featured = client.get("/api/v1/projects/featured")
    assert [item["slug"] for item in featured.json()["items"]] == ["alpha-platform"]

    categories = client.get("/api/v1/projects/categories").json()
    assert {item["slug"] for item in categories} == {"web", "data"}

    technologies = client.get("/api/v1/projects/technologies").json()
    assert {item["slug"] for item in technologies} == {"python", "react"}


def test_project_detail_related_and_navigation(client: TestClient, db_session: Session) -> None:
    _seed(db_session)

    first = client.get("/api/v1/projects/alpha-platform").json()
    assert first["slug"] == "alpha-platform"
    assert first["previous"] is None
    assert first["next"]["slug"] == "beta-data-study"
    assert [item["slug"] for item in first["related"]] == ["beta-data-study"]

    second = client.get("/api/v1/projects/beta-data-study").json()
    assert second["previous"]["slug"] == "alpha-platform"
    assert second["next"] is None


def test_admin_project_lifecycle(admin_client: TestClient, db_session: Session) -> None:
    seed = _seed(db_session)
    web = seed["web"]
    python = seed["python"]

    created = admin_client.post(
        "/api/v1/admin/projects",
        json={
            "title": "Runtime Flow",
            "category_id": str(web.id),
            "technology_ids": [str(python.id)],
            "extra_technologies": ["Pytest"],
            "status": "draft",
            "project_status": "in_progress",
            "summary": "Draft summary.",
            "body": "Draft overview.",
            "live_url": "https://example.com/runtime-flow",
            "external_url": "https://example.com/runtime-flow/external",
        },
    )
    assert created.status_code == 201, created.text
    project_id = created.json()["id"]
    assert created.json()["slug"] == "runtime-flow"
    assert {tech["slug"] for tech in created.json()["technologies"]} == {"python", "pytest"}

    assert admin_client.get("/api/v1/projects/runtime-flow").status_code == 404

    preview = admin_client.get(f"/api/v1/admin/projects/{project_id}/preview")
    assert preview.status_code == 200, preview.text
    assert preview.json()["slug"] == "runtime-flow"
    assert preview.json()["body"] == "Draft overview."

    updated = admin_client.put(
        f"/api/v1/admin/projects/{project_id}",
        json={
            "title": "Runtime Flow",
            "category_id": str(web.id),
            "technology_ids": [str(python.id)],
            "status": "draft",
            "project_status": "in_progress",
            "summary": "Updated summary.",
            "body": "Updated overview.",
            "live_url": "https://example.com/runtime-flow",
            "external_url": "https://example.com/runtime-flow/external",
        },
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["summary"] == "Updated summary."

    published = admin_client.patch(
        f"/api/v1/admin/projects/{project_id}/status",
        json={"status": "published"},
    )
    assert published.status_code == 200, published.text
    assert published.json()["published_at"] is not None

    public = admin_client.get("/api/v1/projects/runtime-flow")
    assert public.status_code == 200
    assert public.json()["live_url"] == "https://example.com/runtime-flow"
    assert public.json()["external_url"] == "https://example.com/runtime-flow/external"

    duplicate = admin_client.post(f"/api/v1/admin/projects/{project_id}/duplicate")
    assert duplicate.status_code == 201, duplicate.text
    assert duplicate.json()["status"] == "draft"
    assert duplicate.json()["slug"] == "runtime-flow-copy"

    reorder = admin_client.post(
        "/api/v1/admin/projects/reorder",
        json={"ids": [str(duplicate.json()["id"]), project_id]},
    )
    assert reorder.status_code == 200, reorder.text

    deleted = admin_client.delete(f"/api/v1/admin/projects/{project_id}")
    assert deleted.status_code == 204
    assert admin_client.get("/api/v1/projects/runtime-flow").status_code == 404
    assert admin_client.get(f"/api/v1/admin/projects/{project_id}").status_code == 404

    events = {
        row.event
        for row in db_session.scalars(
            select(ActivityLog).where(ActivityLog.identifier.is_not(None))
        ).all()
    }
    assert {
        "project_created",
        "project_updated",
        "project_published",
        "project_duplicated",
        "project_reordered",
        "project_deleted",
    } <= events

    project_rows = db_session.scalars(
        select(ActivityLog).where(ActivityLog.event.like("project_%"))
    ).all()
    assert project_rows
    for row in project_rows:
        assert "Draft overview." not in (row.detail or "")
        assert "Summary." not in (row.detail or "")
        assert "password" not in (row.detail or "").lower()
        assert row.user_id is not None


def test_case_study_visibility_and_hidden_sections(
    admin_client: TestClient, db_session: Session
) -> None:
    seed = _seed(db_session)
    alpha = seed["alpha"]

    created = admin_client.post(
        "/api/v1/admin/case-studies",
        json={
            "project_id": str(alpha.id),
            "title": "Alpha case study",
            "status": "draft",
            "overview": "How alpha was built.",
            "problem": "The problem alpha solved.",
            "goals": "The goals alpha chased.",
            "challenges": (
                "CHALLENGE: The hard part.\nAPPROACH: The method.\nOUTCOME: The result."
            ),
            "result_type": "qualitative",
        },
    )
    assert created.status_code == 201, created.text
    study_id = created.json()["id"]
    assert created.json()["slug"] == "alpha-case-study"
    assert admin_client.get("/api/v1/case-studies/alpha-case-study").status_code == 404

    published = admin_client.put(
        f"/api/v1/admin/case-studies/{study_id}",
        json={
            "project_id": str(alpha.id),
            "title": "Alpha case study",
            "status": "published",
            "overview": "How alpha was built.",
            "problem": "The problem alpha solved.",
            "goals": "The goals alpha chased.",
            "challenges": (
                "CHALLENGE: The hard part.\nAPPROACH: The method.\nOUTCOME: The result."
            ),
            "result_type": "qualitative",
            "hidden_sections": ["problem"],
        },
    )
    assert published.status_code == 200, published.text

    public = admin_client.get("/api/v1/case-studies/alpha-case-study")
    assert public.status_code == 200
    payload = public.json()
    assert payload["project_slug"] == "alpha-platform"
    assert payload["hidden_sections"] == ["problem"]
    assert payload["overview"] == "How alpha was built."
    assert payload["problem"] == "The problem alpha solved."
    assert payload["result_type"] == "qualitative"

    archived = admin_client.put(
        f"/api/v1/admin/case-studies/{study_id}",
        json={
            "project_id": str(alpha.id),
            "title": "Alpha case study",
            "status": "archived",
            "overview": "How alpha was built.",
        },
    )
    assert archived.status_code == 200, archived.text
    assert admin_client.get("/api/v1/case-studies/alpha-case-study").status_code == 404

    deleted = admin_client.delete(f"/api/v1/admin/case-studies/{study_id}")
    assert deleted.status_code == 204

    events = {
        row.event
        for row in db_session.scalars(
            select(ActivityLog).where(ActivityLog.event.like("case_study_%"))
        ).all()
    }
    assert {"case_study_created", "case_study_updated", "case_study_deleted"} <= events


def test_admin_project_endpoints_require_authentication(client: TestClient) -> None:
    assert client.get("/api/v1/admin/projects").status_code == 401
    assert client.post("/api/v1/admin/projects", json={}).status_code == 401
    assert client.get("/api/v1/admin/case-studies").status_code == 401
    assert (
        client.get(
            "/api/v1/admin/projects/00000000-0000-0000-0000-000000000000/preview"
        ).status_code
        == 401
    )
