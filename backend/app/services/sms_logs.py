"""SMS delivery log: safe metadata for every transactional message.

A row is created before the provider call (``QUEUED``), moved to ``SENT`` when
the provider accepts the request, and later reconciled by the signed delivery
webhook. The message body is never stored, so an OTP cannot be recovered from
this table.
"""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.phone import mask_phone
from app.core.time import now_utc
from app.models import SmsLog

PURPOSE_LOGIN = "LOGIN_OTP"
PURPOSE_PASSWORD_RESET = "PASSWORD_RESET_OTP"

_PURPOSE_MAP = {
    "login": PURPOSE_LOGIN,
    "password_reset": PURPOSE_PASSWORD_RESET,
}

_TERMINAL = {"DELIVERED", "FAILED", "EXPIRED", "CANCELLED"}

_STATUS_MAP = {
    "queued": "QUEUED",
    "pending": "QUEUED",
    "scheduled": "QUEUED",
    "accepted": "SENT",
    "submitted": "SENT",
    "sent": "SENT",
    "delivered": "DELIVERED",
    "delivery_success": "DELIVERED",
    "success": "DELIVERED",
    "failed": "FAILED",
    "failure": "FAILED",
    "undelivered": "FAILED",
    "rejected": "FAILED",
    "error": "FAILED",
    "expired": "EXPIRED",
    "cancelled": "CANCELLED",
    "canceled": "CANCELLED",
}


def purpose_label(purpose: str) -> str:
    return _PURPOSE_MAP.get(purpose, purpose.upper()[:40])


def normalize_status(value: Any) -> str | None:
    if value is None:
        return None
    return _STATUS_MAP.get(str(value).strip().lower())


def create_queued(
    db: Session,
    *,
    user_id: uuid.UUID | None,
    otp_id: uuid.UUID | None,
    purpose: str,
    phone: str,
    sender_id: str | None,
    provider: str,
    message_type: str = "otp",
) -> SmsLog:
    row = SmsLog(
        user_id=user_id,
        otp_id=otp_id,
        purpose=purpose_label(purpose),
        recipient_phone=phone,
        sender_id=sender_id,
        message_type=message_type,
        provider=provider,
        status="QUEUED",
    )
    db.add(row)
    db.flush()
    return row


def mark_sent(
    db: Session, row: SmsLog, provider_message_id: str | None, provider: str | None = None
) -> None:
    row.status = "SENT"
    row.provider_message_id = provider_message_id
    row.sent_at = now_utc()
    row.failure_reason = None
    if provider:
        row.provider = provider
    db.flush()


def mark_failed(db: Session, row: SmsLog, reason: str) -> None:
    row.status = "FAILED"
    row.failure_reason = reason[:200]
    db.flush()


def apply_delivery(
    db: Session,
    provider_message_id: str,
    raw_status: Any,
    *,
    failure_reason: str | None = None,
) -> SmsLog | None:
    """Reconcile a webhook status against the matching SMS log.

    Terminal records are never downgraded, so a late ``sent`` callback cannot
    erase a confirmed ``DELIVERED`` result. The caller owns the transaction.
    """

    status = normalize_status(raw_status)
    if status is None:
        return None

    row = db.scalar(select(SmsLog).where(SmsLog.provider_message_id == provider_message_id))
    if row is None:
        return None

    if row.status in _TERMINAL:
        return row

    row.status = status
    if status == "DELIVERED":
        row.delivered_at = now_utc()
        row.failure_reason = None
    elif status in {"FAILED", "EXPIRED", "CANCELLED"}:
        if failure_reason:
            row.failure_reason = failure_reason[:200]
    return row


def masked_recipient(value: str | None) -> str:
    return mask_phone(value)
