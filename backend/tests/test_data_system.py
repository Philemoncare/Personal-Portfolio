"""Data Lab tests: public visibility, filters, admin lifecycle, chart validation."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import (
    DataInsight,
    DataProject,
    DataProjectCategory,
    DataResource,
    DataTool,
    DataVisualization,
)


def _category(db: Session, name: str, slug: str) -> DataProjectCategory:
    record = DataProjectCategory(name=name, slug=slug, sort_order=0)
    db.add(record)
    db.commit()
    return record


def _tool(db: Session, name: str, slug: str) -> DataTool:
    record = DataTool(name=name, slug=slug, kind="tool", sort_order=0)
    db.add(record)
    db.commit()
    return record


def _project(
    db: Session,
    category: DataProjectCategory,
    title: str,
    slug: str,
    *,
    status: str = "published",
    project_type: str = "eda",
    featured: bool = False,
    sort_order: int = 0,
    tools: list[DataTool] | None = None,
    short_description: str | None = None,
    keywords: str | None = None,
) -> DataProject:
    record = DataProject(
        title=title,
        slug=slug,
        short_description=short_description or f"{title} description.",
        category_id=category.id,
        project_type=project_type,
        status=status,
        featured=featured,
        sort_order=sort_order,
        keywords=keywords,
        is_placeholder=False,
        is_demo=False,
    )
    if tools:
        record.tools = tools
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def _seed(db: Session) -> dict[str, object]:
    eda = _category(db, "Exploratory Data Analysis", "eda")
    sql = _category(db, "SQL Analysis", "sql")
    python = _tool(db, "Python", "python")
    sql_tool = _tool(db, "SQL", "sql")
    excel = _tool(db, "Excel", "excel")

    alpha = _project(
        db,
        eda,
        "Alpha Sales Study",
        "alpha-sales-study",
        featured=True,
        sort_order=10,
        tools=[python, sql_tool],
        short_description="Investigating channel mix in a retail extract.",
        keywords="retail, channel mix",
    )
    beta = _project(
        db,
        sql,
        "Beta Retention Query",
        "beta-retention-query",
        project_type="sql",
        sort_order=20,
        tools=[sql_tool],
    )
    gamma = _project(
        db,
        eda,
        "Gamma Draft",
        "gamma-draft",
        status="draft",
        sort_order=30,
    )
    delta = _project(
        db,
        eda,
        "Delta Archive",
        "delta-archive",
        status="archived",
        sort_order=40,
    )
    epsilon = _project(
        db,
        sql,
        "Epsilon Experiment",
        "epsilon-experiment",
        status="experiment",
        project_type="sql",
        sort_order=50,
    )
    _project(
        db,
        eda,
        "Zeta Excel Review",
        "zeta-excel-review",
        project_type="excel",
        sort_order=60,
        tools=[excel],
    )
    return {
        "eda": eda,
        "sql": sql,
        "python": python,
        "sql_tool": sql_tool,
        "excel": excel,
        "alpha": alpha,
        "beta": beta,
        "gamma": gamma,
        "delta": delta,
        "epsilon": epsilon,
    }


def _chart_payload(
    *,
    title: str = "Monthly revenue",
    chart_type: str = "bar",
    x_axis: str | None = "month",
    y_axis: str | None = "revenue",
    series: list[str] | None = None,
    data: list[dict] | None = None,
) -> dict:
    return {
        "chart_type": chart_type,
        "title": title,
        "description": "Stored demonstration chart.",
        "data": data
        if data is not None
        else [
            {"month": "Jan", "revenue": 12},
            {"month": "Feb", "revenue": 19},
        ],
        "x_axis": x_axis,
        "y_axis": y_axis,
        "series": series or [],
        "display_order": 0,
        "source_note": "Test values.",
    }


def test_public_visibility_filters_and_facets(
    client: TestClient, db_session: Session
) -> None:
    _seed(db_session)

    response = client.get("/api/v1/data-projects")
    assert response.status_code == 200, response.text
    payload = response.json()
    assert [item["slug"] for item in payload["items"]] == [
        "alpha-sales-study",
        "beta-retention-query",
        "zeta-excel-review",
    ]
    assert payload["total"] == 3

    def slugs(query: str) -> list[str]:
        result = client.get(f"/api/v1/data-projects?{query}")
        assert result.status_code == 200, result.text
        return [item["slug"] for item in result.json()["items"]]

    assert slugs("category=eda") == ["alpha-sales-study", "zeta-excel-review"]
    assert slugs("tool=python") == ["alpha-sales-study"]
    assert slugs("tool=sql") == ["alpha-sales-study", "beta-retention-query"]
    assert slugs("project_type=sql") == ["beta-retention-query"]
    assert slugs("project_type=excel") == ["zeta-excel-review"]
    assert slugs("featured=true") == ["alpha-sales-study"]
    assert slugs("search=alpha") == ["alpha-sales-study"]
    assert slugs("search=retention") == ["beta-retention-query"]
    assert slugs("search=channel") == ["alpha-sales-study"]
    assert slugs("search=python") == ["alpha-sales-study"]
    assert slugs("search=sql analysis") == ["beta-retention-query"]

    featured = client.get("/api/v1/data-projects/featured")
    assert featured.status_code == 200
    assert [item["slug"] for item in featured.json()["items"]] == ["alpha-sales-study"]

    categories = client.get("/api/v1/data-projects/categories")
    assert categories.status_code == 200
    assert {item["slug"] for item in categories.json()} == {"eda", "sql"}

    tools = client.get("/api/v1/data-projects/tools")
    assert tools.status_code == 200
    assert {item["slug"] for item in tools.json()} == {"python", "sql", "excel"}

    assert client.get("/api/v1/data-projects/gamma-draft").status_code == 404
    assert client.get("/api/v1/data-projects/delta-archive").status_code == 404
    assert client.get("/api/v1/data-projects/epsilon-experiment").status_code == 404


def test_detail_payload_includes_nested_children(
    client: TestClient, db_session: Session
) -> None:
    seed = _seed(db_session)
    alpha = seed["alpha"]
    assert isinstance(alpha, DataProject)

    alpha.visualizations = [
        DataVisualization(
            chart_type="bar",
            title="Channel revenue",
            data=[{"channel": "Retail", "revenue": 40}, {"channel": "Online", "revenue": 60}],
            x_axis="channel",
            y_axis="revenue",
            series=[],
            display_order=10,
        )
    ]
    alpha.insights = [
        DataInsight(
            title="Online leads",
            key_insight="Online contributes the larger share.",
            possible_explanation="Possible mix shift; not established by this extract.",
            recommendation="Validate against a longer period.",
            display_order=10,
        )
    ]
    alpha.resources = [
        DataResource(
            title="Query file",
            resource_type="sql",
            url=None,
            description="Not public.",
            display_order=10,
        )
    ]
    db_session.commit()

    detail = client.get("/api/v1/data-projects/alpha-sales-study")
    assert detail.status_code == 200, detail.text
    body = detail.json()
    assert body["question"] is None
    assert body["dataset_rows"] is None
    assert body["dataset_is_public"] is True
    assert body["visualizations"][0]["chart_type"] == "bar"
    assert body["visualizations"][0]["data"][1]["revenue"] == 60
    assert body["insights"][0]["possible_explanation"].startswith("Possible")
    assert body["resources"][0]["url"] is None


def test_admin_data_project_lifecycle(
    admin_client: TestClient, db_session: Session
) -> None:
    seed = _seed(db_session)
    eda = seed["eda"]
    python = seed["python"]

    created = admin_client.post(
        "/api/v1/admin/data-projects",
        json={
            "title": "Lifecycle Analysis",
            "category_id": str(eda.id),
            "tool_ids": [str(python.id)],
            "project_type": "eda",
            "status": "draft",
            "short_description": "Draft analysis.",
            "question": "What changed?",
            "dataset_rows": 120,
            "dataset_columns": 6,
            "visualizations": [_chart_payload()],
            "insights": [
                {
                    "title": "A first finding",
                    "key_insight": "Revenue rose in the stored example.",
                    "possible_explanation": "Not established.",
                    "recommendation": "Test with more data.",
                }
            ],
            "resources": [
                {
                    "title": "Dataset extract",
                    "resource_type": "dataset",
                    "url": None,
                    "description": "Not shared publicly.",
                }
            ],
        },
    )
    assert created.status_code == 201, created.text
    body = created.json()
    project_id = body["id"]
    assert body["slug"] == "lifecycle-analysis"
    assert len(body["visualizations"]) == 1
    assert len(body["insights"]) == 1
    assert len(body["resources"]) == 1
    assert body["dataset_rows"] == 120

    assert admin_client.get("/api/v1/data-projects/lifecycle-analysis").status_code == 404

    preview = admin_client.get(
        f"/api/v1/admin/data-projects/{project_id}/preview"
    )
    assert preview.status_code == 200, preview.text
    assert preview.json()["question"] == "What changed?"

    updated = admin_client.put(
        f"/api/v1/admin/data-projects/{project_id}",
        json={
            "title": "Lifecycle Analysis",
            "category_id": str(eda.id),
            "tool_ids": [str(python.id)],
            "project_type": "eda",
            "status": "draft",
            "short_description": "Updated analysis.",
            "question": "What changed, and why?",
            "visualizations": [
                _chart_payload(title="Revenue by month"),
                _chart_payload(
                    title="Revenue share",
                    chart_type="donut",
                    x_axis="month",
                    y_axis="revenue",
                ),
            ],
        },
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["short_description"] == "Updated analysis."
    assert len(updated.json()["visualizations"]) == 2
    assert updated.json()["insights"] == []

    published = admin_client.patch(
        f"/api/v1/admin/data-projects/{project_id}/status",
        json={"status": "published"},
    )
    assert published.status_code == 200, published.text
    assert published.json()["published_at"] is not None

    public = admin_client.get("/api/v1/data-projects/lifecycle-analysis")
    assert public.status_code == 200, public.text
    assert public.json()["short_description"] == "Updated analysis."
    assert len(public.json()["visualizations"]) == 2
    assert public.json()["hero_visualization"]["title"] == "Revenue by month"

    listing = admin_client.get("/api/v1/data-projects")
    assert "lifecycle-analysis" in [item["slug"] for item in listing.json()["items"]]

    unpublished = admin_client.patch(
        f"/api/v1/admin/data-projects/{project_id}/status",
        json={"status": "draft"},
    )
    assert unpublished.status_code == 200
    assert unpublished.json()["published_at"] is None
    assert admin_client.get("/api/v1/data-projects/lifecycle-analysis").status_code == 404

    archived = admin_client.patch(
        f"/api/v1/admin/data-projects/{project_id}/status",
        json={"status": "archived"},
    )
    assert archived.status_code == 200
    assert admin_client.get("/api/v1/data-projects/lifecycle-analysis").status_code == 404

    deleted = admin_client.delete(f"/api/v1/admin/data-projects/{project_id}")
    assert deleted.status_code == 204
    assert admin_client.get(f"/api/v1/admin/data-projects/{project_id}").status_code == 404


def test_admin_creates_taxonomy_and_uses_extra_values(
    admin_client: TestClient, db_session: Session
) -> None:
    _seed(db_session)

    category = admin_client.post(
        "/api/v1/admin/data/categories",
        json={"name": "Dashboards", "description": "Operational dashboards."},
    )
    assert category.status_code == 201, category.text
    assert category.json()["slug"] == "dashboards"

    tool = admin_client.post(
        "/api/v1/admin/data/tools",
        json={"name": "Power BI", "kind": "tool"},
    )
    assert tool.status_code == 201, tool.text
    assert tool.json()["slug"] == "power-bi"

    created = admin_client.post(
        "/api/v1/admin/data-projects",
        json={
            "title": "Dashboard Review",
            "extra_category": "Dashboards",
            "extra_tools": ["Looker Studio"],
            "project_type": "dashboard",
            "status": "published",
        },
    )
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["category"]["slug"] == "dashboards"
    assert {item["slug"] for item in body["tools"]} == {"looker-studio"}

    reference = admin_client.get("/api/v1/admin/data/reference")
    assert reference.status_code == 200
    reference_body = reference.json()
    assert "dashboards" in [item["slug"] for item in reference_body["categories"]]
    assert "looker-studio" in [item["slug"] for item in reference_body["tools"]]
    assert reference_body["chart_types"]


def test_admin_creates_project_with_brand_new_category(
    admin_client: TestClient, db_session: Session
) -> None:
    """A project may introduce a category that does not exist yet.

    Creating the category flushes the session; the project row must not be
    inserted before its category is attached.
    """

    _seed(db_session)

    created = admin_client.post(
        "/api/v1/admin/data-projects",
        json={
            "title": "Fresh Category Study",
            "extra_category": "Never Seen Category",
            "project_type": "eda",
            "status": "draft",
        },
    )
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["category"]["slug"] == "never-seen-category"
    assert body["title"] == "Fresh Category Study"


def test_invalid_chart_configuration_is_rejected(
    admin_client: TestClient, db_session: Session
) -> None:
    seed = _seed(db_session)
    eda = seed["eda"]

    base = {
        "title": "Invalid Chart Study",
        "category_id": str(eda.id),
        "project_type": "eda",
        "status": "draft",
    }

    missing_axis = admin_client.post(
        "/api/v1/admin/data-projects",
        json={**base, "visualizations": [_chart_payload(x_axis=None)]},
    )
    assert missing_axis.status_code == 422, missing_axis.text

    empty_data = admin_client.post(
        "/api/v1/admin/data-projects",
        json={**base, "visualizations": [_chart_payload(data=[])]},
    )
    assert empty_data.status_code == 422, empty_data.text

    missing_column = admin_client.post(
        "/api/v1/admin/data-projects",
        json={**base, "visualizations": [_chart_payload(y_axis="missing")]},
    )
    assert missing_column.status_code == 422, missing_column.text

    bad_scatter = admin_client.post(
        "/api/v1/admin/data-projects",
        json={
            **base,
            "visualizations": [
                _chart_payload(chart_type="scatter", y_axis=None)
            ],
        },
    )
    assert bad_scatter.status_code == 422, bad_scatter.text


def test_credentials_are_rejected(admin_client: TestClient, db_session: Session) -> None:
    seed = _seed(db_session)
    eda = seed["eda"]

    response = admin_client.post(
        "/api/v1/admin/data-projects",
        json={
            "title": "Unsafe Study",
            "category_id": str(eda.id),
            "project_type": "sql",
            "status": "draft",
            "sql_query": "postgresql://analyst:supersecret@db.internal:5432/warehouse",
        },
    )
    assert response.status_code == 400, response.text
    assert "credential" in response.json()["detail"].lower()

    other = admin_client.post(
        "/api/v1/admin/data-projects",
        json={
            "title": "Unsafe Key Study",
            "category_id": str(eda.id),
            "project_type": "eda",
            "status": "draft",
            "python_snippet": "api_key = 'sk_live_1234567890abcdef'",
        },
    )
    assert other.status_code == 400, other.text


def test_admin_data_endpoints_require_authentication(client: TestClient) -> None:
    assert client.get("/api/v1/admin/data-projects").status_code == 401
    assert client.get("/api/v1/admin/data/reference").status_code == 401
    assert client.post("/api/v1/admin/data-projects", json={}).status_code == 401
    assert client.post("/api/v1/admin/data/categories", json={"name": "X"}).status_code == 401
    assert client.post("/api/v1/admin/data/tools", json={"name": "Y"}).status_code == 401
    assert (
        client.get(
            "/api/v1/admin/data-projects/00000000-0000-0000-0000-000000000000"
        ).status_code
        == 401
    )
