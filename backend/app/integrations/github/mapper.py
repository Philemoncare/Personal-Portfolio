"""Map GitHub repository intelligence onto the existing portfolio models.

Import rules:

* a draft project is always created; publication stays manual
* editorial fields are filled only from documented repository content
* missing facts use explicit language instead of invented claims
* sync never overwrites editorial fields
"""

from __future__ import annotations

import json
import logging
import posixpath
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.constants import PROJECT_STAGES, WORK_MODES
from app.integrations.github.client import GitHubClient
from app.integrations.github.contents import download_image
from app.integrations.github.parser import (
    NOT_DOCUMENTED,
    first_paragraph,
    repository_name_to_title,
)
from app.integrations.github.repositories import (
    analyze_repository,
    get_languages,
    get_repository,
)
from app.models import AdminUser, GitHubImportLog, Project, ProjectCategory, ProjectMedia
from app.schemas.admin import CaseStudyInput, ProjectInput
from app.schemas.github import (
    GitHubImportRequest,
    GitHubRepositoryOut,
    GitHubSyncOut,
    RepositoryInspectionOut,
)
from app.services import media as media_service
from app.services import project_admin

logger = logging.getLogger("portfolio.github")

# Editorial fields that manual sync must never touch.
PORTFOLIO_OWNED_FIELDS = (
    "title",
    "slug",
    "summary",
    "body",
    "category",
    "secondary_categories",
    "technologies",
    "role",
    "year",
    "started_on",
    "completed_on",
    "featured",
    "project_status",
    "status",
    "public_visibility",
    "sort_order",
    "cover_image",
    "media",
    "seo_title",
    "seo_description",
    "og_image",
    "embed_enabled",
    "last_verified_at",
    "deployment_provider",
    "deployment_status",
)


class DuplicateRepositoryError(Exception):
    def __init__(self, project: Project) -> None:
        super().__init__("This repository is already linked to a portfolio project.")
        self.project = project


