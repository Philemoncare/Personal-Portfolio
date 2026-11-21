"""Safe repository content inspection.

Only a small, explicit allow-list of text files can be read. Secret-bearing
paths are rejected before a request is made, and detected secret values never
leave the backend parser.
"""

from __future__ import annotations

import base64
import posixpath
import re
from dataclasses import dataclass, field
from typing import Any
from urllib.parse import quote, unquote, urlparse

from app.core.config import settings
from app.integrations.github.client import GitHubClient, GitHubError
from app.schemas.github import (
    GitHubContentsOut,
    GitHubImageOut,
    GitHubImagesOut,
    GitHubReadmeOut,
    GitHubTreeEntryOut,
)

MAX_TEXT_BYTES = 512 * 1024
MAX_INSPECTED_FILES = 18
IMAGE_EXTENSIONS = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp"}
UNSUPPORTED_IMAGE_EXTENSIONS = {".gif", ".svg", ".bmp", ".ico", ".tiff", ".avif"}

# Bounded scan of conventional asset folders so screenshot assets are offered
# even when the README does not link them. One listing per folder, never a
# recursive walk of the whole repository.
IMAGE_SCAN_DIRECTORIES = (
    "screenshots",
    "screens",
    "docs",
    "assets",
    "images",
    "media",
    "public",
    "src/assets",
    "frontend/public",
    "frontend/src/assets",
)
MAX_SCANNED_IMAGES = 24

# Exact filenames (case-insensitive) that may be fetched as text.
SAFE_FILE_NAMES = {
    "readme.md",
    "readme.markdown",
    "readme.rst",
    "readme.txt",
    "package.json",
    "package-lock.json",
    "requirements.txt",
    "requirements-dev.txt",
    "pyproject.toml",
    "poetry.lock",
    "pipfile",
    "composer.json",
    "pom.xml",
    "build.gradle",
    "build.gradle.kts",
    "settings.gradle",
    "settings.gradle.kts",
    "gradle.properties",
    "pubspec.yaml",
    "cargo.toml",
    "go.mod",
    "dockerfile",
    "docker-compose.yml",
    "docker-compose.yaml",
    "compose.yml",
    "compose.yaml",
    ".env.example",
    "env.example",
    "tsconfig.json",
    "vite.config.ts",
    "vite.config.js",
    "vite.config.mjs",
    "next.config.js",
    "next.config.mjs",
    "next.config.ts",
    "nuxt.config.ts",
    "nuxt.config.js",
    "tailwind.config.js",
    "tailwind.config.ts",
    "tailwind.config.cjs",
    "angular.json",
    "manage.py",
    "procfile",
    "render.yaml",
    "vercel.json",
    "netlify.toml",
    "firebase.json",
    "astro.config.mjs",
    "svelte.config.js",
    "remix.config.js",
    "cname",
}

FORBIDDEN_SUBSTRINGS = (
    ".env",
    ".pem",
    ".key",
    ".p12",
    ".pfx",
    ".keystore",
    ".jks",
    ".asc",
    ".gpg",
    "id_rsa",
    "id_dsa",
    "id_ecdsa",
    "id_ed25519",
    "credentials",
    "secrets",
    ".npmrc",
    ".pypirc",
    ".netrc",
    ".htpasswd",
    "docker-compose.prod",
    "docker-compose.production",
)


class UnsafePathError(Exception):
    """Raised when a requested file path is outside the allow-list."""


@dataclass
class RepositoryPlan:
    entries: list[GitHubTreeEntryOut] = field(default_factory=list)
    files: dict[str, str] = field(default_factory=dict)
    inspected_files: list[str] = field(default_factory=list)
    skipped_files: list[dict[str, str]] = field(default_factory=list)
    directories: list[str] = field(default_factory=list)


def is_forbidden(path: str) -> bool:
    lowered = path.lower()
    if lowered.endswith(".env.example") or lowered.endswith("env.example"):
        return False
    if lowered == ".env" or lowered.endswith("/.env"):
        return True
    return any(part in lowered for part in FORBIDDEN_SUBSTRINGS)


def is_safe_text_file(path: str) -> bool:
    if is_forbidden(path):
        return False
    name = posixpath.basename(path).lower()
    return name in SAFE_FILE_NAMES


