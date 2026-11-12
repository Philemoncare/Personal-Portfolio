"""Idempotent local seed data.

Only content that the owner has explicitly identified is created. Every
editorial row that still needs real copy is marked `is_placeholder` so the UI
can label it honestly instead of presenting invented details.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import (
    AdminUser,
    CaseStudy,
    DataInsight,
    DataProject,
    DataProjectCategory,
    DataResource,
    DataTool,
    DataVisualization,
    NowItem,
    Project,
    ProjectCategory,
    SiteSettings,
    Technology,
    TimelineEntry,
)

logger = logging.getLogger("portfolio.seed")

ROLE_TITLE = "Full-Stack Developer"
HERO_INTRO = (
    "I build software products, work with data, and turn ideas into working systems."
)
LOCATION = "Ghana"
AVAILABILITY = "Open to collaboration"
PLACEHOLDER_SUMMARY = (
    "Project details are still being written. This entry is a publishing "
    "placeholder and is labelled as placeholder content throughout the site."
)
PLACEHOLDER_BIO = (
    "Profile bio pending. Replace this text from the admin panel with a short, "
    "factual introduction."
)
BIO = (
    "A developer who enjoys building systems and working with data. I work across "
    "software development, data analytics, technology projects, and technical leadership."
)

CATEGORIES = [
    ("Web Development", "web", 10),
    ("Data & Analytics", "data", 20),
    ("Cloud & AWS", "cloud", 30),
    ("Software", "software", 40),
    ("Academic", "academic", 50),
    ("Experiments", "experiments", 60),
    ("Other", "other", 70),
]

TECHNOLOGIES = [
    ("Python", "python", "language", 10),
    ("TypeScript", "typescript", "language", 20),
    ("React", "react", "framework", 30),
    ("FastAPI", "fastapi", "framework", 40),
    ("PostgreSQL", "postgresql", "database", 50),
    ("SQL", "sql", "language", 60),
    ("Tailwind CSS", "tailwind-css", "framework", 70),
    ("AWS", "aws", "cloud", 80),
    ("Excel", "excel", "tool", 90),
]

PROJECTS = [
    {
        "title": "SchooMA",
        "slug": "schooma",
        "summary": "Multi-tenant school management platform.",
        "category": "web",
        "secondary": ["software"],
        "technologies": ["fastapi", "postgresql", "react", "typescript", "tailwind-css"],
        "stage": "active",
        "order": 10,
    },
    {
        "title": "OmniMarket",
        "slug": "omnimarket",
        "summary": "Food delivery and rider platform.",
        "category": "web",
        "secondary": ["software"],
        "technologies": ["react", "typescript", "fastapi", "postgresql"],
        "stage": "in_progress",
        "order": 20,
    },
    {
        "title": "Signly",
        "slug": "signly",
        "summary": "Bidirectional sign-language system.",
        "category": "software",
        "secondary": ["academic", "experiments"],
        "technologies": ["python"],
        "stage": "in_progress",
        "order": 30,
    },
    {
        "title": "Career Path 360",
        "slug": "career-path-360",
        "summary": None,
        "category": "software",
        "secondary": ["data"],
        "technologies": ["python", "sql"],
        "stage": "in_progress",
        "order": 40,
    },
]

CASE_STUDIES = [
    {
        "title": "SchooMA — building a multi-tenant school platform",
        "slug": "schooma",
        "project_slug": "schooma",
        "summary": "A case study on the making of a multi-tenant school management platform.",
        "overview": (
            "SchooMA is a multi-tenant school management platform. This case study is "
            "being written section by section; sections appear here only once real "
            "content has been added from the admin panel."
        ),
        "status": "published",
        "is_placeholder": True,
        "sort_order": 10,
    },
]

NOW_ITEMS = [
    {
        "label": "Active build",
        "title": "SchooMA",
        "description": "School management platform, in active development.",
        "order": 10,
        "placeholder": False,
    },
    {
        "label": "Final-year project",
        "title": "Signly",
        "description": "Bidirectional sign-language system.",
        "order": 20,
        "placeholder": False,
    },
    {
        "label": "Learning",
        "title": "AWS / Cloud",
        "description": "Cloud learning and project work.",
        "order": 30,
        "placeholder": False,
    },
    {
        "label": "Current goals",
        "title": "Add your current goals",
        "description": "Placeholder. Add this update from the admin panel.",
        "order": 40,
        "placeholder": True,
    },
]

TIMELINE_ITEMS = [
    {"kind": "development", "title": "Full-stack projects", "order": 10},
    {"kind": "cloud", "title": "AWS / Cloud", "order": 20},
    {"kind": "project", "title": "Data & Analytics", "order": 30},
    {"kind": "leadership", "title": "Technology leadership", "order": 40},
]

# Synthetic values used only to exercise the Data Lab interface. Every public
# surface labels this project as demo data; it is not a claim about the owner's
# past work, clients, or business results.
DEMO_MONTHLY = [
    {"month": "Jan", "electronics": 42000, "groceries": 31000, "home": 18000},
    {"month": "Feb", "electronics": 44500, "groceries": 32500, "home": 19200},
    {"month": "Mar", "electronics": 47200, "groceries": 33800, "home": 20500},
    {"month": "Apr", "electronics": 45800, "groceries": 34200, "home": 21100},
    {"month": "May", "electronics": 49400, "groceries": 35600, "home": 22400},
    {"month": "Jun", "electronics": 51200, "groceries": 36100, "home": 23100},
    {"month": "Jul", "electronics": 53800, "groceries": 37400, "home": 24500},
    {"month": "Aug", "electronics": 52400, "groceries": 38200, "home": 25200},
    {"month": "Sep", "electronics": 56100, "groceries": 39600, "home": 26800},
    {"month": "Oct", "electronics": 58900, "groceries": 40800, "home": 28100},
    {"month": "Nov", "electronics": 62400, "groceries": 42100, "home": 29600},
    {"month": "Dec", "electronics": 68100, "groceries": 44700, "home": 31800},
]

DEMO_TOTALS = {
    key: sum(row[key] for row in DEMO_MONTHLY)
    for key in ("electronics", "groceries", "home")
}
DEMO_GRAND_TOTAL = sum(DEMO_TOTALS.values())
DEMO_TREND = [
    {**row, "total": row["electronics"] + row["groceries"] + row["home"]}
    for row in DEMO_MONTHLY
]
DEMO_MIX = [
    {"category": "Electronics", "revenue": DEMO_TOTALS["electronics"]},
    {"category": "Groceries", "revenue": DEMO_TOTALS["groceries"]},
    {"category": "Home", "revenue": DEMO_TOTALS["home"]},
]


def seed_categories(db: Session) -> dict[str, ProjectCategory]:
    result: dict[str, ProjectCategory] = {}
    for name, slug, order in CATEGORIES:
        category = db.scalar(select(ProjectCategory).where(ProjectCategory.slug == slug))
        if category is None:
            category = ProjectCategory(name=name, slug=slug, sort_order=order)
            db.add(category)
        else:
            category.name = name
            category.sort_order = order
        result[slug] = category
    db.flush()
    return result


def seed_technologies(db: Session) -> dict[str, Technology]:
    result: dict[str, Technology] = {}
    for name, slug, kind, order in TECHNOLOGIES:
        technology = db.scalar(select(Technology).where(Technology.slug == slug))
        if technology is None:
            technology = Technology(
                name=name,
                slug=slug,
                kind=kind,
                sort_order=order,
            )
            db.add(technology)
        result[slug] = technology
    db.flush()
    return result


def seed_projects(
    db: Session,
    categories: dict[str, ProjectCategory],
    technologies: dict[str, Technology],
) -> None:
    now = datetime.now(UTC)
    for item in PROJECTS:
        project = db.scalar(select(Project).where(Project.slug == item["slug"]))
        if project is None:
            project = Project(
                title=item["title"],
                slug=item["slug"],
                summary=item["summary"] or PLACEHOLDER_SUMMARY,
                category_id=categories[item["category"]].id,
                primary_mode="build",
                project_status=item["stage"],
                featured=True,
                status="published",
                published_at=now,
                is_placeholder=True,
                sort_order=item["order"],
            )
            project.technologies = [
                technologies[slug]
                for slug in item["technologies"]
                if slug in technologies
            ]
            project.secondary_categories = [
                categories[slug]
                for slug in item["secondary"]
                if slug in categories
            ]
            db.add(project)
        else:
            if project.is_placeholder and item["summary"]:
                # Only fill in the owner-provided summary. Never overwrite an
                # editorial record that an administrator has already completed.
                project.summary = item["summary"]
            if project.is_placeholder:
                # Provisional local-development metadata. The owner can replace
                # every field from the admin project editor.
                project.project_status = item["stage"]
                project.category = categories[item["category"]]
                project.secondary_categories = [
                    categories[slug]
                    for slug in item["secondary"]
                    if slug in categories
                ]
                project.technologies = [
                    technologies[slug]
                    for slug in item["technologies"]
                    if slug in technologies
                ]


def seed_case_studies(db: Session) -> None:
    now = datetime.now(UTC)
    for item in CASE_STUDIES:
        existing = db.scalar(select(CaseStudy).where(CaseStudy.slug == item["slug"]))
        if existing is not None:
            continue
        project = db.scalar(select(Project).where(Project.slug == item["project_slug"]))
        db.add(
            CaseStudy(
                project_id=project.id if project else None,
                title=item["title"],
                slug=item["slug"],
                summary=item["summary"],
                overview=item["overview"],
                status=item["status"],
                published_at=now if item["status"] == "published" else None,
                is_placeholder=item["is_placeholder"],
                sort_order=item["sort_order"],
                result_type="qualitative",
            )
        )


def seed_data_lab(db: Session) -> None:
    """Create one visible demo analysis; never imply it is the owner's work."""

    category = db.scalar(
        select(DataProjectCategory).where(
            DataProjectCategory.slug == "exploratory-data-analysis"
        )
    )
    if category is None:
        category = DataProjectCategory(
            name="Exploratory Data Analysis",
            slug="exploratory-data-analysis",
            description=(
                "Question-led analysis of a dataset, including preparation, "
                "exploration, and interpretation."
            ),
            sort_order=10,
        )
        db.add(category)
        db.flush()

    tool_specs = [
        ("Python", "python", "language", 10),
        ("Pandas", "pandas", "library", 20),
        ("SQL", "sql", "language", 30),
        ("PostgreSQL", "postgresql", "database", 40),
    ]
    tools: list[DataTool] = []
    for name, slug, kind, order in tool_specs:
        tool = db.scalar(select(DataTool).where(DataTool.slug == slug))
        if tool is None:
            tool = DataTool(name=name, slug=slug, kind=kind, sort_order=order)
            db.add(tool)
            db.flush()
        tools.append(tool)

    existing = db.scalar(
        select(DataProject).where(DataProject.slug == "retail-sales-demo")
    )
    if existing is not None:
        return

    now = datetime.now(UTC)
    share = {
        label: f"{(value / DEMO_GRAND_TOTAL) * 100:.1f}%"
        for label, value in (
            ("Electronics", DEMO_TOTALS["electronics"]),
            ("Groceries", DEMO_TOTALS["groceries"]),
            ("Home", DEMO_TOTALS["home"]),
        )
    }

    project = DataProject(
        title="Retail Sales Patterns — Demo Analysis",
        slug="retail-sales-demo",
        short_description=(
            "A clearly labelled synthetic retail dataset used to demonstrate the "
            "Data Lab's charts, KPIs, tables, and analysis structure. Not a claim "
            "about real clients, revenue, or personal results."
        ),
        description=(
            "This is a demonstration project. The dataset was generated for "
            "interface testing, not collected from a real business. It exists so "
            "the Data Lab's analysis pages, visualization components, and "
            "accessibility fallbacks can be reviewed end to end."
        ),
        keywords="demo, synthetic data, exploratory analysis, retail, charts",
        category_id=category.id,
        project_type="eda",
        status="published",
        published_at=now,
        year=now.year,
        featured=True,
        is_placeholder=False,
        is_demo=True,
        question=(
            "How does monthly revenue vary across product categories in this "
            "synthetic retail extract?"
        ),
        why_it_matters=(
            "In a real engagement, this question would test whether revenue is "
            "concentrated in one category, whether it is seasonal, and where a "
            "team should focus attention. Here it demonstrates how the analysis "
            "would be framed without inventing a real business outcome."
        ),
        dataset_name="Synthetic retail transactions (demo)",
        dataset_source="Generated for Data Lab interface testing",
        dataset_description=(
            "Twelve months of categorised sales rows with synthetic revenue "
            "values. No real customer, client, or company data is present."
        ),
        dataset_rows=240,
        dataset_columns=8,
        dataset_time_period="January – December (synthetic)",
        dataset_type="CSV",
        dataset_license="Generated demo data; not distributed",
        dataset_is_public=True,
        dataset_note=(
            "The row and column counts describe the generated test extract. They "
            "are demo metadata, not a real dataset inventory."
        ),
        data_preparation=(
            "For the demo, the generated rows were checked for consistent month "
            "labels, numeric revenue values, and a single category per row. No "
            "real cleaning claims are being made; the preparation steps are "
            "documented to show where that work belongs in a project."
        ),
        methodology=(
            "The demo groups synthetic revenue by month and category, compares "
            "category totals, and reviews the monthly trend. In a real project "
            "this section would state the SQL, Python, Excel, or statistical "
            "method actually used, with assumptions and validation."
        ),
        analysis=(
            "The synthetic extract grows across the year and electronics is the "
            "largest category by revenue. The pattern is visible in the bar, "
            "line, donut, and table views below. It is a constructed example, "
            "not an observed business result."
        ),
        sql_query=(
            "SELECT\n"
            "    category,\n"
            "    ROUND(SUM(revenue), 2) AS total_revenue,\n"
            "    COUNT(*) AS rows\n"
            "FROM demo_retail_sales\n"
            "GROUP BY category\n"
            "ORDER BY total_revenue DESC;"
        ),
        sql_result=[
            {
                "category": label,
                "total_revenue": value,
                "rows": 80,
            }
            for label, value in (
                ("Electronics", DEMO_TOTALS["electronics"]),
                ("Groceries", DEMO_TOTALS["groceries"]),
                ("Home", DEMO_TOTALS["home"]),
            )
        ],
        python_snippet=(
            "import pandas as pd\n\n"
            'sales = pd.read_csv("demo_retail_sales.csv")\n'
            'monthly = sales.groupby(["month", "category"])["revenue"].sum().unstack()\n'
            'monthly.plot(kind="bar", stacked=True)'
        ),
        what_the_data_shows=(
            "In this synthetic dataset, demo revenue rises from January to "
            "December and electronics contributes the largest share of the total."
        ),
        why_the_findings_matter=(
            "The structure shows how a real analysis would separate category "
            "performance from seasonal movement. It also shows why a single "
            "aggregate number is not enough to support a decision."
        ),
        what_i_would_do_next=(
            "With a real dataset I would validate the revenue definition, test "
            "whether the December rise is seasonal or driven by one category, and "
            "compare the pattern against a baseline before making a recommendation."
        ),
        key_findings=(
            "Electronics leads the demo revenue mix. Demo revenue is higher in "
            "the second half of the synthetic year. These are generated patterns "
            "used to test the presentation layer."
        ),
        recommendations=(
            "Do not present this project as real analysis. Replace it with a "
            "documented dataset, or archive it once the demo is no longer needed."
        ),
        limitations=(
            "The data is synthetic. It does not describe a real business, "
            "customer base, region, or time period. The visual patterns were "
            "constructed for interface testing and should not be interpreted as "
            "evidence about any market or organisation."
        ),
        conclusion=(
            "The demo confirms that the Data Lab can carry a question, dataset, "
            "method, visualization, and interpretation from the database to the "
            "public page. Real analysis content must replace it before it is "
            "read as portfolio evidence."
        ),
        seo_title="Retail Sales Patterns — Demo Data | Data Lab",
        seo_description=(
            "A clearly labelled synthetic retail dataset demonstrating the Data "
            "Lab's analysis structure. Demo data only."
        ),
        sort_order=10,
    )
    project.tools = tools
    project.visualizations = [
        DataVisualization(
            chart_type="bar",
            title="Monthly demo revenue by category",
            description=(
                "Synthetic revenue grouped by month and category. Electronics "
                "is the largest series throughout the generated year."
            ),
            data=DEMO_MONTHLY,
            x_axis="month",
            y_axis="electronics",
            series=["electronics", "groceries", "home"],
            display_order=10,
            source_note="Synthetic demo values generated for interface testing.",
        ),
        DataVisualization(
            chart_type="line",
            title="Demo revenue trend",
            description="Total synthetic revenue by month across all categories.",
            data=DEMO_TREND,
            x_axis="month",
            y_axis="total",
            series=[],
            display_order=20,
            source_note="Synthetic demo values generated for interface testing.",
        ),
        DataVisualization(
            chart_type="donut",
            title="Category share of demo revenue",
            description="Synthetic revenue share by category across the full year.",
            data=DEMO_MIX,
            x_axis="category",
            y_axis="revenue",
            series=[],
            display_order=30,
            source_note="Synthetic demo values generated for interface testing.",
        ),
        DataVisualization(
            chart_type="kpi",
            title="Demo extract at a glance",
            description=(
                "Values describe the generated demonstration extract, not a real "
                "business."
            ),
            data=[
                {"label": "Rows in demo extract", "value": 240},
                {"label": "Categories tracked", "value": 3},
                {"label": "Months covered", "value": 12},
                {"label": "Demo revenue total", "value": DEMO_GRAND_TOTAL},
            ],
            display_order=40,
            source_note="Synthetic demo values generated for interface testing.",
        ),
        DataVisualization(
            chart_type="table",
            title="Category performance",
            description=(
                "Synthetic revenue totals and shares for each category in the "
                "demo extract."
            ),
            data=[
                {
                    "category": "Electronics",
                    "demo_revenue": DEMO_TOTALS["electronics"],
                    "share": share["Electronics"],
                },
                {
                    "category": "Groceries",
                    "demo_revenue": DEMO_TOTALS["groceries"],
                    "share": share["Groceries"],
                },
                {
                    "category": "Home",
                    "demo_revenue": DEMO_TOTALS["home"],
                    "share": share["Home"],
                },
            ],
            display_order=50,
            source_note="Synthetic demo values generated for interface testing.",
        ),
    ]
    project.insights = [
        DataInsight(
            title="Electronics leads the demo mix",
            key_insight=(
                f"Electronics accounts for {share['Electronics']} of synthetic "
                "demo revenue."
            ),
            possible_explanation=(
                "The values were generated for testing, so the pattern reflects "
                "the construction of the demo dataset rather than a market "
                "explanation."
            ),
            recommendation=(
                "Use a real dataset and a defined revenue measure before drawing "
                "a commercial conclusion."
            ),
            display_order=10,
        ),
        DataInsight(
            title="The generated trend rises late in the year",
            key_insight=(
                "Demo revenue is higher in the second half of the synthetic year."
            ),
            possible_explanation=(
                "The demonstration values increase over time by construction; "
                "seasonality has not been measured."
            ),
            recommendation=(
                "In a real analysis, test seasonality against multiple years and "
                "compare categories separately."
            ),
            display_order=20,
        ),
        DataInsight(
            title="One aggregate is not enough",
            key_insight=(
                "Category mix changes even when the monthly total is rising."
            ),
            possible_explanation=(
                "A total can hide which category is driving change, which is why "
                "the demo shows both the trend and the mix."
            ),
            recommendation=(
                "Report category-level movement alongside totals in future "
                "analysis."
            ),
            display_order=30,
        ),
    ]
    project.resources = [
        DataResource(
            title="Synthetic retail transactions (demo)",
            resource_type="dataset",
            url=None,
            description=(
                "Generated for interface testing. No file is distributed and the "
                "data is not a real business record."
            ),
            display_order=10,
        ),
        DataResource(
            title="Demo analysis notebook",
            resource_type="notebook",
            url=None,
            description=(
                "The demonstration workflow is described on this page. No private "
                "notebook is published."
            ),
            display_order=20,
        ),
    ]
    db.add(project)


