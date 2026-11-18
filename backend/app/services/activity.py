"""Security and content activity log.

Only non-secret metadata is recorded. Passwords, OTP plaintext, provider keys
and session tokens must never be passed into this module.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.models import ActivityLog

# Events used across authentication, content and settings.
LOGIN = "login"
LOGIN_FAILED = "login_failed"
LOGOUT = "logout"
OTP_REQUESTED = "otp_requested"
OTP_RESENT = "otp_resent"
OTP_VERIFIED = "otp_verified"
OTP_FAILED = "otp_failed"
PASSWORD_CHANGED = "password_changed"
PASSWORD_RESET = "password_reset"
PASSWORD_RESET_REQUESTED = "password_reset_requested"
SESSION_REVOKED = "session_revoked"
PROJECT_PUBLISHED = "project_published"
PROJECT_DELETED = "project_deleted"
SETTINGS_CHANGED = "settings_changed"
USER_CREATED = "user_created"
USER_UPDATED = "user_updated"
MEDIA_UPLOADED = "media_uploaded"
MEDIA_UPDATED = "media_updated"
MEDIA_DELETED = "media_deleted"


def _client_meta(request: Any | None) -> tuple[str | None, str | None]:
    if request is None:
        return None, None
    ip = request.client.host if getattr(request, "client", None) else None
    agent = request.headers.get("user-agent") if hasattr(request, "headers") else None
    return ip[:64] if ip else None, agent[:400] if agent else None


def record(
    db: Session,
    event: str,
    *,
    status: str = "success",
    user_id: Any | None = None,
    identifier: str | None = None,
    detail: str | None = None,
    request: Any | None = None,
    commit: bool = True,
) -> ActivityLog:
    ip, agent = _client_meta(request)
    entry = ActivityLog(
        user_id=user_id,
        event=event,
        status=status,
        identifier=identifier[:255] if identifier else None,
        detail=detail[:500] if detail else None,
        ip_address=ip,
        user_agent=agent,
    )
    db.add(entry)
    if commit:
        db.commit()
    return entry