def safe_repository_path(path: str) -> str:
    clean = unquote(path).replace("\\", "/").strip()
    if not clean or clean.startswith("/") or ".." in clean.split("/"):
        raise UnsafePathError("Invalid repository path.")
    normalized = posixpath.normpath(clean)
    if normalized.startswith("..") or normalized.startswith("/"):
        raise UnsafePathError("Invalid repository path.")
    if is_forbidden(normalized):
        raise UnsafePathError("That file is not readable for security reasons.")
    return normalized


def _decode(payload: dict[str, Any]) -> str:
    content = payload.get("content")
    if not content:
        return ""
    try:
        raw = base64.b64decode(content)
    except (ValueError, TypeError):
        return ""
    return raw.decode("utf-8", errors="replace")


async def get_directory(
    client: GitHubClient, full_name: str, *, path: str = "", ref: str | None = None
) -> GitHubContentsOut:
    params = {"ref": ref} if ref else None
    try:
        payload = await client.get_json(
            GitHubClient.contents_path(full_name, path), params=params
        )
    except GitHubError as exc:
        if exc.code == "not_found" and path:
            return GitHubContentsOut(path=path, entries=[], default_branch=ref or "")
        raise

    if not isinstance(payload, list):
        payload = [payload]
    entries: list[GitHubTreeEntryOut] = []
    for item in payload:
        if not isinstance(item, dict):
            continue
        entries.append(
            GitHubTreeEntryOut(
                name=str(item.get("name") or ""),
                path=str(item.get("path") or ""),
                type=str(item.get("type") or "file"),
                size=item.get("size") if isinstance(item.get("size"), int) else None,
                html_url=item.get("html_url"),
            )
        )
    entries.sort(key=lambda entry: (entry.type != "dir", entry.name.lower()))
    return GitHubContentsOut(path=path, entries=entries, default_branch=ref or "")


async def get_readme(client: GitHubClient, full_name: str) -> GitHubReadmeOut:
    try:
        payload = await client.get_json(f"/repos/{full_name}/readme")
    except GitHubError as exc:
        if exc.code == "not_found":
            return GitHubReadmeOut(available=False)
        raise
    if not isinstance(payload, dict):
        return GitHubReadmeOut(available=False)
    text = _decode(payload)
    return GitHubReadmeOut(
        path=payload.get("path"),
        content=text,
        html_url=payload.get("html_url"),
        truncated=bool(payload.get("truncated")) or len(text) >= 900_000,
        available=bool(text.strip()),
    )


async def read_text_file(
    client: GitHubClient, full_name: str, path: str, *, ref: str | None = None
) -> tuple[str | None, str | None]:
    """Return (text, skip_reason). Never raises for missing or forbidden files."""

    try:
        clean = safe_repository_path(path)
    except UnsafePathError as exc:
        return None, str(exc)
    if not is_safe_text_file(clean):
        return None, "Not in the inspectable file allow-list."

    params = {"ref": ref} if ref else None
    try:
        payload = await client.get_json(
            GitHubClient.contents_path(full_name, clean), params=params
        )
    except GitHubError as exc:
        if exc.code in {"not_found", "empty_repository"}:
            return None, "File not present on the default branch."
        return None, exc.message

    if not isinstance(payload, dict):
        return None, "File could not be read."
    size = payload.get("size")
    if isinstance(size, int) and size > MAX_TEXT_BYTES:
        return None, "File is too large to inspect safely."
    if payload.get("encoding") != "base64":
        return None, "File is not plain text."
    text = _decode(payload)
    if not text.strip():
        return None, "File is empty."
    return text, None


