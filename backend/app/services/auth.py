"""Authentication service: opaque server-side sessions."""

from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    generate_session_token,
    hash_session_token,
    needs_rehash,
    verify_password,
    hash_password,
)
from app.models import AdminSession, AdminUser


class AuthError(Exception):
    pass


def authenticate(db: Session, email: str, password: str) -> AdminUser:
    user = db.scalar(select(AdminUser).where(AdminUser.email == email.lower().strip()))
    if user is None or not user.is_active or not verify_password(password, user.password_hash):
        raise AuthError("Invalid email or password")

    if needs_rehash(user.password_hash):
        user.password_hash = hash_password(password)

    user.last_login_at = datetime.now(UTC)
    db.commit()
    db.refresh(user)
    return user


def create_session(db: Session, user: AdminUser) -> tuple[str, AdminSession]:
    token = generate_session_token()
    session = AdminSession(
        id=hash_session_token(token),
        admin_user_id=user.id,
        expires_at=datetime.now(UTC) + timedelta(hours=settings.session_ttl_hours),
    )
    db.add(session)
    db.commit()
    return token, session


def resolve_session(db: Session, token: str) -> AdminUser | None:
    token_hash = hash_session_token(token)
    session = db.scalar(
        select(AdminSession)
        .where(AdminSession.id == token_hash)
        .where(AdminSession.revoked_at.is_(None))
        .where(AdminSession.expires_at > datetime.now(UTC))
    )
    if session is None:
        return None

    user = db.get(AdminUser, session.admin_user_id)
    if user is None or not user.is_active:
        return None

    session.last_seen_at = datetime.now(UTC)
    db.commit()
    return user


def revoke_session(db: Session, token: str) -> None:
    session = db.get(AdminSession, hash_session_token(token))
    if session is not None and session.revoked_at is None:
        session.revoked_at = datetime.now(UTC)
        db.commit()
