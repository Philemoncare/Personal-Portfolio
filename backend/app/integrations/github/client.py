"""A small, defensive GitHub REST client.

Responsibilities are deliberately centralised here:

* bearer authentication
* API version, user agent, and accepted media types
* timeout and bounded retries
* rate-limit capture with friendly errors
* short-lived metadata caching
* no token in log output
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import time
from datetime import UTC, datetime
from typing import Any
from urllib.parse import quote

import httpx

from app.core.config import settings

logger = logging.getLogger("portfolio.github")

USER_AGENT = "phill-portfolio-github-integration"
CACHE: dict[str, tuple[float, Any]] = {}


class GitHubError(Exception):
    """A provider failure that maps to a friendly admin-facing message."""

    def __init__(
        self,
        message: str,
        *,
        code: str = "github_error",
        status_code: int = 502,
        retry_after: int | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.retry_after = retry_after


def clear_cache() -> None:
    CACHE.clear()


def _cache_key(token: str, path: str, params: dict[str, Any] | None) -> str:
    fingerprint = hashlib.sha256(token.encode("utf-8")).hexdigest()[:16]
    serialised = json.dumps(params or {}, sort_keys=True, default=str)
    return f"{fingerprint}:{path}:{serialised}"


def parse_timestamp(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _rate_limit_from_headers(headers: httpx.Headers) -> dict[str, Any]:
    def number(name: str) -> int | None:
        raw = headers.get(name)
        if raw is None or not raw.isdigit():
            return None
        return int(raw)

    reset = number("x-ratelimit-reset")
    return {
        "limit": number("x-ratelimit-limit"),
        "remaining": number("x-ratelimit-remaining"),
        "reset": reset,
        "reset_at": datetime.fromtimestamp(reset, UTC) if reset else None,
    }


def _rate_limit_message(reset_at: datetime | None) -> str:
    if reset_at is None:
        return "GitHub API rate limit reached. Try again later."
    return (
        "GitHub API rate limit reached. Try again after "
        f"{reset_at.astimezone(UTC).strftime('%H:%M UTC')}."
    )


def friendly_error(response: httpx.Response, *, reset_at: datetime | None = None) -> GitHubError:
    """Map a failed GitHub response onto a message safe to show an admin."""

    status = response.status_code
    body = ""
    try:
        body = response.text[:2000]
    except Exception:  # pragma: no cover - defensive only
        body = ""
    lowered = body.lower()
    remaining = response.headers.get("x-ratelimit-remaining")

    if status == 401:
        return GitHubError(
            "GitHub rejected the stored authorization. Reconnect your GitHub account.",
            code="unauthorized",
            status_code=401,
        )
    if status in {403, 429}:
        if remaining == "0" or "rate limit" in lowered:
            return GitHubError(
                _rate_limit_message(reset_at),
                code="rate_limited",
                status_code=429,
            )
        return GitHubError(
            "GitHub denied access to this resource. If the repository is private, "
            "reconnect GitHub with private repository access enabled.",
            code="forbidden",
            status_code=403,
        )
    if status == 404:
        return GitHubError(
            "The repository or file was not found, or this connection cannot access it. "
            "Private repositories require private repository access when connecting.",
            code="not_found",
            status_code=404,
        )
    if status == 409:
        return GitHubError(
            "This repository is empty or has no commits on the selected branch yet.",
            code="empty_repository",
            status_code=409,
        )
    if status == 422:
        return GitHubError(
            "GitHub rejected this request. Check the repository, branch, and file path.",
            code="invalid_request",
            status_code=422,
        )
    if status >= 500:
        return GitHubError(
            "GitHub is currently unavailable. Try again in a moment.",
            code="unavailable",
            status_code=502,
        )
    return GitHubError(
        "GitHub could not complete this request. Try again or reconnect GitHub.",
        code="github_error",
        status_code=502,
    )


class GitHubClient:
    """Async GitHub REST client bound to a single access token."""

    def __init__(self, token: str) -> None:
        self._token = token
        self._client = httpx.AsyncClient(
            base_url=settings.github_api_base_url.rstrip("/"),
            timeout=httpx.Timeout(settings.github_timeout_seconds),
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {token}",
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": USER_AGENT,
            },
            follow_redirects=False,
        )
        self.rate_limit: dict[str, Any] = {}

    async def __aenter__(self) -> "GitHubClient":
        return self

    async def __aexit__(self, *_exc: object) -> None:
        await self.close()

    async def close(self) -> None:
        await self._client.aclose()

    def _record_rate_limit(self, response: httpx.Response) -> None:
        captured = _rate_limit_from_headers(response.headers)
        if captured["limit"] is not None or captured["remaining"] is not None:
            self.rate_limit = captured

    async def request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        accept: str | None = None,
        extra_headers: dict[str, str] | None = None,
    ) -> httpx.Response:
        headers = dict(extra_headers or {})
        if accept:
            headers["Accept"] = accept

        attempts = max(0, settings.github_max_retries)
        last_error: GitHubError | None = None
        for attempt in range(attempts + 1):
            try:
                response = await self._client.request(
                    method, path, params=params, headers=headers or None
                )
            except httpx.TimeoutException as exc:
                last_error = GitHubError(
                    "GitHub did not respond in time. Try again.",
                    code="timeout",
                    status_code=504,
                )
                if attempt < attempts:
                    await asyncio.sleep(1 + attempt)
                    continue
                raise last_error from exc
            except httpx.HTTPError as exc:
                last_error = GitHubError(
                    "GitHub could not be reached. Check the network and try again.",
                    code="network_error",
                    status_code=502,
                )
                if attempt < attempts:
                    await asyncio.sleep(1 + attempt)
                    continue
                raise last_error from exc

            self._record_rate_limit(response)
            if response.status_code < 400:
                return response

            error = friendly_error(
                response, reset_at=self.rate_limit.get("reset_at")
            )
            transient = response.status_code in {429, 500, 502, 503, 504} or (
                response.status_code == 403 and error.code == "rate_limited"
            )
            if not transient or attempt >= attempts:
                raise error

            delay = 1.0 + attempt
            header = response.headers.get("retry-after")
            if header and header.isdigit():
                delay = min(float(header), 5.0)
            await asyncio.sleep(delay)

        raise last_error or GitHubError("GitHub request failed.", status_code=502)

    async def get_json(
        self,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        use_cache: bool = True,
        cache_ttl: int | None = None,
    ) -> Any:
        key = _cache_key(self._token, path, params)
        now = time.monotonic()
        if use_cache:
            cached = CACHE.get(key)
            if cached and cached[0] > now:
                return cached[1]

        response = await self.request("GET", path, params=params)
        try:
            payload = response.json()
        except ValueError as exc:
            raise GitHubError(
                "GitHub returned a response the application could not read.",
                code="invalid_response",
                status_code=502,
            ) from exc

        ttl = settings.github_cache_ttl_seconds if cache_ttl is None else cache_ttl
        if use_cache and ttl > 0:
            CACHE[key] = (now + ttl, payload)
        return payload

    async def get_bytes(
        self,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        max_bytes: int | None = None,
        accepted_types: set[str] | None = None,
    ) -> tuple[bytes, str | None]:
        response = await self.request(
            "GET",
            path,
            params=params,
            accept="application/vnd.github.raw",
            extra_headers={"Accept": "application/vnd.github.raw"},
        )
        content_type = response.headers.get("content-type", "").split(";")[0].strip()
        if accepted_types and content_type and content_type not in accepted_types:
            raise GitHubError(
                "The repository file is not an image format the media library accepts.",
                code="unsupported_media",
                status_code=415,
            )
        limit = max_bytes or settings.media_max_bytes
        if len(response.content) > limit:
            raise GitHubError(
                "The repository file is larger than the media library limit.",
                code="file_too_large",
                status_code=413,
            )
        return response.content, content_type or None

    async def paginate(
        self,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        per_page: int = 100,
        max_pages: int = 5,
    ) -> list[Any]:
        items: list[Any] = []
        base_params = dict(params or {})
        base_params["per_page"] = per_page
        for page in range(1, max_pages + 1):
            base_params["page"] = page
            payload = await self.get_json(path, params=base_params)
            if not isinstance(payload, list):
                break
            items.extend(payload)
            if len(payload) < per_page:
                break
        return items

    @staticmethod
    def contents_path(full_name: str, path: str = "") -> str:
        safe_path = quote(path.strip("/"), safe="/")
        suffix = f"/{safe_path}" if safe_path else ""
        return f"/repos/{full_name}/contents{suffix}"