async def inspect_repository_files(
    client: GitHubClient, full_name: str, *, branch: str
) -> RepositoryPlan:
    plan = RepositoryPlan()
    root = await get_directory(client, full_name, ref=branch)
    plan.entries = root.entries
    plan.directories = [entry.path for entry in root.entries if entry.type == "dir"]

    candidates: list[str] = []
    for entry in root.entries:
        if entry.type == "file" and is_safe_text_file(entry.path):
            candidates.append(entry.path)

    # Look one level into conventional application folders for manifests.
    interesting = {
        "backend",
        "frontend",
        "api",
        "server",
        "client",
        "web",
        "app",
        "mobile",
        "src",
        "services",
    }
    for directory in [entry.path for entry in root.entries if entry.type == "dir"]:
        if posixpath.basename(directory).lower() not in interesting:
            continue
        try:
            listing = await get_directory(client, full_name, path=directory, ref=branch)
        except GitHubError:
            continue
        for entry in listing.entries:
            if entry.type == "file" and is_safe_text_file(entry.path):
                candidates.append(entry.path)

    seen: set[str] = set()
    for path in candidates:
        if path in seen:
            continue
        seen.add(path)
        if len(plan.inspected_files) >= MAX_INSPECTED_FILES:
            plan.skipped_files.append(
                {"path": path, "reason": "Inspection limit reached."}
            )
            continue
        if is_forbidden(path):
            plan.skipped_files.append(
                {"path": path, "reason": "Secret-bearing path excluded."}
            )
            continue
        text, reason = await read_text_file(client, full_name, path, ref=branch)
        if text is None:
            plan.skipped_files.append({"path": path, "reason": reason or "Unavailable."})
            continue
        plan.files[path] = text
        plan.inspected_files.append(path)

    return plan


# --- README images --------------------------------------------------------

MARKDOWN_IMAGE = re.compile(
    r"!\[([^\]]*)\]\(\s*<?([^)>\s]+)>?(?:\s+[\"'][^\"']*[\"'])?\s*\)"
)
HTML_IMAGE = re.compile(
    r"<img[^>]+src=[\"']([^\"']+)[\"'][^>]*>", re.IGNORECASE
)
BADGE_HOSTS = (
    "img.shields.io",
    "badge.fury.io",
    "badgen.net",
    "travis-ci.org",
    "travis-ci.com",
    "codecov.io",
    "coveralls.io",
    "visitor-badge",
    "opencollective.com",
    "patreon.com",
    "buymeacoffee.com",
    "github.com/sponsors",
    "giphy.com",
    "youtube.com",
    "youtu.be",
)
IMAGE_NAME_HINTS = ("badge", "logo", "icon", "shield", "screenshot", "screen", "preview", "demo")


def _resolve_relative(readme_path: str, target: str) -> str | None:
    base = posixpath.dirname(readme_path or "README.md")
    relative = target[2:] if target.startswith("./") else target.lstrip("/")
    combined = posixpath.normpath(posixpath.join(base, relative))
    if combined.startswith("..") or combined.startswith("/"):
        return None
    return combined


def _repository_raw_path(url: str, full_name: str) -> str | None:
    parsed = urlparse(url)
    host = parsed.netloc.lower()
    parts = [part for part in parsed.path.split("/") if part]
    if host == "raw.githubusercontent.com" and len(parts) >= 4:
        owner, repo, _branch = parts[0], parts[1], parts[2]
        if f"{owner}/{repo}".lower() == full_name.lower():
            return "/".join(parts[3:])
    if host in {"github.com", "www.github.com"} and len(parts) >= 5:
        if parts[2] == "raw" and f"{parts[0]}/{parts[1]}".lower() == full_name.lower():
            return "/".join(parts[4:])
    return None


async def scan_repository_images(
    client: GitHubClient,
    *,
    full_name: str,
    ref: str | None = None,
    limit: int = MAX_SCANNED_IMAGES,
) -> list[str]:
    """List supported images in conventional asset folders, bounded and safe."""

    found: list[str] = []
    seen: set[str] = set()
    for directory in IMAGE_SCAN_DIRECTORIES:
        try:
            listing = await get_directory(client, full_name, path=directory, ref=ref)
        except GitHubError:
            continue
        for entry in listing.entries:
            if entry.type != "file":
                continue
            path = entry.path
            extension = posixpath.splitext(path)[1].lower()
            if extension not in IMAGE_EXTENSIONS:
                continue
            if is_forbidden(path) or path in seen:
                continue
            seen.add(path)
            found.append(path)
            if len(found) >= limit:
                return found
    return found