def seed_now(db: Session) -> None:
    now = datetime.now(UTC)
    for item in NOW_ITEMS:
        existing = db.scalar(select(NowItem).where(NowItem.sort_order == item["order"]))
        if existing is None:
            db.add(
                NowItem(
                    label=item["label"],
                    title=item["title"],
                    description=item["description"],
                    status="published",
                    published_at=now,
                    is_placeholder=item["placeholder"],
                    sort_order=item["order"],
                )
            )
        elif existing.is_placeholder:
            existing.label = item["label"]
            existing.title = item["title"]
            existing.description = item["description"]
            existing.is_placeholder = item["placeholder"]


def seed_timeline(db: Session) -> None:
    now = datetime.now(UTC)
    year = now.year
    for item in TIMELINE_ITEMS:
        existing = db.scalar(
            select(TimelineEntry).where(
                TimelineEntry.year == year,
                TimelineEntry.title == item["title"],
            )
        )
        if existing is None:
            db.add(
                TimelineEntry(
                    year=year,
                    month=None,
                    kind=item["kind"],
                    title=item["title"],
                    description=None,
                    status="published",
                    published_at=now,
                    is_placeholder=True,
                    sort_order=item["order"],
                )
            )


def seed_settings(db: Session) -> None:
    existing = db.get(SiteSettings, 1)
    if existing is None:
        db.add(
            SiteSettings(
                id=1,
                display_name="Phill",
                role_title=ROLE_TITLE,
                hero_intro=HERO_INTRO,
                bio=BIO,
                location=LOCATION,
                availability=AVAILABILITY,
                seo_title="Phill - Full-Stack Developer",
                seo_description=HERO_INTRO,
                is_placeholder=True,
            )
        )
    elif existing.is_placeholder:
        existing.role_title = ROLE_TITLE
        existing.hero_intro = HERO_INTRO
        existing.bio = BIO
        existing.location = LOCATION
        existing.availability = AVAILABILITY
        existing.seo_title = existing.seo_title or "Phill - Full-Stack Developer"
        existing.seo_description = existing.seo_description or HERO_INTRO


def seed_admin(db: Session) -> None:
    email = settings.admin_email
    password = settings.admin_password

    if not email or not password:
        logger.warning(
            "ADMIN_EMAIL or ADMIN_PASSWORD is not set; no administrator was created."
        )
        return
    if len(password) < 12:
        raise SystemExit("ADMIN_PASSWORD must be at least 12 characters.")

    existing = db.scalar(select(AdminUser).where(AdminUser.email == email.lower()))
    if existing is not None:
        return

    db.add(AdminUser(email=email.lower(), password_hash=hash_password(password)))
    logger.info("Created administrator %s", email)


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    with SessionLocal() as db:
        seed_settings(db)
        categories = seed_categories(db)
        technologies = seed_technologies(db)
        seed_projects(db, categories, technologies)
        seed_case_studies(db)
        seed_data_lab(db)
        seed_now(db)
        seed_timeline(db)
        seed_admin(db)
        db.commit()

    logger.info("Seed complete.")


if __name__ == "__main__":
    main()
