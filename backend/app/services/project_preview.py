"""Verified homepage discovery and screenshot capture for projects.

The preview is always a screenshot of the *actual* deployed website. Nothing
here invents a page, reuses a repository image, or renders untrusted HTML in
the portfolio. URLs are validated (scheme, port, DNS resolution) before any
server-side request or browser launch, which keeps the feature from becoming
an SSRF primitive for localhost or private networks.
"""

from __future__ import annotations

import asyncio
import ipaddress
import json
import logging
import os
import shutil
import socket
import subprocess
import tempfile
from dataclasses import dataclass
from datetime import UTC, datetime
from io import BytesIO
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlparse, urlunparse

import httpx
from PIL import Image, UnidentifiedImageError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import AdminUser, MediaAsset, Project
from app.services import media as media_service

logger = logging.getLogger("portfolio.preview")

PREVIEW_SOURCES = {
    "github_homepage": "GitHub repository homepage",
    "github_pages": "GitHub Pages deployment",
    "package_json": "package.json homepage",
    "cname": "Repository CNAME file",
    "readme": "README live link",
    "manual": "Admin-supplied URL",
}

BLOCKED_HOST_SUFFIXES = (
    ".localhost",
    ".local",
    ".internal",
    ".home.arpa",
    ".lan",
)
BLOCKED_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".gif",
    ".svg",
    ".ico",
    ".pdf",
    ".zip",
    ".tar",
    ".gz",
    ".mp4",
    ".mp3",
    ".css",
    ".js",
    ".json",
    ".xml",
    ".txt",
}
BROWSER_CANDIDATES = (
    "msedge",
    "microsoft-edge",
    "google-chrome",
    "chrome",
    "chromium",
    "chromium-browser",
)
WINDOWS_BROWSER_PATHS = (
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
)


