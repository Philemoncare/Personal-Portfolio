"""One-time code lifecycle: generation, delivery, verification, resend."""

from __future__ import annotations

import logging
import uuid
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.rate_limit import SlidingWindowLimiter
from app.core.security import generate_otp, hash_otp, verify_otp_hash
from app.core.time import as_utc, now_utc, seconds_between
from app.models import AdminUser, OtpVerification
from app.services import sms, sms_logs
from app.services.sms import SmsError

logger = logging.getLogger("portfolio.otp")

PURPOSE_LOGIN = "login"
PURPOSE_PASSWORD_RESET = "password_reset"
PURPOSES = {PURPOSE_LOGIN, PURPOSE_PASSWORD_RESET}

otp_request_limiter = SlidingWindowLimiter(
    limit=settings.otp_requests_per_hour,
    window_seconds=3600,
)


class OtpError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


class OtpDeliveryError(OtpError):
    pass


def message_for(code: str, purpose: str = PURPOSE_LOGIN) -> str:
    """The SMS body. Short, branded and explicit about what the code is for."""

    action = "password reset" if purpose == PURPOSE_PASSWORD_RESET else "sign-in"
    return (
        f"{settings.sms_brand_name}: {code} is your {action} code. "
        f"It expires in {settings.otp_ttl_minutes} minutes. Never share it."
    )


def _invalidate_active(db: Session, user_id: uuid.UUID, purpose: str) -> None:
    rows = db.scalars(
        select(OtpVerification)
        .where(OtpVerification.user_id == user_id)
        .where(OtpVerification.purpose == purpose)
        .where(OtpVerification.verified_at.is_(None))
        .where(OtpVerification.invalidated_at.is_(None))
    ).all()
    stamp = now_utc()
    for row in rows:
        row.invalidated_at = stamp
    if rows:
        db.commit()


def create_challenge(
    db: Session, user: AdminUser, purpose: str
) -> tuple[OtpVerification, str]:
    if purpose not in PURPOSES:
        raise OtpError("invalid_purpose", "Unsupported verification purpose.")
    if not user.phone:
        raise OtpError("no_phone", "No verification phone is configured for this account.")

    allowed, retry_after = otp_request_limiter.hit(user.phone)
    if not allowed:
        raise OtpError(
            "rate_limited",
            f"Too many codes requested. Try again in {max(1, retry_after // 60)} minute(s).",
        )

    _invalidate_active(db, user.id, purpose)

    code = generate_otp()
    row = OtpVerification(
        user_id=user.id,
        purpose=purpose,
        phone_number=user.phone,
        code_hash=hash_otp(code, purpose),
        expires_at=now_utc() + timedelta(minutes=settings.otp_ttl_minutes),
        max_attempts=settings.otp_max_attempts,
        last_sent_at=now_utc(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row, code


def deliver(db: Session, row: OtpVerification, code: str) -> None:
    """Send the code and maintain the delivery log.

    ``QUEUED`` is persisted before the provider call so a crash mid-request
    still leaves an auditable record. The body (and therefore the code) is
    never written to the database or the log.
    """

    log = sms_logs.create_queued(
        db,
        user_id=row.user_id,
        otp_id=row.id,
        purpose=row.purpose,
        phone=row.phone_number,
        sender_id=sms.sender_name(),
        provider=sms.provider_name(),
    )
    db.commit()

    try:
        result = sms.send_sms(row.phone_number, message_for(code, row.purpose))
    except SmsError as exc:
        row.delivery_status = f"failed:{exc.code}"
        sms_logs.mark_failed(db, log, exc.code)
        db.commit()
        logger.warning("OTP delivery failed (%s) for challenge %s", exc.code, row.id)
        raise OtpDeliveryError(
            "delivery_failed",
            "We couldn't send the verification code right now. Please try again shortly.",
        ) from exc

    sms_logs.mark_sent(db, log, result.provider_message_id, result.provider)
    row.delivery_status = result.status.lower()
    row.provider_message_id = result.provider_message_id
    db.commit()


def resend(db: Session, row: OtpVerification) -> tuple[OtpVerification, str]:
    now = now_utc()
    if row.verified_at is not None:
        raise OtpError("invalid_challenge", "This verification request is no longer valid.")
    sent_at = as_utc(row.last_sent_at)
    waited = seconds_between(sent_at, now)
    if waited < settings.otp_resend_cooldown_seconds:
        remaining = int(settings.otp_resend_cooldown_seconds - waited)
        raise OtpError(
            "cooldown",
            f"Please wait {remaining} second(s) before requesting another code.",
        )

    user = db.get(AdminUser, row.user_id)
    if user is None or not user.is_active or not user.phone:
        raise OtpError("invalid_challenge", "This verification request is no longer valid.")

    allowed, retry_after = otp_request_limiter.hit(user.phone)
    if not allowed:
        raise OtpError(
            "rate_limited",
            f"Too many codes requested. Try again in {max(1, retry_after // 60)} minute(s).",
        )

    # An expired or attempt-exhausted challenge may be replaced by a fresh code.
    # Any other active challenge for the purpose is invalidated first, so only
    # one code is ever usable at a time.
    _invalidate_active(db, row.user_id, row.purpose)
    row.invalidated_at = None
    code = generate_otp()
    row.code_hash = hash_otp(code, row.purpose)
    row.expires_at = now + timedelta(minutes=settings.otp_ttl_minutes)
    row.attempts = 0
    row.resend_count += 1
    row.last_sent_at = now
    row.delivery_status = None
    db.commit()
    db.refresh(row)
    deliver(db, row, code)
    return row, code


def verify(
    db: Session, challenge_id: uuid.UUID, purpose: str, code: str
) -> AdminUser:
    row = db.get(OtpVerification, challenge_id)
    if row is None or row.purpose != purpose:
        raise OtpError("invalid_code", "That code is not valid.")

    expired = as_utc(row.expires_at) <= now_utc()

    if row.verified_at is not None:
        raise OtpError("used_code", "That code has already been used.")

    if row.attempts >= row.max_attempts:
        if row.invalidated_at is None:
            row.invalidated_at = now_utc()
            db.commit()
        raise OtpError("too_many_attempts", "Too many attempts. Request a new code.")

    if row.invalidated_at is not None:
        if expired:
            raise OtpError("expired_code", "That code has expired. Request a new one.")
        raise OtpError(
            "invalid_challenge",
            "This verification request is no longer valid. Request a new code.",
        )

    if expired:
        row.invalidated_at = now_utc()
        db.commit()
        raise OtpError("expired_code", "That code has expired. Request a new one.")

    if not verify_otp_hash(code, purpose, row.code_hash):
        row.attempts += 1
        if row.attempts >= row.max_attempts:
            row.invalidated_at = now_utc()
            db.commit()
            raise OtpError("too_many_attempts", "Too many attempts. Request a new code.")
        db.commit()
        raise OtpError("invalid_code", "That code is not valid.")

    user = db.get(AdminUser, row.user_id)
    if user is None or not user.is_active:
        raise OtpError("invalid_code", "That code is not valid.")

    stamp = now_utc()
    row.verified_at = stamp
    row.invalidated_at = stamp
    user.last_login_at = stamp
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()
    db.refresh(user)
    return user
