"""Write operations for the Data Lab administrator editor."""

from __future__ import annotations

import re
import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    DataInsight,
    DataProject,
    DataProjectCategory,
    DataResource,
    DataTool,
    DataVisualization,
)
from app.schemas.data_admin import (
    DataCategoryInput,
    DataProjectInput,
    DataToolInput,
)

SECRET_PATTERNS = [
    re.compile(r"postgres(?:ql)?://[^\s:@/]+:[^\s@/]+@", re.IGNORECASE),
    re.compile(
        r"(?:password|passwd|api[_-]?key|client[_-]?secret|access[_-]?token)"
        r"\s*[:=]\s*['\"]?[A-Za-z0-9_\-./]{8,}",
        re.IGNORECASE,
    ),
]


class AdminInputError(Exception):
    """A validation problem that should be reported as a 400 response."""


def slugify(value: str, max_length: int = 200) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug[:max_length].strip("-")


def _unique_slug(
    db: Session, slug: str, exclude_id: uuid.UUID | None = None
) -> str:
    base = slug
    candidate = base
    suffix = 2
    while True:
        statement = select(DataProject.id).where(DataProject.slug == candidate)
        if exclude_id is not None:
            statement = statement.where(DataProject.id != exclude_id)
        if db.scalar(statement) is None:
            return candidate
        candidate = f"{base}-{suffix}"
        suffix += 1


def _apply_publish_state(project: DataProject, status: str) -> None:
    project.status = status
    if status == "published":
        if project.published_at is None:
            project.published_at = datetime.now(UTC)
    else:
        project.published_at = None


def _reject_secrets(project: DataProject) -> None:
    """Fail closed when code or copy obviously contains credentials."""

    candidates = [
        project.sql_query,
        project.python_snippet,
        project.methodology,
        project.data_preparation,
        project.description,
        project.dataset_source,
        project.github_url,
        project.notebook_url,
        project.dashboard_url,
    ]
    for value in candidates:
        if not value:
            continue
        for pattern in SECRET_PATTERNS:
            if pattern.search(value):
                raise AdminInputError(
                    "This content appears to contain a credential or private "
                    "connection string. Remove secrets before saving."
                )


def _resolve_category(
    db: Session,
    payload: DataProjectInput,
    current: DataProjectCategory | None = None,
) -> DataProjectCategory:
    if payload.extra_category:
        label = payload.extra_category.strip()
        if label:
            slug = slugify(label, 100)
            if not slug:
                raise AdminInputError("The new category needs a valid name.")
            category = db.scalar(
                select(DataProjectCategory).where(DataProjectCategory.slug == slug)
            )
            if category is None:
                category = DataProjectCategory(
                    name=label, slug=slug, sort_order=900
                )
                db.add(category)
                db.flush()
            return category

    if payload.category_id is not None:
        category = db.get(DataProjectCategory, payload.category_id)
        if category is None:
            raise AdminInputError("The selected category could not be found.")
        return category

    if current is not None:
        return current

    raise AdminInputError("Choose a category or add a new one.")


def _resolve_tools(db: Session, payload: DataProjectInput) -> list[DataTool]:
    tools: list[DataTool] = []
    if payload.tool_ids:
        rows = list(
            db.scalars(select(DataTool).where(DataTool.id.in_(payload.tool_ids))).all()
        )
        if len(rows) != len(set(payload.tool_ids)):
            raise AdminInputError("One or more selected tools could not be found.")
        tools.extend(rows)

    for name in payload.extra_tools:
        label = name.strip()
        if not label:
            continue
        slug = slugify(label, 100)
        if not slug:
            continue
        tool = db.scalar(select(DataTool).where(DataTool.slug == slug))
        if tool is None:
            tool = DataTool(name=label, slug=slug, kind="tool", sort_order=900)
            db.add(tool)
            db.flush()
        if tool not in tools:
            tools.append(tool)
    return tools


def _replace_children(db: Session, project: DataProject, payload: DataProjectInput) -> None:
    project.visualizations = [
        DataVisualization(
            chart_type=item.chart_type,
            title=item.title.strip(),
            description=item.description,
            data=item.data,
            x_axis=item.x_axis,
            y_axis=item.y_axis,
            series=item.series,
            display_order=item.display_order or index * 10,
            source_note=item.source_note,
        )
        for index, item in enumerate(payload.visualizations)
    ]
    project.insights = [
        DataInsight(
            title=item.title,
            key_insight=item.key_insight.strip(),
            possible_explanation=item.possible_explanation,
            recommendation=item.recommendation,
            display_order=item.display_order or index * 10,
        )
        for index, item in enumerate(payload.insights)
    ]
    project.resources = [
        DataResource(
            title=item.title.strip(),
            resource_type=item.resource_type,
            url=item.url,
            description=item.description,
            display_order=item.display_order or index * 10,
        )
        for index, item in enumerate(payload.resources)
    ]


