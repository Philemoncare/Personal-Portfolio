"""Repository listing, metadata, and repository intelligence."""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.integrations.github.client import GitHubClient, GitHubError, parse_timestamp
from app.integrations.github.contents import (
    extract_images,
    get_readme,
    inspect_repository_files,
)
from app.integrations.github.parser import (
    NOT_DOCUMENTED,
    build_case_study,
    contains_secret,
    detect_architecture,
    detect_documentation_url,
    detect_live_urls,
    detect_technologies,
    first_paragraph,
    readme_groups,
    readme_sections,
    suggest_categories,
)
from app.models import Project
from app.schemas.github import (
    GitHubActivityOut,
    GitHubCommitOut,
    GitHubContentsOut,
    GitHubRepositoryOut,
    RepositoryInspectionOut,
)

logger = logging.getLogger("portfolio.github")


def _license_name(raw: dict[str, Any]) -> str | None:
    license_value = raw.get("license")
    if isinstance(license_value, dict):
        return license_value.get("spdx_id") or license_value.get("name")
    return None


def map_repository(
    raw: dict[str, Any],
    *,
    link: Project | None = None,
    languages: dict[str, int] | None = None,
) -> GitHubRepositoryOut:
    owner = raw.get("owner") if isinstance(raw.get("owner"), dict) else {}
    private = bool(raw.get("private"))
    visibility = raw.get("visibility") or ("private" if private else "public")
    repo_id = str(raw.get("id") or "")

    state = "not_imported"
    sync_available = False
    if link is not None:
        state = link.status
        if link.github_last_synced_at is None:
            sync_available = True
        else:
            remote_updated = parse_timestamp(raw.get("updated_at"))
            last_synced = link.github_last_synced_at
            if remote_updated and last_synced:
                if last_synced.tzinfo is None:
                    last_synced = last_synced.replace(tzinfo=UTC)
                sync_available = remote_updated > last_synced

    return GitHubRepositoryOut(
        id=repo_id,
        name=str(raw.get("name") or ""),
        full_name=str(raw.get("full_name") or ""),
        description=raw.get("description"),
        owner=str(owner.get("login") or raw.get("full_name", "/").split("/")[0]),
        owner_avatar_url=owner.get("avatar_url"),
        private=private,
        visibility=str(visibility),
        html_url=str(raw.get("html_url") or ""),
        homepage=raw.get("homepage") or None,
        language=raw.get("language"),
        languages=languages or {},
        topics=[str(topic) for topic in raw.get("topics") or []],
        stargazers_count=int(raw.get("stargazers_count") or 0),
        forks_count=int(raw.get("forks_count") or 0),
        watchers_count=int(raw.get("watchers_count") or 0),
        open_issues_count=int(raw.get("open_issues_count") or 0),
        default_branch=str(raw.get("default_branch") or "main"),
        created_at=parse_timestamp(raw.get("created_at")),
        updated_at=parse_timestamp(raw.get("updated_at")),
        pushed_at=parse_timestamp(raw.get("pushed_at")),
        license=_license_name(raw),
        archived=bool(raw.get("archived")),
        fork=bool(raw.get("fork")),
        size_kb=int(raw.get("size") or 0),
        linked_project_id=link.id if link else None,
        linked_project_title=link.title if link else None,
        linked_project_status=link.status if link else None,
        import_state=state,
        sync_available=sync_available,
        last_synced_at=link.github_last_synced_at if link else None,
    )


def project_link_map(db: Session) -> dict[str, Project]:
    rows = db.scalars(
        select(Project).where(Project.github_repository_id.is_not(None))
    ).all()
    return {str(project.github_repository_id): project for project in rows}


def project_for_repository(db: Session, repository_id: str) -> Project | None:
    return db.scalar(
        select(Project).where(Project.github_repository_id == str(repository_id))
    )


async def fetch_repositories(
    client: GitHubClient, *, max_pages: int, per_page: int
) -> tuple[list[dict[str, Any]], bool]:
    raw = await client.paginate(
        "/user/repos",
        params={
            "affiliation": "owner,organization_member",
            "sort": "updated",
            "direction": "desc",
        },
        per_page=per_page,
        max_pages=max_pages,
    )
    repositories = [item for item in raw if isinstance(item, dict)]
    # More results probably exist when the last allowed page was full.
    truncated = len(repositories) >= max_pages * per_page
    return repositories, truncated


async def get_repository(client: GitHubClient, repository_id: str) -> dict[str, Any]:
    raw = await client.get_json(f"/repositories/{repository_id}", use_cache=False)
    if not isinstance(raw, dict):
        raise GitHubError(
            "GitHub returned an unreadable repository record.",
            code="invalid_repository",
            status_code=502,
        )
    return raw


