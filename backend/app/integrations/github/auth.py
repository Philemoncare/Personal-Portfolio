"""GitHub OAuth: state signing, code exchange, connection storage, revocation."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import secrets
import time
import uuid
from datetime import UTC, datetime
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import decrypt_secret, encrypt_secret
from app.integrations.github.client import GitHubClient, GitHubError, parse_timestamp
from app.models import AdminUser, GitHubConnection

logger = logging.getLogger("portfolio.github")

TOKEN_PURPOSE = "github-access-token"
REFRESH_PURPOSE = "github-refresh-token"


# --- OAuth state ----------------------------------------------------------


def _sign(value: str) -> str:
    return hmac.new(
        settings.secret_key.encode("utf-8"), value.encode("utf-8"), hashlib.sha256
    ).hexdigest()


def create_oauth_state(user_id: uuid.UUID, origin: str | None = None) -> str:
    payload = {
        "u": str(user_id),
        "n": secrets.token_urlsafe(16),
        "t": int(time.time()),
        "o": origin or "",
    }
    encoded = base64.urlsafe_b64encode(
        json.dumps(payload, separators=(",", ":")).encode("utf-8")
    ).decode("ascii")
    return f"{encoded}.{_sign(encoded)}"


def verify_oauth_state_info(state: str | None) -> dict[str, Any] | None:
    if not state or "." not in state:
        return None
    encoded, signature = state.rsplit(".", 1)
    if not hmac.compare_digest(_sign(encoded), signature):
        return None
    try:
        payload = json.loads(base64.urlsafe_b64decode(encoded.encode("ascii")))
        created = int(payload["t"])
        user_id = uuid.UUID(str(payload["u"]))
        origin = str(payload.get("o") or "")
    except (ValueError, KeyError, TypeError):
        return None
    ttl = settings.github_oauth_state_ttl_minutes * 60
    if time.time() - created > ttl:
        return None
    return {"user_id": user_id, "origin": origin}


def verify_oauth_state(state: str | None) -> uuid.UUID | None:
    info = verify_oauth_state_info(state)
    return info["user_id"] if info else None


def build_authorize_url(state: str) -> str:
    if not settings.github_configured:
        raise GitHubError(
            "GitHub OAuth is not configured on the server. Set GITHUB_CLIENT_ID, "
            "GITHUB_CLIENT_SECRET, and GITHUB_REDIRECT_URI.",
            code="not_configured",
            status_code=503,
        )
    from urllib.parse import urlencode

    query = urlencode(
        {
            "client_id": settings.github_client_id,
            "redirect_uri": settings.github_redirect_uri,
            "scope": " ".join(settings.github_scopes),
            "state": state,
            "allow_signup": "false",
        }
    )
    return f"{settings.github_oauth_authorize_url}?{query}"


# --- Code exchange and account -------------------------------------------


async def exchange_code(code: str) -> dict[str, Any]:
    """Exchange a temporary OAuth code for an access token."""

    if not settings.github_configured:
        raise GitHubError(
            "GitHub OAuth is not configured on the server.",
            code="not_configured",
            status_code=503,
        )
    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(settings.github_timeout_seconds)
        ) as client:
            response = await client.post(
                settings.github_oauth_token_url,
                data={
                    "client_id": settings.github_client_id,
                    "client_secret": settings.github_client_secret,
                    "code": code,
                    "redirect_uri": settings.github_redirect_uri,
                },
                headers={"Accept": "application/json"},
            )
    except httpx.HTTPError as exc:
        raise GitHubError(
            "GitHub authorization could not be completed. Check the network and try again.",
            code="network_error",
            status_code=502,
        ) from exc

    if response.status_code >= 400:
        raise GitHubError(
            "GitHub rejected the authorization. Try connecting again.",
            code="oauth_exchange_failed",
            status_code=400,
        )
    try:
        payload = response.json()
    except ValueError as exc:
        raise GitHubError(
            "GitHub returned an unreadable authorization response.",
            code="oauth_invalid_response",
            status_code=502,
        ) from exc

    if payload.get("error"):
        description = str(payload.get("error_description") or payload["error"])
        raise GitHubError(
            f"GitHub authorization failed: {description}.",
            code="oauth_error",
            status_code=400,
        )
    if not payload.get("access_token"):
        raise GitHubError(
            "GitHub did not return an access token. Try connecting again.",
            code="oauth_missing_token",
            status_code=400,
        )
    return payload


async def fetch_account(token: str) -> dict[str, Any]:
    async with GitHubClient(token) as client:
        payload = await client.get_json("/user", use_cache=False)
    if not isinstance(payload, dict) or not payload.get("login"):
        raise GitHubError(
            "GitHub did not return a usable account profile.",
            code="invalid_account",
            status_code=502,
        )
    return payload


# --- Connection storage ---------------------------------------------------


def get_connection(db: Session, user_id: uuid.UUID) -> GitHubConnection | None:
    return db.scalar(
        select(GitHubConnection).where(GitHubConnection.user_id == user_id)
    )


def require_connection(db: Session, admin: AdminUser) -> GitHubConnection:
    connection = get_connection(db, admin.id)
    if connection is None or not connection.is_active:
        raise GitHubError(
            "GitHub is not connected. Connect an account before importing repositories.",
            code="not_connected",
            status_code=409,
        )
    return connection


def connection_token(connection: GitHubConnection) -> str:
    if not connection.is_active:
        raise GitHubError(
            "GitHub authorization is no longer active. Reconnect GitHub.",
            code="not_connected",
            status_code=409,
        )
    try:
        token = decrypt_secret(connection.encrypted_access_token, TOKEN_PURPOSE)
    except ValueError as exc:
        raise GitHubError(
            "The stored GitHub authorization could not be read. Reconnect GitHub.",
            code="token_unreadable",
            status_code=409,
        ) from exc
    if not token:
        raise GitHubError(
            "The stored GitHub authorization is empty. Reconnect GitHub.",
            code="token_unreadable",
            status_code=409,
        )
    return token


def save_connection(
    db: Session,
    admin: AdminUser,
    *,
    token_payload: dict[str, Any],
    account: dict[str, Any],
) -> GitHubConnection:
    connection = get_connection(db, admin.id)
    now = datetime.now(UTC)
    scope_value = str(token_payload.get("scope") or "").strip()
    scopes = [scope for scope in scope_value.replace(" ", ",").split(",") if scope]
    if not scopes:
        scopes = list(settings.github_scopes)
    private_access = "repo" in scopes

    if connection is None:
        connection = GitHubConnection(user_id=admin.id)
        db.add(connection)

    connection.github_account_id = str(account.get("id") or "")
    connection.username = str(account.get("login") or "")
    connection.display_name = account.get("name")
    connection.avatar_url = account.get("avatar_url")
    connection.account_url = account.get("html_url")
    connection.encrypted_access_token = encrypt_secret(
        str(token_payload["access_token"]), TOKEN_PURPOSE
    )
    refresh = token_payload.get("refresh_token")
    connection.encrypted_refresh_token = (
        encrypt_secret(str(refresh), REFRESH_PURPOSE) if refresh else None
    )
    connection.token_type = str(token_payload.get("token_type") or "bearer")
    connection.scopes = ",".join(scopes)[:300]
    connection.private_repository_access = private_access
    connection.connected_at = now
    connection.revoked_at = None
    db.commit()
    db.refresh(connection)
    logger.info(
        "GitHub connection stored user=%s account=%s private=%s",
        admin.id,
        connection.username,
        private_access,
    )
    return connection


async def refresh_connection(connection: GitHubConnection) -> dict[str, Any]:
    """Verify the token against GitHub and return the current profile."""

    token = connection_token(connection)
    return await fetch_account(token)


async def revoke_connection(db: Session, connection: GitHubConnection) -> None:
    """Remove the credential, keep an audit row, and try remote revocation."""

    token = ""
    try:
        token = connection_token(connection)
    except GitHubError:
        token = ""

    if token and settings.github_client_id and settings.github_client_secret:
        # GitHub OAuth apps expose token revocation through basic auth.
        try:
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(settings.github_timeout_seconds)
            ) as client:
                await client.request(
                    "DELETE",
                    f"{settings.github_api_base_url.rstrip('/')}/applications/"
                    f"{settings.github_client_id}/token",
                    auth=(settings.github_client_id, settings.github_client_secret),
                    json={"access_token": token},
                    headers={"Accept": "application/vnd.github+json"},
                )
        except httpx.HTTPError:
            logger.warning("GitHub remote token revocation failed; clearing locally")

    connection.encrypted_access_token = ""
    connection.encrypted_refresh_token = None
    connection.revoked_at = datetime.now(UTC)
    db.commit()
    logger.info("GitHub connection revoked user=%s", connection.user_id)


def connection_last_seen(account: dict[str, Any]) -> dict[str, Any]:
    """Small helper kept pure so it can be reused without a database."""

    return {
        "username": str(account.get("login") or ""),
        "display_name": account.get("name"),
        "avatar_url": account.get("avatar_url"),
        "account_url": account.get("html_url"),
        "github_account_id": str(account.get("id") or ""),
        "connected_at_hint": parse_timestamp(account.get("created_at")),
    }