def _apply_fields(
    db: Session,
    project: DataProject,
    payload: DataProjectInput,
    *,
    is_new: bool,
) -> None:
    project.title = payload.title.strip()
    requested_slug = payload.slug or slugify(payload.title)
    if not requested_slug:
        raise AdminInputError("A web address is required.")
    project.slug = _unique_slug(
        db, requested_slug, exclude_id=None if is_new else project.id
    )

    category = _resolve_category(db, payload, None if is_new else project.category)
    if is_new:
        # Assign the foreign key directly: linking the relationship on a
        # transient project would cascade into the category flush.
        project.category_id = category.id
    else:
        project.category = category
    project.tools = _resolve_tools(db, payload)

    project.short_description = payload.short_description
    project.description = payload.description
    project.keywords = payload.keywords
    project.project_type = payload.project_type
    project.year = payload.year
    project.featured = payload.featured
    project.is_placeholder = payload.is_placeholder
    project.is_demo = payload.is_demo
    project.cover_image = payload.cover_image

    project.question = payload.question
    project.why_it_matters = payload.why_it_matters

    project.dataset_name = payload.dataset_name
    project.dataset_source = payload.dataset_source
    project.dataset_description = payload.dataset_description
    project.dataset_rows = payload.dataset_rows
    project.dataset_columns = payload.dataset_columns
    project.dataset_time_period = payload.dataset_time_period
    project.dataset_type = payload.dataset_type
    project.dataset_license = payload.dataset_license
    project.dataset_is_public = payload.dataset_is_public
    project.dataset_note = payload.dataset_note

    project.data_preparation = payload.data_preparation
    project.methodology = payload.methodology
    project.analysis = payload.analysis
    project.sql_query = payload.sql_query
    project.sql_result = payload.sql_result
    project.python_snippet = payload.python_snippet

    project.what_the_data_shows = payload.what_the_data_shows
    project.why_the_findings_matter = payload.why_the_findings_matter
    project.what_i_would_do_next = payload.what_i_would_do_next
    project.key_findings = payload.key_findings
    project.recommendations = payload.recommendations
    project.limitations = payload.limitations
    project.conclusion = payload.conclusion

    project.github_url = payload.github_url
    project.notebook_url = payload.notebook_url
    project.dashboard_url = payload.dashboard_url
    project.seo_title = payload.seo_title
    project.seo_description = payload.seo_description
    project.sort_order = payload.sort_order

    _replace_children(db, project, payload)
    _apply_publish_state(project, payload.status)
    _reject_secrets(project)


def create_project(db: Session, payload: DataProjectInput) -> DataProject:
    project = DataProject()
    # Apply fields before adding the row: resolving a brand-new category or tool
    # flushes the session, and an already-added project would be inserted with a
    # NULL category_id.
    _apply_fields(db, project, payload, is_new=True)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def update_project(
    db: Session, project: DataProject, payload: DataProjectInput
) -> DataProject:
    _apply_fields(db, project, payload, is_new=False)
    db.commit()
    db.refresh(project)
    return project


def delete_project(db: Session, project: DataProject) -> None:
    db.delete(project)
    db.commit()


def set_status(db: Session, project: DataProject, status: str) -> DataProject:
    _apply_publish_state(project, status)
    db.commit()
    db.refresh(project)
    return project


def _taxonomy_slug(db: Session, model, name: str) -> str:
    slug = slugify(name, 100)
    if not slug:
        raise AdminInputError("A name is required.")
    existing = db.scalar(select(model).where(model.slug == slug))
    if existing is not None:
        return slug
    return slug


def create_category(db: Session, payload: DataCategoryInput) -> DataProjectCategory:
    slug = _taxonomy_slug(db, DataProjectCategory, payload.name)
    category = db.scalar(
        select(DataProjectCategory).where(DataProjectCategory.slug == slug)
    )
    if category is None:
        category = DataProjectCategory(
            name=payload.name.strip(),
            slug=slug,
            description=payload.description,
            sort_order=payload.sort_order,
        )
        db.add(category)
    else:
        category.name = payload.name.strip()
        category.description = payload.description
        category.sort_order = payload.sort_order
    db.commit()
    db.refresh(category)
    return category


def create_tool(db: Session, payload: DataToolInput) -> DataTool:
    slug = _taxonomy_slug(db, DataTool, payload.name)
    tool = db.scalar(select(DataTool).where(DataTool.slug == slug))
    if tool is None:
        tool = DataTool(
            name=payload.name.strip(),
            slug=slug,
            kind=payload.kind.strip() or "tool",
            sort_order=payload.sort_order,
        )
        db.add(tool)
    else:
        tool.name = payload.name.strip()
        tool.kind = payload.kind.strip() or "tool"
        tool.sort_order = payload.sort_order
    db.commit()
    db.refresh(tool)
    return tool
