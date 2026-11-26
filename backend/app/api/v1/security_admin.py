"""Admin security and SMS delivery APIs.

These endpoints expose real database records only. They never return OTP
plaintext, session tokens, provider keys or full phone numbers.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.core.config import settings
from app.core.time import as_utc, now_utc
from app.db.session import get_db
from app.models import ActivityLog, AdminUser, AuthSession, SmsLog
from app.schemas.auth import (
    ActivityListOut,
    ActivityOut,
    AdminSessionOut,
    SessionRevokeAllRequest,
    SessionRevokeRequest,
    SmsLogListOut,
    SmsLogOut,
)
from app.schemas.common import MessageResponse
from app.services import activity, auth as auth_service
from app.services.sms import STATUSES as SMS_STATUSES

router = APIRouter(prefix="/admin", tags=["admin:security"])

ACTIVITY_SORT_FIELDS = {
    "created_at": ActivityLog.created_at,
    "event": ActivityLog.event,
    "status": ActivityLog.status,
}

SMS_SORT_FIELDS = {
    "created_at": SmsLog.created_at,
    "status": SmsLog.status,
    "sent_at": SmsLog.sent_at,
}


def _session_status(row: AuthSession) -> str:
    if row.revoked_at is not None:
        return "revoked"
    expires = as_utc(row.expires_at)
    if expires is not None and expires <= now_utc():
        return "expired"
    return "active"


def _session_out(row: AuthSession, current_id: uuid.UUID | None) -> AdminSessionOut:
    return AdminSessionOut(
        id=row.id,
        created_at=row.created_at,
        last_used_at=row.last_used_at,
        expires_at=row.expires_at,
        ip_address=row.ip_address,
        user_agent=row.user_agent,
        is_current=bool(current_id and current_id == row.id),
        revoked_at=row.revoked_at,
        status=_session_status(row),
    )


@router.get("/security/activity", response_model=ActivityListOut)
def list_activity(
    search: str | None = Query(default=None, max_length=120),
    event: str | None = Query(default=None, max_length=60),
    status_filter: str | None = Query(default=None, alias="status", max_length=20),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    sort: Literal["created_at", "event", "status"] = Query(default="created_at"),
    order: Literal["asc", "desc"] = Query(default="desc"),
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
) -> ActivityListOut:
    conditions = []
    if admin.role != "SUPER_ADMIN":
        conditions.append(ActivityLog.user_id == admin.id)
    if search:
        needle = f"%{search.strip().lower()}%"
        conditions.append(
            or_(
                func.lower(ActivityLog.identifier).like(needle),
                func.lower(ActivityLog.detail).like(needle),
                func.lower(ActivityLog.event).like(needle),
                func.lower(ActivityLog.ip_address).like(needle),
            )
        )
    if event:
        conditions.append(ActivityLog.event == event)
    if status_filter:
        conditions.append(ActivityLog.status == status_filter)
    if date_from:
        conditions.append(ActivityLog.created_at >= date_from)
    if date_to:
        conditions.append(ActivityLog.created_at <= date_to)

    base = select(ActivityLog)
    if conditions:
        base = base.where(*conditions)

    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    column = ACTIVITY_SORT_FIELDS[sort]
    ordered = base.order_by(column.asc() if order == "asc" else column.desc())
    rows = db.scalars(ordered.limit(limit).offset(offset)).all()

    return ActivityListOut(
        items=[ActivityOut.model_validate(row) for row in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/security/sessions", response_model=list[AdminSessionOut])
def list_sessions(
    request: Request,
    include_revoked: bool = Query(default=True),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
) -> list[AdminSessionOut]:
    token = request.cookies.get(settings.session_cookie_name)
    current = auth_service.get_session(db, token or "")
    current_id = current.id if current else None

    # Sessions are listed for the caller only. The revoke endpoints are also
    # scoped to the caller, so showing other administrators' devices here would
    # imply a capability the API does not offer.
    statement = select(AuthSession).where(AuthSession.user_id == admin.id)
    if not include_revoked:
        statement = statement.where(AuthSession.revoked_at.is_(None))
    else:
        cutoff = now_utc() - timedelta(days=30)
        statement = statement.where(
            or_(
                AuthSession.revoked_at.is_(None),
                AuthSession.revoked_at >= cutoff,
            )
        )
    rows = db.scalars(
        statement.order_by(AuthSession.last_used_at.desc()).limit(limit)
    ).all()
    return [_session_out(row, current_id) for row in rows]


@router.post("/security/sessions/revoke", response_model=MessageResponse)
def revoke_session(
    payload: SessionRevokeRequest,
    request: Request,
    db: Session = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
) -> MessageResponse:
    token = request.cookies.get(settings.session_cookie_name)
    current = auth_service.get_session(db, token or "")
    if current is not None and current.id == payload.session_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Use sign out to end the session you are currently using.",
        )

    if not auth_service.revoke_session_by_id(db, payload.session_id, admin.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    activity.record(
        db,
        activity.SESSION_REVOKED,
        user_id=admin.id,
        identifier=admin.email,
        detail="Session revoked from the security dashboard",
        request=request,
    )
    return MessageResponse(message="Session revoked.")


@router.post("/security/sessions/revoke-all", response_model=MessageResponse)
def revoke_all_sessions(
    payload: SessionRevokeAllRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
) -> MessageResponse:
    token = request.cookies.get(settings.session_cookie_name)
    keep = token if payload.keep_current else None
    count = auth_service.revoke_all_sessions(db, admin.id, except_token=keep)

    if not payload.keep_current:
        response.delete_cookie(
            settings.session_cookie_name,
            path="/",
            secure=settings.cookie_secure,
            httponly=True,
            samesite=settings.cookie_samesite,
        )

    activity.record(
        db,
        activity.SESSION_REVOKED,
        user_id=admin.id,
        identifier=admin.email,
        detail=f"{count} session(s) revoked; current session {'kept' if keep else 'revoked'}",
        request=request,
    )
    return MessageResponse(
        message=f"{count} other session(s) revoked." if keep else f"{count} session(s) revoked."
    )


@router.get("/sms", response_model=SmsLogListOut)
def list_sms(
    search: str | None = Query(default=None, max_length=120),
    sms_status: str | None = Query(default=None, alias="status", max_length=20),
    purpose: str | None = Query(default=None, max_length=40),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    sort: Literal["created_at", "status", "sent_at"] = Query(default="created_at"),
    order: Literal["asc", "desc"] = Query(default="desc"),
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
) -> SmsLogListOut:
    conditions = []
    if admin.role != "SUPER_ADMIN":
        conditions.append(SmsLog.user_id == admin.id)
    if search:
        needle = f"%{search.strip().lower()}%"
        conditions.append(
            or_(
                func.lower(SmsLog.recipient_phone).like(needle),
                func.lower(SmsLog.provider_message_id).like(needle),
                func.lower(SmsLog.sender_id).like(needle),
                func.lower(SmsLog.failure_reason).like(needle),
            )
        )
    if sms_status:
        normalized = sms_status.upper()
        if normalized not in SMS_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Unknown text message status filter.",
            )
        conditions.append(SmsLog.status == normalized)
    if purpose:
        conditions.append(SmsLog.purpose == purpose)
    if date_from:
        conditions.append(SmsLog.created_at >= date_from)
    if date_to:
        conditions.append(SmsLog.created_at <= date_to)

    base = select(SmsLog)
    if conditions:
        base = base.where(*conditions)

    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    column = SMS_SORT_FIELDS[sort]
    ordered = base.order_by(column.asc() if order == "asc" else column.desc())
    rows = db.scalars(ordered.limit(limit).offset(offset)).all()

    return SmsLogListOut(
        items=[SmsLogOut.from_model(row) for row in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/sms/{sms_id}", response_model=SmsLogOut)
def get_sms(
    sms_id: uuid.UUID,
    db: Session = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
) -> SmsLogOut:
    row = db.get(SmsLog, sms_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Text message not found.")
    if admin.role != "SUPER_ADMIN" and row.user_id != admin.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Text message not found.")
    return SmsLogOut.from_model(row)
