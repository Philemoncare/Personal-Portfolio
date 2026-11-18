"""Authentication service: credentials, lockout and opaque sessions."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.phone import PhoneNumberError, normalize_ghana_phone
from app.core.security import (
    generate_session_token,
    hash_password,
    hash_session_token,
    needs_rehash,
    password_problem,
    verify_password,
)
from app.core.time import as_utc, now_utc
from app.models import AdminUser, AuthSession
from app.services import activity

_DUMMY_HASH = hash_password("dummy-password-for-timing-equalization")


class AuthError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


def find_by_identifier(db: Session, identifier: str) -> AdminUser | None:
    value = identifier.strip()
    if not value:
        return None
    if "@" in value:
        return db.scalar(select(AdminUser).where(AdminUser.email == value.lower()))
    try:
        phone = normalize_ghana_phone(value)
    except PhoneNumberError:
        return None
    return db.scalar(select(AdminUser).where(AdminUser.phone == phone))


def authenticate(
    db: Session,
    identifier: str,
    password: str,
    request=None,
) -> AdminUser:
    user = find_by_identifier(db, identifier)

    if user is None:
        # Equalize timing so a missing account is not distinguishable.
        verify_password(password, _DUMMY_HASH)
        activity.record(
            db,
            activity.LOGIN_FAILED,
            status="failure",
            identifier=identifier,
            detail="Unknown identifier",
            request=request,
        )
        raise AuthError("invalid_credentials", "Invalid credentials.")

    if not user.is_active:
        verify_password(password, _DUMMY_HASH)
        activity.record(
            db,
            activity.LOGIN_FAILED,
            status="failure",
            user_id=user.id,
            identifier=user.email,
            detail="Inactive account",
            request=request,
        )
        raise AuthError("invalid_credentials", "Invalid credentials.")

    locked_until = as_utc(user.locked_until)
    if locked_until and locked_until > now_utc():
        activity.record(
            db,
            activity.LOGIN_FAILED,
            status="failure",
            user_id=user.id,
            identifier=user.email,
            detail="Account temporarily locked",
            request=request,
        )
        raise AuthError(
            "locked",
            "Too many failed attempts. Try again later or reset your password.",
        )

    if not verify_password(password, user.password_hash):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= settings.login_max_failures:
            user.locked_until = now_utc() + timedelta(minutes=settings.login_lockout_minutes)
            user.failed_login_attempts = 0
            detail = "Locked after repeated failures"
        else:
            detail = "Wrong password"
        db.commit()
        activity.record(
            db,
            activity.LOGIN_FAILED,
            status="failure",
            user_id=user.id,
            identifier=user.email,
            detail=detail,
            request=request,
        )
        raise AuthError("invalid_credentials", "Invalid credentials.")

    if needs_rehash(user.password_hash):
        user.password_hash = hash_password(password)

    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()
    return user


def create_session(
    db: Session,
    user: AdminUser,
    *,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> tuple[str, AuthSession]:
    token = generate_session_token()
    session = AuthSession(
        user_id=user.id,
        token_hash=hash_session_token(token),
        expires_at=now_utc() + timedelta(hours=settings.session_ttl_hours),
        ip_address=ip_address[:64] if ip_address else None,
        user_agent=user_agent[:400] if user_agent else None,
    )
    db.add(session)
    user.last_login_at = now_utc()
    db.commit()
    db.refresh(session)
    return token, session


def resolve_session(db: Session, token: str) -> AdminUser | None:
    token_hash = hash_session_token(token)
    session = db.scalar(
        select(AuthSession)
        .where(AuthSession.token_hash == token_hash)
        .where(AuthSession.revoked_at.is_(None))
        .where(AuthSession.expires_at > now_utc())
    )
    if session is None:
        return None

    user = db.get(AdminUser, session.user_id)
    if user is None or not user.is_active:
        return None

    session.last_used_at = now_utc()
    db.commit()
    return user


def get_session(db: Session, token: str) -> AuthSession | None:
    if not token:
        return None
    return db.scalar(
        select(AuthSession)
        .where(AuthSession.token_hash == hash_session_token(token))
        .where(AuthSession.revoked_at.is_(None))
        .where(AuthSession.expires_at > now_utc())
    )


def revoke_session(db: Session, token: str) -> None:
    session = get_session(db, token)
    if session is not None:
        session.revoked_at = now_utc()
        db.commit()


def revoke_session_by_id(db: Session, session_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    session = db.get(AuthSession, session_id)
    if session is None or session.user_id != user_id:
        return False
    if session.revoked_at is None:
        session.revoked_at = now_utc()
        db.commit()
    return True


def revoke_all_sessions(
    db: Session, user_id: uuid.UUID, *, except_token: str | None = None
) -> int:
    statement = (
        select(AuthSession)
        .where(AuthSession.user_id == user_id)
        .where(AuthSession.revoked_at.is_(None))
    )
    if except_token:
        statement = statement.where(
            AuthSession.token_hash != hash_session_token(except_token)
        )
    sessions = db.scalars(statement).all()
    stamp = now_utc()
    for session in sessions:
        session.revoked_at = stamp
    db.commit()
    return len(sessions)


def active_sessions(db: Session, user_id: uuid.UUID) -> list[AuthSession]:
    return list(
        db.scalars(
            select(AuthSession)
            .where(AuthSession.user_id == user_id)
            .where(AuthSession.revoked_at.is_(None))
            .where(AuthSession.expires_at > now_utc())
            .order_by(AuthSession.last_used_at.desc())
        ).all()
    )


def prune_user_sessions(db: Session, user_id: uuid.UUID) -> None:
    db.execute(
        delete(AuthSession)
        .where(AuthSession.user_id == user_id)
        .where(AuthSession.expires_at < now_utc() - timedelta(days=7))
    )
    db.commit()


def change_password(
    db: Session,
    user: AdminUser,
    current_password: str,
    new_password: str,
    *,
    keep_token: str | None = None,
) -> None:
    if not verify_password(current_password, user.password_hash):
        raise AuthError("invalid_password", "The current password is not correct.")

    problem = password_problem(new_password)
    if problem:
        raise AuthError("weak_password", problem)

    if verify_password(new_password, user.password_hash):
        raise AuthError("same_password", "Choose a password you have not used here before.")

    user.password_hash = hash_password(new_password)
    user.must_change_password = False
    user.password_changed_at = now_utc()
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()
    revoke_all_sessions(db, user.id, except_token=keep_token)


def reset_password(db: Session, user: AdminUser, new_password: str) -> None:
    problem = password_problem(new_password)
    if problem:
        raise AuthError("weak_password", problem)

    user.password_hash = hash_password(new_password)
    user.must_change_password = False
    user.password_changed_at = now_utc()
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()
    revoke_all_sessions(db, user.id)


def session_expiry(user_session: AuthSession) -> datetime:
    return as_utc(user_session.expires_at) or now_utc()