def extract_images(
    markdown: str,
    *,
    full_name: str,
    readme_path: str,
    repository_id: str,
    scanned_paths: list[str] | None = None,
) -> GitHubImagesOut:
    found: list[GitHubImageOut] = []
    ignored: list[dict[str, str]] = []
    seen: set[str] = set()

    def preview_url(path: str) -> str:
        return (
            f"/api/v1/github/repositories/{repository_id}/images/preview"
            f"?path={quote(path, safe='')}"
        )

    def consider(reference: str, markdown_snippet: str) -> None:
        reference = reference.strip()
        if not reference or reference.startswith(("data:", "mailto:", "javascript:")):
            return
        parsed = urlparse(reference)
        if parsed.netloc:
            if any(host in parsed.netloc.lower() for host in BADGE_HOSTS):
                ignored.append({"reference": reference, "reason": "Badge or external embed."})
                return
            path = _repository_raw_path(reference, full_name)
            if path is None:
                ignored.append(
                    {
                        "reference": reference,
                        "reason": "External image host; only repository images can be imported.",
                    }
                )
                return
            source_url = reference
        else:
            path = _resolve_relative(readme_path, reference)
            if path is None:
                ignored.append({"reference": reference, "reason": "Path escapes the repository."})
                return
            source_url = f"https://github.com/{full_name}/blob/HEAD/{path}"

        try:
            path = safe_repository_path(path)
        except UnsafePathError as exc:
            ignored.append({"reference": reference, "reason": str(exc)})
            return
        extension = posixpath.splitext(path)[1].lower()
        if extension in UNSUPPORTED_IMAGE_EXTENSIONS:
            ignored.append(
                {
                    "reference": reference,
                    "reason": "Image type is not supported by the media library.",
                }
            )
            return
        if extension not in IMAGE_EXTENSIONS:
            ignored.append({"reference": reference, "reason": "Not a supported image file."})
            return
        if path in seen:
            return
        seen.add(path)
        found.append(
            GitHubImageOut(
                path=path,
                name=posixpath.basename(path),
                markdown=markdown_snippet,
                source_url=source_url,
                preview_url=preview_url(path),
                mime_type=IMAGE_EXTENSIONS[extension],
            )
        )

    for match in MARKDOWN_IMAGE.finditer(markdown):
        consider(match.group(2), match.group(0))
    for match in HTML_IMAGE.finditer(markdown):
        consider(match.group(1), match.group(0))

    # Conventionally named asset folders supply candidates the README may not
    # reference. They are offered, never imported automatically.
    for raw_path in scanned_paths or []:
        try:
            path = safe_repository_path(raw_path)
        except UnsafePathError:
            continue
        if path in seen:
            continue
        extension = posixpath.splitext(path)[1].lower()
        if extension not in IMAGE_EXTENSIONS:
            continue
        seen.add(path)
        found.append(
            GitHubImageOut(
                path=path,
                name=posixpath.basename(path),
                markdown=None,
                source_url=f"https://github.com/{full_name}/blob/HEAD/{path}",
                preview_url=preview_url(path),
                mime_type=IMAGE_EXTENSIONS[extension],
            )
        )

    # Screenshots are more useful first; badges are already excluded.
    found.sort(
        key=lambda item: (
            not any(hint in item.name.lower() for hint in IMAGE_NAME_HINTS),
            item.path.lower(),
        )
    )
    return GitHubImagesOut(
        items=found, readme_path=readme_path, ignored=ignored[:30]
    )


async def download_image(
    client: GitHubClient, full_name: str, path: str, *, ref: str | None = None
) -> tuple[bytes, str]:
    clean = safe_repository_path(path)
    extension = posixpath.splitext(clean)[1].lower()
    mime = IMAGE_EXTENSIONS.get(extension)
    if mime is None:
        raise GitHubError(
            "Only PNG, JPEG, and WebP repository images can be imported.",
            code="unsupported_media",
            status_code=415,
        )
    params = {"ref": ref} if ref else None
    data, _content_type = await client.get_bytes(
        GitHubClient.contents_path(full_name, clean),
        params=params,
        max_bytes=settings.media_max_bytes,
        accepted_types={mime, "application/octet-stream"},
    )
    return data, mime