class GitHubImportError(Exception):
    def __init__(self, message: str, *, status_code: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def record_log(
    db: Session,
    *,
    admin: AdminUser | None,
    project: Project | None,
    repository_id: str,
    repository_full_name: str,
    action: str,
    status: str = "success",
    summary: str | None = None,
    details: dict[str, Any] | None = None,
    error_message: str | None = None,
) -> GitHubImportLog:
    log = GitHubImportLog(
        user_id=admin.id if admin else None,
        project_id=project.id if project else None,
        repository_id=str(repository_id),
        repository_full_name=repository_full_name[:300],
        action=action,
        status=status,
        summary=summary,
        details=details,
        error_message=error_message,
        created_at=datetime.now(UTC),
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def _iso(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


def provider_metadata(repository: GitHubRepositoryOut) -> dict[str, Any]:
    """JSON-safe GitHub-owned metadata; never editorial content."""

    return {
        "description": repository.description,
        "homepage": repository.homepage,
        "topics": repository.topics,
        "license": repository.license,
        "watchers_count": repository.watchers_count,
        "open_issues_count": repository.open_issues_count,
        "stargazers_count": repository.stargazers_count,
        "forks_count": repository.forks_count,
        "language": repository.language,
        "languages": repository.languages,
        "visibility": repository.visibility,
        "default_branch": repository.default_branch,
        "created_at": _iso(repository.created_at),
        "updated_at": _iso(repository.updated_at),
        "pushed_at": _iso(repository.pushed_at),
        "archived": repository.archived,
        "fork": repository.fork,
        "size_kb": repository.size_kb,
    }


def _apply_provider_fields(project: Project, repository: GitHubRepositoryOut) -> list[str]:
    """Write GitHub-owned fields and report which ones changed."""

    changed: list[str] = []

    def set_value(name: str, value: Any) -> None:
        if getattr(project, name) != value:
            setattr(project, name, value)
            changed.append(name)

    now = datetime.now(UTC)
    set_value("github_repository_id", repository.id)
    set_value("github_owner", repository.owner)
    set_value("github_repository_name", repository.name)
    set_value("github_default_branch", repository.default_branch)
    set_value("github_visibility", repository.visibility)
    set_value("github_is_fork", repository.fork)
    set_value("github_is_archived", repository.archived)
    set_value("github_repository_updated_at", repository.updated_at)
    set_value("github_url", repository.html_url)
    set_value("github_stars", repository.stargazers_count)
    set_value("github_forks", repository.forks_count)
    set_value("github_language", repository.language)
    set_value("github_open_issues", repository.open_issues_count)
    set_value("github_metadata_checked_at", now)
    set_value("github_last_synced_at", now)
    set_value("github_metadata", provider_metadata(repository))
    return changed


def _resolve_category(
    db: Session,
    requested_id: uuid.UUID | None,
    suggestions: list[Any],
) -> ProjectCategory:
    if requested_id is not None:
        category = db.get(ProjectCategory, requested_id)
        if category is None:
            raise GitHubImportError("The selected category does not exist.")
        return category

    slugs = [suggestion.slug for suggestion in suggestions]
    for slug in slugs:
        category = db.scalar(select(ProjectCategory).where(ProjectCategory.slug == slug))
        if category is not None:
            return category
    for suggestion in suggestions:
        category = db.scalar(
            select(ProjectCategory).where(ProjectCategory.name == suggestion.name)
        )
        if category is not None:
            return category
    category = db.scalar(
        select(ProjectCategory).order_by(ProjectCategory.sort_order, ProjectCategory.name)
    )
    if category is None:
        raise GitHubImportError(
            "Create at least one project category before importing from GitHub."
        )
    return category


def _documented_overview(inspection: RepositoryInspectionOut) -> str | None:
    for section in inspection.readme_sections:
        if section.key == "overview" and section.documented:
            return section.content
    if inspection.readme.content:
        return first_paragraph(inspection.readme.content)
    return None


def _normalise_mode(value: str) -> str:
    return value if value in WORK_MODES else "build"


def _normalise_stage(value: str) -> str:
    return value if value in PROJECT_STAGES else "in_progress"


def _media_trace(
    *, repository: GitHubRepositoryOut, path: str, source_url: str | None
) -> str:
    return json.dumps(
        {
            "provider": "github",
            "repository": repository.full_name,
            "repository_id": repository.id,
            "repository_path": path,
            "github_url": source_url
            or f"https://github.com/{repository.full_name}/blob/HEAD/{path}",
            "imported_at": datetime.now(UTC).isoformat(),
        },
        separators=(",", ":"),
    )


def _next_media_order(project: Project) -> int:
    orders = [item.sort_order for item in project.media]
    return (max(orders) + 10) if orders else 0


async def import_repository_image(
    db: Session,
    *,
    admin: AdminUser,
    client: GitHubClient,
    project: Project,
    inspection: RepositoryInspectionOut,
    path: str,
    role: str,
    alt_text: str | None = None,
    caption: str | None = None,
) -> tuple[str, str]:
    """Download one README image into the media library.

    Returns (media_url, local_path). Raises GitHubError on provider problems.
    """

    detected = {image.path for image in inspection.images.items}
    if path not in detected:
        raise GitHubImportError(
            "That image is not referenced by the repository README. "
            "Choose one of the detected images."
        )

    image = next(item for item in inspection.images.items if item.path == path)
    data, mime = await download_image(
        client, inspection.repository.full_name, path
    )
    filename = posixpath.basename(path)
    asset = media_service.store(
        db,
        uploader=admin,
        original_filename=filename,
        content_type=mime,
        data=data,
        title=media_service.safe_title(filename),
        alt_text=alt_text or media_service.safe_title(filename),
        folder="projects",
    )
    asset.notes = _media_trace(
        repository=inspection.repository, path=path, source_url=image.source_url
    )
    asset.attached_to_type = "project"
    asset.attached_to_id = project.id
    if caption:
        asset.caption = caption

    if role == "cover":
        project.cover_image = asset.url
    else:
        project.media.append(
            ProjectMedia(
                url=asset.url,
                alt_text=(alt_text or asset.alt_text)[:300],
                caption=(caption or asset.caption or None),
                media_type="image",
                sort_order=_next_media_order(project),
            )
        )
    db.commit()
    db.refresh(project)
    logger.info(
        "Imported repository image repo=%s path=%s asset=%s",
        inspection.repository.full_name,
        path,
        asset.id,
    )
    return asset.url, asset.filename


async def import_repository(
    db: Session,
    *,
    admin: AdminUser,
    client: GitHubClient,
    repository_id: str,
    payload: GitHubImportRequest,
) -> tuple[Project, GitHubImportLog]:
    from app.integrations.github.repositories import project_for_repository

    existing = project_for_repository(db, repository_id)
    if existing is not None:
        raise DuplicateRepositoryError(existing)

    inspection = await analyze_repository(client, repository_id)
    repository = inspection.repository
    category = _resolve_category(db, payload.category_id, inspection.category_suggestions)

    title = (payload.title or "").strip() or repository_name_to_title(repository.name)
    summary = (
        payload.summary.strip()
        if payload.summary and payload.summary.strip()
        else repository.description
    )
    if not summary and payload.use_readme:
        summary = _documented_overview(inspection)
        if summary:
            summary = summary[:280]
    if summary:
        summary = summary.strip()[:400]

    body = payload.body.strip() if payload.body and payload.body.strip() else None
    if body is None and payload.use_readme:
        body = _documented_overview(inspection)

    live_candidate = next(
        (item for item in inspection.live_url_candidates if item.confidence == "high"),
        inspection.live_url_candidates[0] if inspection.live_url_candidates else None,
    )
    live_url = (payload.live_url or "").strip() or (
        live_candidate.url if live_candidate else None
    )
    if live_url:
        live_url = live_url[:500]
    documentation_url = (payload.documentation_url or "").strip() or inspection.documentation_url
    if documentation_url:
        documentation_url = documentation_url[:500]

    technology_names = [
        name.strip() for name in payload.technology_names if name.strip()
    ] or [tech.name for tech in inspection.technologies]

    sort_order = int(db.scalar(select(func.max(Project.sort_order))) or 0) + 10
    project_input = ProjectInput(
        title=title,
        slug=None,
        summary=summary,
        body=body,
        category_id=category.id,
        extra_technologies=technology_names,
        primary_mode=_normalise_mode(payload.primary_mode),
        project_status=_normalise_stage(payload.project_status),
        status="draft",
        featured=payload.featured,
        github_url=repository.html_url,
        repository_url=repository.html_url,
        live_url=live_url,
        documentation_url=documentation_url,
        deployment_status="not_deployed",
        public_visibility=True,
        sort_order=sort_order,
        media=[],
    )
    project = project_admin.create_project(db, project_input)
    _apply_provider_fields(project, repository)
    project.github_sync_enabled = True
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        duplicate = project_for_repository(db, repository_id)
        if duplicate is not None:
            raise DuplicateRepositoryError(duplicate) from exc
        raise
    db.refresh(project)

    images_imported = 0
    warnings: list[str] = []
    if payload.import_images:
        selected: list[tuple[str, str]] = []
        if payload.cover_image_path:
            selected.append((payload.cover_image_path, "cover"))
        for path in payload.gallery_image_paths:
            if path and path != payload.cover_image_path:
                selected.append((path, "gallery"))
        for path, role in selected:
            try:
                await import_repository_image(
                    db,
                    admin=admin,
                    client=client,
                    project=project,
                    inspection=inspection,
                    path=path,
                    role=role,
                )
                images_imported += 1
            except GitHubImportError as exc:
                warnings.append(exc.message)
            except Exception as exc:  # provider or file failure must not lose the draft
                logger.warning("Repository image import failed: %s", type(exc).__name__)
                warnings.append(f"{path} could not be imported.")

    case_study_id: uuid.UUID | None = None
    if payload.case_study:
        case_study = project_admin.create_case_study(
            db,
            CaseStudyInput(
                project_id=project.id,
                title=f"{project.title} case study",
                slug=None,
                summary=inspection.case_study.overview,
                overview=inspection.case_study.overview,
                problem=inspection.case_study.problem,
                solution=inspection.case_study.solution,
                features=inspection.case_study.features,
                architecture=inspection.case_study.architecture,
                technology=inspection.case_study.technology,
                implementation=inspection.case_study.implementation,
                challenges=inspection.case_study.challenges,
                testing=inspection.case_study.testing,
                results=NOT_DOCUMENTED,
                lessons=inspection.case_study.lessons,
                future_improvements=inspection.case_study.future_improvements,
                status="draft",
                featured=False,
                sort_order=0,
            ),
        )
        case_study_id = case_study.id

    db.refresh(project)
    technologies = [tech.name for tech in project.technologies]
    details = {
        "files_inspected": len(inspection.inspected_files),
        "files_skipped": len(inspection.skipped_files),
        "images_detected": len(inspection.images.items),
        "images_imported": images_imported,
        "technologies_detected": len(inspection.technologies),
        "technologies_attached": len(technologies),
        "case_study_created": case_study_id is not None,
        "case_study_id": str(case_study_id) if case_study_id else None,
        "warnings": warnings[:10],
    }
    summary_text = (
        f"Draft created from {repository.full_name}: "
        f"{len(inspection.inspected_files)} file(s) inspected, "
        f"{len(inspection.images.items)} image(s) detected, "
        f"{len(inspection.technologies)} technology signal(s)."
    )
    log = record_log(
        db,
        admin=admin,
        project=project,
        repository_id=repository.id,
        repository_full_name=repository.full_name,
        action="import",
        status="success",
        summary=summary_text,
        details=details,
    )
    return project, log


async def sync_project(
    db: Session,
    *,
    client: GitHubClient,
    project: Project,
) -> GitHubSyncOut:
    if not project.github_repository_id:
        raise GitHubImportError(
            "This project is not linked to a GitHub repository.", status_code=409
        )

    repository_id = project.github_repository_id
    raw = await get_repository(client, repository_id)
    languages = await get_languages(client, str(raw.get("full_name") or ""))
    from app.integrations.github.repositories import map_repository

    repository = map_repository(raw, languages=languages)

    if repository.id != project.github_repository_id:
        raise GitHubImportError(
            "The stored GitHub repository no longer matches this project.",
            status_code=409,
        )

    changed = _apply_provider_fields(project, repository)
    # Only fill editorial links that are empty; never replace a chosen value.
    if repository.homepage:
        if not project.live_url:
            project.live_url = repository.homepage
            changed.append("live_url")
        if not project.deployment_url:
            project.deployment_url = repository.homepage
            changed.append("deployment_url")
    if not project.repository_url:
        project.repository_url = repository.html_url
        changed.append("repository_url")

    db.commit()
    db.refresh(project)

    return GitHubSyncOut(
        project_id=project.id,
        repository_full_name=repository.full_name,
        updated_fields=sorted(set(changed)),
        preserved_fields=list(PORTFOLIO_OWNED_FIELDS),
        stars=project.github_stars,
        forks=project.github_forks,
        language=project.github_language,
        open_issues=project.github_open_issues,
        default_branch=project.github_default_branch,
        last_synced_at=project.github_last_synced_at or datetime.now(UTC),
        message="GitHub metadata updated. Editorial content was left unchanged.",
    )


def unlink_repository(db: Session, project: Project) -> None:
    project.github_repository_id = None
    project.github_owner = None
    project.github_repository_name = None
    project.github_default_branch = None
    project.github_last_synced_at = None
    project.github_repository_updated_at = None
    project.github_visibility = None
    project.github_is_fork = False
    project.github_is_archived = False
    project.github_sync_enabled = False
    db.commit()
    db.refresh(project)


def project_github_link(project: Project) -> dict[str, Any]:
    metadata = project.github_metadata if isinstance(project.github_metadata, dict) else {}
    return {
        "connected": bool(project.github_repository_id),
        "project_id": project.id,
        "repository_id": project.github_repository_id,
        "repository_full_name": (
            f"{project.github_owner}/{project.github_repository_name}"
            if project.github_owner and project.github_repository_name
            else None
        ),
        "repository_url": project.github_url,
        "owner": project.github_owner,
        "default_branch": project.github_default_branch,
        "visibility": project.github_visibility,
        "is_fork": project.github_is_fork,
        "is_archived": project.github_is_archived,
        "sync_enabled": project.github_sync_enabled,
        "last_synced_at": project.github_last_synced_at,
        "repository_updated_at": project.github_repository_updated_at,
        "description": metadata.get("description"),
        "homepage": metadata.get("homepage"),
        "topics": metadata.get("topics") or [],
    }