class PreviewError(Exception):
    """A homepage preview failure that is safe to show to an administrator."""

    def __init__(self, message: str, *, status_code: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


@dataclass(frozen=True)
class HomepageCandidate:
    url: str
    source: str
    confidence: str
    evidence: str
    label: str


@dataclass(frozen=True)
class ProbeResult:
    requested_url: str
    final_url: str
    status_code: int
    content_type: str | None
    resolved_ip: str


@dataclass(frozen=True)
class PreviewOutcome:
    status: str
    message: str
    final_url: str | None = None
    image_url: str | None = None


def _clean_url(value: str) -> str:
    return value.strip().rstrip(".,;:)»”\"'")


def _is_blocked_address(address: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    if isinstance(address, ipaddress.IPv6Address) and address.ipv4_mapped:
        address = address.ipv4_mapped
    return (
        address.is_private
        or address.is_loopback
        or address.is_link_local
        or address.is_multicast
        or address.is_reserved
        or address.is_unspecified
    )


async def resolve_public_host(host: str, port: int) -> list[str]:
    """Resolve every address and reject the URL if any is non-public."""

    if settings.preview_allow_private_hosts:
        return []

    loop = asyncio.get_running_loop()

    def lookup() -> list[tuple]:
        return socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)

    try:
        records = await loop.run_in_executor(None, lookup)
    except socket.gaierror as exc:
        raise PreviewError(
            "The live website host could not be resolved.", status_code=422
        ) from exc

    addresses: list[str] = []
    for record in records:
        sockaddr = record[4]
        raw = str(sockaddr[0]).split("%", 1)[0]
        try:
            parsed = ipaddress.ip_address(raw)
        except ValueError:
            continue
        if _is_blocked_address(parsed):
            raise PreviewError(
                "That URL resolves to a private or internal address and cannot be "
                "previewed.",
                status_code=422,
            )
        addresses.append(raw)
    if not addresses:
        raise PreviewError(
            "The live website host did not resolve to a public address.",
            status_code=422,
        )
    return addresses


def validate_homepage_url(value: str | None) -> str:
    """Return a normalised http(s) URL or raise PreviewError."""

    candidate = _clean_url(value or "")
    if not candidate:
        raise PreviewError("Enter the deployed website URL first.")

    parsed = urlparse(candidate)
    if parsed.scheme not in {"http", "https"}:
        raise PreviewError("Only http:// and https:// homepage URLs are allowed.")
    if parsed.username or parsed.password:
        raise PreviewError("URLs containing credentials are not accepted.")
    host = (parsed.hostname or "").strip().lower()
    if not host:
        raise PreviewError("The URL does not include a hostname.")
    if host in {"localhost", "127.0.0.1", "::1", "0.0.0.0"} or host.endswith(
        BLOCKED_HOST_SUFFIXES
    ):
        raise PreviewError("Localhost and private hosts cannot be previewed.")
    try:
        literal = ipaddress.ip_address(host)
    except ValueError:
        literal = None
    if literal is not None and _is_blocked_address(literal):
        raise PreviewError("Private and internal IP addresses cannot be previewed.")
    try:
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
    except ValueError as exc:
        raise PreviewError("The URL contains an invalid port.") from exc
    if port not in {80, 443}:
        raise PreviewError("Homepage previews only accept standard web ports.")
    if Path(parsed.path).suffix.lower() in BLOCKED_EXTENSIONS:
        raise PreviewError(
            "That URL points to a file or asset, not a website homepage."
        )
    if host.startswith("api.") or host.startswith("docs."):
        # Common false positives from README links. Still allowed if the admin
        # explicitly overrides later, but the discovery step should not pick it.
        raise PreviewError("That URL looks like an API or documentation host.")
    if host == "github.com" or host.endswith(".github.com"):
        raise PreviewError(
            "GitHub repository pages are source code, not a deployed homepage."
        )
    if host.endswith(".githubusercontent.com"):
        raise PreviewError("Raw repository files are not a homepage.")

    netloc = host if port in {80, 443} and (
        (parsed.scheme == "http" and port == 80)
        or (parsed.scheme == "https" and port == 443)
    ) else f"{host}:{port}"
    return urlunparse(
        (parsed.scheme, netloc, parsed.path or "/", "", parsed.query, "")
    )


def _source_label(source: str | None) -> str:
    return PREVIEW_SOURCES.get(source or "", "Manual URL")


def build_candidates(
    *,
    homepage: str | None,
    pages_url: str | None,
    package_homepage: str | None,
    cname: str | None,
    readme_urls: list[tuple[str, str, str]],
) -> list[HomepageCandidate]:
    """Rank documented homepage candidates without guessing."""

    candidates: list[HomepageCandidate] = []

    def add(
        url: str | None, source: str, confidence: str, evidence: str
    ) -> None:
        if not url:
            return
        try:
            clean = validate_homepage_url(url)
        except PreviewError:
            return
        if any(item.url.lower() == clean.lower() for item in candidates):
            return
        candidates.append(
            HomepageCandidate(
                url=clean,
                source=source,
                confidence=confidence,
                evidence=evidence,
                label=PREVIEW_SOURCES.get(source, "Documented link"),
            )
        )

    add(
        pages_url,
        "github_pages",
        "high",
        "GitHub Pages reports a deployed site for this repository.",
    )
    add(
        homepage,
        "github_homepage",
        "high",
        "Homepage field on the GitHub repository.",
    )
    if cname:
        cname_host = cname.strip().splitlines()[0].strip()
        if cname_host:
            add(
                f"https://{cname_host}",
                "cname",
                "high",
                "CNAME file in the repository points at a custom domain.",
            )
    add(
        package_homepage,
        "package_json",
        "medium",
        "package.json declares a homepage.",
    )
    for url, confidence, label in readme_urls:
        add(url, "readme", confidence, label)
    return candidates


def validate_candidate_list(values: list[str]) -> list[str]:
    """Best-effort validation used by the GitHub discovery step."""

    valid: list[str] = []
    for value in values:
        try:
            valid.append(validate_homepage_url(value))
        except PreviewError:
            continue
    return valid


async def probe_homepage(url: str) -> ProbeResult:
    """Follow redirects manually, validating every hop, and require HTML."""

    current = validate_homepage_url(url)
    timeout = httpx.Timeout(settings.preview_probe_timeout_seconds)
    headers = {
        "User-Agent": settings.preview_user_agent,
        "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
    }
    resolved_ip = ""
    async with httpx.AsyncClient(
        timeout=timeout, follow_redirects=False, headers=headers
    ) as client:
        for _ in range(settings.preview_max_redirects + 1):
            parsed = urlparse(current)
            addresses = await resolve_public_host(
                parsed.hostname or "", parsed.port or (443 if parsed.scheme == "https" else 80)
            )
            if addresses:
                resolved_ip = addresses[0]
            try:
                async with client.stream("GET", current) as response:
                    if response.status_code in {301, 302, 303, 307, 308}:
                        location = response.headers.get("location")
                        if not location:
                            raise PreviewError(
                                "The website redirected without a destination.",
                                status_code=422,
                            )
                        current = validate_homepage_url(urljoin(current, location))
                        continue
                    content_type = response.headers.get("content-type", "")
                    mime = content_type.split(";")[0].strip().lower()
                    if response.status_code >= 400:
                        raise PreviewError(
                            f"The website answered with HTTP {response.status_code}.",
                            status_code=422,
                        )
                    if mime and mime not in {
                        "text/html",
                        "application/xhtml+xml",
                    }:
                        raise PreviewError(
                            "The URL returned a non-HTML resource, so it is not a "
                            "website homepage.",
                            status_code=422,
                        )
                    return ProbeResult(
                        requested_url=validate_homepage_url(url),
                        final_url=current,
                        status_code=response.status_code,
                        content_type=mime or None,
                        resolved_ip=resolved_ip,
                    )
            except httpx.TimeoutException as exc:
                raise PreviewError(
                    "The website did not respond in time.", status_code=422
                ) from exc
            except httpx.HTTPError as exc:
                raise PreviewError(
                    "The website could not be reached.", status_code=422
                ) from exc
    raise PreviewError(
        "The website redirected too many times.", status_code=422
    )


def find_browser() -> str | None:
    configured = (settings.preview_browser_path or "").strip()
    if configured:
        return configured if Path(configured).exists() else None
    for path in WINDOWS_BROWSER_PATHS:
        if Path(path).exists():
            return path
    for name in BROWSER_CANDIDATES:
        found = shutil.which(name)
        if found:
            return found
    return None


def _run_browser(
    browser: str, url: str, output: Path, profile: Path
) -> None:
    args = [
        browser,
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--mute-audio",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-extensions",
        "--disable-background-networking",
        "--disable-sync",
        "--disable-default-apps",
        "--disable-component-update",
        f"--user-data-dir={profile}",
        f"--window-size={settings.preview_viewport_width},{settings.preview_viewport_height}",
        f"--screenshot={output}",
        "--virtual-time-budget=10000",
        url,
    ]
    creation_flags = 0
    if os.name == "nt":
        creation_flags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
    try:
        subprocess.run(
            args,
            check=False,
            timeout=settings.preview_screenshot_timeout_seconds,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=creation_flags,
        )
    except subprocess.TimeoutExpired as exc:
        raise PreviewError(
            "The screenshot took too long. The site may be slow or offline.",
            status_code=504,
        ) from exc


def _png_to_webp(data: bytes) -> bytes:
    try:
        with Image.open(BytesIO(data)) as image:
            image.load()
            if image.width < 16 or image.height < 16:
                raise PreviewError(
                    "The screenshot was empty, so no preview was stored.",
                    status_code=422,
                )
            gray = image.convert("L")
            low, high = gray.getextrema()
            if low == high:
                raise PreviewError(
                    "The website rendered a blank page, so no preview was stored.",
                    status_code=422,
                )
            rgb = image.convert("RGB")
            if rgb.width > settings.preview_max_image_width:
                ratio = settings.preview_max_image_width / rgb.width
                rgb = rgb.resize(
                    (settings.preview_max_image_width, max(1, int(rgb.height * ratio))),
                    Image.Resampling.LANCZOS,
                )
            output = BytesIO()
            rgb.save(
                output,
                format="WEBP",
                quality=settings.preview_image_quality,
                method=6,
            )
            return output.getvalue()
    except PreviewError:
        raise
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise PreviewError(
            "The browser did not produce a readable screenshot.",
            status_code=502,
        ) from exc


async def capture_homepage(url: str) -> tuple[bytes, ProbeResult]:
    """Capture a real screenshot of a verified public homepage."""

    if not settings.preview_screenshot_enabled:
        raise PreviewError(
            "Screenshot capture is disabled on this server.",
            status_code=503,
        )
    browser = find_browser()
    if not browser:
        raise PreviewError(
            "No supported headless browser is installed on the server.",
            status_code=503,
        )
    probe = await probe_homepage(url)

    def capture() -> bytes:
        with tempfile.TemporaryDirectory(prefix="phill-preview-") as folder:
            output = Path(folder) / "homepage.png"
            profile = Path(folder) / "profile"
            profile.mkdir(parents=True, exist_ok=True)
            _run_browser(browser, probe.final_url, output, profile)
            if not output.exists() or output.stat().st_size < 1024:
                raise PreviewError(
                    "The browser did not capture an image. The website may be "
                    "offline, slow, or blocking automation.",
                    status_code=502,
                )
            return _png_to_webp(output.read_bytes())

    data = await asyncio.to_thread(capture)
    return data, probe


def _previous_preview_asset(db: Session, project: Project) -> MediaAsset | None:
    if not project.preview_image:
        return None
    return db.scalar(
        select(MediaAsset).where(MediaAsset.url == project.preview_image)
    )


def store_preview_image(
    db: Session,
    *,
    admin: AdminUser,
    project: Project,
    data: bytes,
    probe: ProbeResult,
    source: str,
) -> str:
    """Store a captured homepage in the existing media library."""

    asset = media_service.store(
        db,
        uploader=admin,
        original_filename=f"{project.slug}-homepage.webp",
        content_type="image/webp",
        data=data,
        title=f"{project.title} homepage preview",
        alt_text=f"Homepage of {project.title}",
        folder="projects",
    )
    asset.notes = json.dumps(
        {
            "kind": "homepage_preview",
            "source": source,
            "source_label": _source_label(source),
            "requested_url": probe.requested_url,
            "final_url": probe.final_url,
            "resolved_ip": probe.resolved_ip,
            "captured_at": datetime.now(UTC).isoformat(),
        },
        separators=(",", ":"),
    )
    asset.attached_to_type = "project"
    asset.attached_to_id = project.id

    previous = _previous_preview_asset(db, project)
    if previous is not None and previous.id != asset.id:
        try:
            media_service.delete_asset(db, previous, force=True)
        except Exception:  # never lose a captured preview over cleanup
            logger.warning("Old preview asset cleanup failed id=%s", previous.id)

    db.commit()
    return asset.url


def _set_state(
    project: Project,
    status: str,
    *,
    message: str | None = None,
    source: str | None = None,
    source_url: str | None = None,
    image_url: str | None = None,
) -> None:
    project.preview_status = status
    project.preview_error = message
    if source is not None:
        project.preview_source = source
    if source_url is not None:
        project.preview_source_url = source_url
    if image_url is not None:
        project.preview_image = image_url
    project.preview_checked_at = datetime.now(UTC)


async def verify_project_homepage(
    db: Session,
    project: Project,
    *,
    url: str | None = None,
) -> PreviewOutcome:
    candidate = (url or project.live_url or "").strip()
    candidate = validate_homepage_url(candidate)
    try:
        probe = await probe_homepage(candidate)
    except PreviewError as exc:
        state = "unreachable" if "reach" in exc.message.lower() or "respond" in exc.message.lower() else "unavailable"
        _set_state(
            project,
            state,
            message=exc.message,
            source_url=(url or project.live_url or None),
        )
        db.commit()
        return PreviewOutcome(status=state, message=exc.message)

    project.live_url = probe.final_url
    project.last_verified_at = datetime.now(UTC)
    _set_state(
        project,
        "verified",
        message=None,
        source_url=probe.final_url,
        image_url=None,
    )
    if project.preview_source is None:
        project.preview_source = "manual" if url else "github_homepage"
    db.commit()
    return PreviewOutcome(
        status="verified",
        message="Website verified. Generate a preview image next.",
        final_url=probe.final_url,
    )


async def generate_project_preview(
    db: Session,
    *,
    admin: AdminUser,
    project: Project,
    url: str | None = None,
    source: str | None = None,
) -> PreviewOutcome:
    """Verify the URL, capture the real homepage, and store it.

    Failures are recorded on the project and returned to the admin; they are
    never converted into a fabricated preview.
    """

    candidate = (url or project.live_url or "").strip()
    candidate = validate_homepage_url(candidate)
    source_value = source or project.preview_source or ("manual" if url else "github_homepage")
    try:
        data, probe = await capture_homepage(candidate)
    except PreviewError as exc:
        lower = exc.message.lower()
        if "disabled" in lower or "browser" in lower:
            state = "unavailable"
        elif "blank" in lower or "image" in lower or "screenshot" in lower:
            state = "unavailable"
        else:
            state = "unreachable"
        _set_state(
            project,
            state,
            message=exc.message,
            source=source_value,
            source_url=(url or project.live_url or None),
        )
        db.commit()
        return PreviewOutcome(status=state, message=exc.message)

    image_url = store_preview_image(
        db,
        admin=admin,
        project=project,
        data=data,
        probe=probe,
        source=source_value,
    )
    project.live_url = probe.final_url
    project.last_verified_at = datetime.now(UTC)
    _set_state(
        project,
        "generated",
        message=None,
        source=source_value,
        source_url=probe.final_url,
        image_url=image_url,
    )
    db.commit()
    db.refresh(project)
    logger.info(
        "Homepage preview generated project=%s source=%s url=%s bytes=%s",
        project.id,
        source_value,
        probe.final_url,
        len(data),
    )
    return PreviewOutcome(
        status="generated",
        message="Homepage preview generated from the live website.",
        final_url=probe.final_url,
        image_url=image_url,
    )