async def get_languages(client: GitHubClient, full_name: str) -> dict[str, int]:
    try:
        payload = await client.get_json(f"/repos/{full_name}/languages")
    except GitHubError as exc:
        if exc.code == "not_found":
            return {}
        raise
    if not isinstance(payload, dict):
        return {}
    return {
        str(language): int(size)
        for language, size in payload.items()
        if isinstance(size, (int, float))
    }


async def get_activity(
    client: GitHubClient, raw: dict[str, Any]
) -> GitHubActivityOut:
    full_name = str(raw.get("full_name") or "")
    commits: list[GitHubCommitOut] = []
    available = True
    try:
        payload = await client.get_json(
            f"/repos/{full_name}/commits", params={"per_page": 10}, use_cache=False
        )
        if isinstance(payload, list):
            for item in payload[:10]:
                if not isinstance(item, dict):
                    continue
                commit = item.get("commit") if isinstance(item.get("commit"), dict) else {}
                author = commit.get("author") if isinstance(commit.get("author"), dict) else {}
                message = commit.get("message")
                commits.append(
                    GitHubCommitOut(
                        sha=str(item.get("sha") or ""),
                        message=str(message).splitlines()[0][:300] if message else None,
                        author=author.get("name"),
                        authored_at=parse_timestamp(author.get("date")),
                        html_url=item.get("html_url"),
                    )
                )
        else:
            available = False
    except GitHubError as exc:
        available = False
        if exc.code not in {"empty_repository", "not_found", "forbidden"}:
            logger.info("Commit history unavailable for %s: %s", full_name, exc.code)

    return GitHubActivityOut(
        default_branch=str(raw.get("default_branch") or "main"),
        pushed_at=parse_timestamp(raw.get("pushed_at")),
        updated_at=parse_timestamp(raw.get("updated_at")),
        open_issues_count=int(raw.get("open_issues_count") or 0),
        recent_commits=commits,
        commits_available=available,
    )


async def analyze_repository(
    client: GitHubClient, repository_id: str
) -> RepositoryInspectionOut:
    """Build the full inspection payload. No content is persisted here."""

    raw = await get_repository(client, repository_id)
    full_name = str(raw.get("full_name") or "")
    branch = str(raw.get("default_branch") or "main")

    languages = await get_languages(client, full_name)
    readme = await get_readme(client, full_name)
    plan = await inspect_repository_files(client, full_name, branch=branch)
    activity = await get_activity(client, raw)

    limitations: list[str] = []
    safe_files: dict[str, str] = {}
    for path, text in plan.files.items():
        secret = contains_secret(text)
        if secret:
            plan.skipped_files.append(
                {
                    "path": path,
                    "reason": f"Possible {secret} detected; content withheld.",
                }
            )
            limitations.append(
                f"{path} was not used because it may contain a {secret}."
            )
            continue
        safe_files[path] = text
    plan.files = safe_files

    readme_text = readme.content or ""
    if readme_text:
        secret = contains_secret(readme_text)
        if secret:
            readme = readme.model_copy(
                update={"content": None, "available": False, "truncated": False}
            )
            readme_text = ""
            limitations.append(
                f"The README was withheld because it may contain a {secret}."
            )

    groups = readme_groups(readme_text) if readme_text else {}
    if readme_text and "overview" not in groups:
        intro = first_paragraph(readme_text)
        if intro:
            groups["overview"] = intro
    technologies = detect_technologies(languages, safe_files)
    architecture = detect_architecture(technologies)
    images = extract_images(
        readme_text,
        full_name=full_name,
        readme_path=readme.path or "README.md",
        repository_id=str(raw.get("id") or repository_id),
    )
    live_urls = detect_live_urls(
        homepage=raw.get("homepage"),
        markdown=readme_text,
        repository_url=str(raw.get("html_url") or ""),
    )
    documentation_url = detect_documentation_url(
        readme_text, str(raw.get("html_url") or "")
    )
    category_suggestions = suggest_categories(
        technologies, str(raw.get("name") or ""), raw.get("description")
    )
    case_study = build_case_study(groups, technologies)

    if not readme_text:
        limitations.append(
            "No README was available, so narrative sections remain "
            f"“{NOT_DOCUMENTED}” until you add them."
        )
    if images.ignored:
        limitations.append(
            f"{len(images.ignored)} README image reference(s) were ignored "
            "(external hosts, badges, or unsupported formats)."
        )

    repository = map_repository(raw, languages=languages)
    return RepositoryInspectionOut(
        repository=repository,
        structure=GitHubContentsOut(
            path="",
            entries=plan.entries,
            truncated=len(plan.entries) >= 1000,
            default_branch=branch,
        ),
        inspected_files=plan.inspected_files,
        skipped_files=plan.skipped_files,
        readme=readme,
        readme_sections=readme_sections(readme_text),
        technologies=technologies,
        architecture=architecture,
        category_suggestions=category_suggestions,
        live_url_candidates=live_urls,
        documentation_url=documentation_url,
        images=images,
        activity=activity,
        case_study=case_study,
        limitations=limitations,
        fetched_at=datetime.now(UTC),
    )
