"""Write operations for the administrator project and case-study editors."""

from __future__ import annotations

import re
import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.constants import CASE_STUDY_SECTIONS
from app.models import CaseStudy, Project, ProjectCategory, ProjectMedia, Technology
from app.schemas.admin import CaseStudyInput, ProjectInput


class AdminInputError(Exception):
    """A validation problem that should be reported as a 400 response."""


def slugify(value: str, max_length: int = 160) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug[:max_length].strip("-")


def _unique_slug(
    db: Session,
    model: type[Project] | type[CaseStudy],
    slug: str,
    exclude_id: uuid.UUID | None = None,
) -> str:
    base = slug
    candidate = base
    suffix = 2
    while True:
        statement = select(model.id).where(model.slug == candidate)
        if exclude_id is not None:
            statement = statement.where(model.id != exclude_id)
        if db.scalar(statement) is None:
            return candidate
        candidate = f"{base}-{suffix}"
        suffix += 1


def _apply_publish_state(
    item: Project | CaseStudy, status: str
) -> None:
    item.status = status
    if status == "published" and item.published_at is None:
        item.published_at = datetime.now(UTC)
    if status != "published":
        item.published_at = None


def _resolve_categories(db: Session, ids: list[uuid.UUID]) -> list[ProjectCategory]:
    if not ids:
        return []
    items = list(
        db.scalars(select(ProjectCategory).where(ProjectCategory.id.in_(ids))).all()
    )
    if len(items) != len(set(ids)):
        raise AdminInputError("One or more secondary categories do not exist.")
    return items


def _resolve_technologies(db: Session, ids: list[uuid.UUID]) -> list[Technology]:
    if not ids:
        return []
    items = list(db.scalars(select(Technology).where(Technology.id.in_(ids))).all())
    if len(items) != len(set(ids)):
        raise AdminInputError("One or more technologies do not exist.")
    return items


def _resolve_category(db: Session, category_id: uuid.UUID) -> ProjectCategory:
    category = db.get(ProjectCategory, category_id)
    if category is None:
        raise AdminInputError("The selected primary category does not exist.")
    return category


def _apply_project_fields(
    db: Session,
    project: Project,
    payload: ProjectInput,
    *,
    is_new: bool,
) -> None:
    project.title = payload.title.strip()
    requested_slug = payload.slug or slugify(payload.title)
    if not requested_slug:
        raise AdminInputError("A slug is required.")
    project.slug = _unique_slug(
        db, Project, requested_slug, exclude_id=None if is_new else project.id
    )
    project.summary = payload.summary
    project.body = payload.body
    project.category = _resolve_category(db, payload.category_id)
    project.secondary_categories = _resolve_categories(
        db, payload.secondary_category_ids
    )
    project.technologies = _resolve_technologies(db, payload.technology_ids)
    for name in payload.extra_technologies:
        label = name.strip()
        if not label:
            continue
        slug = slugify(label, 80)
        existing = db.scalar(select(Technology).where(Technology.slug == slug))
        if existing is None:
            existing = Technology(name=label, slug=slug, kind="tool", sort_order=900)
            db.add(existing)
            db.flush()
        if existing not in project.technologies:
            project.technologies.append(existing)
    project.primary_mode = payload.primary_mode
    project.project_status = payload.project_status
    project.featured = payload.featured
    project.role = payload.role
    project.year = payload.year
    project.started_on = payload.started_on
    project.completed_on = payload.completed_on
    project.repository_url = payload.repository_url
    project.live_url = payload.live_url
    project.documentation_url = payload.documentation_url
    project.download_url = payload.download_url
    project.external_url = payload.external_url
    project.github_url = payload.github_url
    project.demo_url = payload.demo_url
    project.video_url = payload.video_url
    project.external_project_url = payload.external_project_url
    project.deployment_provider = payload.deployment_provider
    project.deployment_status = payload.deployment_status
    project.deployment_url = payload.deployment_url
    project.embed_enabled = payload.embed_enabled
    project.last_verified_at = payload.last_verified_at
    project.public_visibility = payload.public_visibility
    project.seo_title = payload.seo_title
    project.seo_description = payload.seo_description
    project.og_image = payload.og_image
    project.cover_image = payload.cover_image
    project.sort_order = payload.sort_order
    project.is_placeholder = payload.is_placeholder
    _apply_publish_state(project, payload.status)

    project.media = [
        ProjectMedia(
            url=item.url,
            alt_text=item.alt_text,
            caption=item.caption,
            media_type=item.media_type,
            sort_order=index * 10,
        )
        for index, item in enumerate(payload.media)
    ]


def create_project(db: Session, payload: ProjectInput) -> Project:
    project = Project()
    db.add(project)
    _apply_project_fields(db, project, payload, is_new=True)
    db.commit()
    db.refresh(project)
    return project


