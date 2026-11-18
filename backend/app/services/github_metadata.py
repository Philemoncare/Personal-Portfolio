"""Optional public GitHub repository metadata.

The API only stores numbers returned by GitHub. It never estimates stars,
forks, language, or issue counts, and it never reads private repositories.
"""

from __future__ import annotations

import re
from datetime import UTC, datetime
from urllib.parse import urlparse

import httpx
from sqlalchemy.orm import Session

from app.models import Project

REPO_PATTERN = re.compile(r"^/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+?)(?:\.git)?/?$")


class GitHubMetadataError(Exception):
    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def parse_repository(url: str | None) -> tuple[str, str] | None:
    if not url:
        return None
    parsed = urlparse(url.strip())
    if parsed.scheme not in {"http", "https"}:
        return None
    if parsed.netloc.lower() not in {"github.com", "www.github.com"}:
        return None
    match = REPO_PATTERN.match(parsed.path)
    if not match:
        return None
    owner, repo = match.group(1), match.group(2)
    if owner.lower() in {"orgs", "users", "topics", "features", "marketplace"}:
        return None
    return owner, repo


async def refresh_project_metadata(db: Session, project: Project) -> Project:
    repo = parse_repository(project.github_url or project.repository_url)
    if repo is None:
        raise GitHubMetadataError(
            "Add a public GitHub repository URL (https://github.com/owner/repo) first."
        )
    owner, name = repo
    url = f"https://api.github.com/repos/{owner}/{name}"
    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(8.0),
            headers={
                "Accept": "application/vnd.github+json",
                "User-Agent": "phill-portfolio-admin",
            },
            follow_redirects=True,
        ) as client:
            response = await client.get(url)
    except httpx.HTTPError as exc:
        raise GitHubMetadataError(
            "GitHub could not be reached. The cached metadata was not changed.",
            status_code=502,
        ) from exc

    if response.status_code == 404:
        raise GitHubMetadataError(
            "GitHub returned 404. The repository is private, renamed, or does not exist.",
            status_code=404,
        )
    if response.status_code == 403:
        raise GitHubMetadataError(
            "GitHub rate-limited this request. Try again later; cached values were kept.",
            status_code=429,
        )
    if response.status_code != 200:
        raise GitHubMetadataError(
            f"GitHub returned HTTP {response.status_code}. Cached values were kept.",
            status_code=502,
        )

    try:
        payload = response.json()
        project.github_stars = int(payload["stargazers_count"])
        project.github_forks = int(payload["forks_count"])
        project.github_language = payload.get("language")
        project.github_open_issues = int(payload["open_issues_count"])
    except (KeyError, TypeError, ValueError) as exc:
        raise GitHubMetadataError(
            "GitHub returned an unexpected response. Cached values were kept.",
            status_code=502,
        ) from exc

    project.github_metadata_checked_at = datetime.now(UTC)
    db.commit()
    db.refresh(project)
    return project