def update_project(db: Session, project: Project, payload: ProjectInput) -> Project:
    _apply_project_fields(db, project, payload, is_new=False)
    db.commit()
    db.refresh(project)
    return project


def delete_project(db: Session, project: Project) -> None:
    db.delete(project)
    db.commit()


def set_publish_status(db: Session, project: Project, status: str) -> Project:
    _apply_publish_state(project, status)
    db.commit()
    db.refresh(project)
    return project


def duplicate_project(db: Session, project: Project) -> Project:
    copy = Project(
        title=f"{project.title} (copy)",
        slug=_unique_slug(db, Project, f"{project.slug}-copy"),
        summary=project.summary,
        body=project.body,
        category_id=project.category_id,
        primary_mode=project.primary_mode,
        project_status=project.project_status,
        featured=False,
        role=project.role,
        year=project.year,
        started_on=project.started_on,
        completed_on=project.completed_on,
        repository_url=project.repository_url,
        live_url=project.live_url,
        documentation_url=project.documentation_url,
        download_url=project.download_url,
        external_url=project.external_url,
        github_url=project.github_url,
        demo_url=project.demo_url,
        video_url=project.video_url,
        external_project_url=project.external_project_url,
        deployment_provider=project.deployment_provider,
        deployment_status=project.deployment_status,
        deployment_url=project.deployment_url,
        embed_enabled=project.embed_enabled,
        last_verified_at=project.last_verified_at,
        public_visibility=project.public_visibility,
        seo_title=project.seo_title,
        seo_description=project.seo_description,
        og_image=project.og_image,
        github_stars=project.github_stars,
        github_forks=project.github_forks,
        github_language=project.github_language,
        github_open_issues=project.github_open_issues,
        github_metadata_checked_at=project.github_metadata_checked_at,
        cover_image=project.cover_image,
        sort_order=project.sort_order + 1,
        status="draft",
        published_at=None,
        is_placeholder=project.is_placeholder,
    )
    copy.technologies = list(project.technologies)
    copy.secondary_categories = list(project.secondary_categories)
    copy.media = [
        ProjectMedia(
            url=item.url,
            alt_text=item.alt_text,
            caption=item.caption,
            media_type=item.media_type,
            sort_order=item.sort_order,
        )
        for item in project.media
    ]
    db.add(copy)
    db.commit()
    db.refresh(copy)
    return copy


def reorder_projects(db: Session, ids: list[uuid.UUID]) -> int:
    projects = {
        item.id: item
        for item in db.scalars(select(Project).where(Project.id.in_(ids))).all()
    }
    for index, project_id in enumerate(ids):
        project = projects.get(project_id)
        if project is not None:
            project.sort_order = (index + 1) * 10
    db.commit()
    return len(projects)


def _apply_case_study_fields(
    db: Session,
    study: CaseStudy,
    payload: CaseStudyInput,
    *,
    is_new: bool,
) -> None:
    if payload.project_id is not None and db.get(Project, payload.project_id) is None:
        raise AdminInputError("The selected project does not exist.")

    unknown_sections = set(payload.hidden_sections) - set(CASE_STUDY_SECTIONS)
    if unknown_sections:
        raise AdminInputError(
            f"Unknown case-study sections: {', '.join(sorted(unknown_sections))}."
        )

    study.project_id = payload.project_id
    study.title = payload.title.strip()
    requested_slug = payload.slug or slugify(payload.title, 200)
    if not requested_slug:
        raise AdminInputError("A slug is required.")
    study.slug = _unique_slug(
        db, CaseStudy, requested_slug, exclude_id=None if is_new else study.id
    )
    for field in (
        "summary",
        "overview",
        "problem",
        "context",
        "goals",
        "idea",
        "research",
        "planning",
        "design",
        "solution",
        "role",
        "architecture",
        "technology",
        "key_features",
        "technical_decisions",
        "challenges",
        "implementation",
        "testing",
        "results",
        "result_type",
        "lessons",
        "future_improvements",
    ):
        setattr(study, field, getattr(payload, field))
    study.hidden_sections = list(payload.hidden_sections)
    study.featured = payload.featured
    study.sort_order = payload.sort_order
    study.is_placeholder = payload.is_placeholder
    _apply_publish_state(study, payload.status)


def create_case_study(db: Session, payload: CaseStudyInput) -> CaseStudy:
    study = CaseStudy()
    _apply_case_study_fields(db, study, payload, is_new=True)
    db.add(study)
    db.commit()
    db.refresh(study)
    return study


def update_case_study(
    db: Session, study: CaseStudy, payload: CaseStudyInput
) -> CaseStudy:
    _apply_case_study_fields(db, study, payload, is_new=False)
    db.commit()
    db.refresh(study)
    return study


def delete_case_study(db: Session, study: CaseStudy) -> None:
    db.delete(study)
    db.commit()
