"""Private admin authentication.

Route -> auth service -> OTP service -> SMS abstraction -> Arkesel.
No provider HTTP call is made from a route handler.
"""

from __future__ import annotations

import uuid
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_authenticated_admin, get_client_key
from app.core.config import settings
from app.core.phone import PhoneNumberError, mask_phone, normalize_ghana_phone
from app.core.rate_limit import SlidingWindowLimiter
from app.core.time import as_utc, now_utc
from app.db.session import get_db
from app.models import ActivityLog, AdminUser, AuthSession, SmsLog
from app.schemas.auth import (
    ActivityOut,
    AdminOut,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    LoginResponse,
    ResendOtpRequest,
    ResetPasswordRequest,
    SecurityOverview,
    SessionOut,
    VerifyOtpRequest,
)
from app.schemas.common import MessageResponse
from app.services import activity
from app.services import auth as auth_service
from app.services import otp as otp_service
from app.services import sms as sms_service
from app.services.otp import OtpError

router = APIRouter(prefix="/auth", tags=["auth"])

login_limiter = SlidingWindowLimiter(
    limit=settings.login_rate_limit_per_15_minutes, window_seconds=900
)
verify_limiter = SlidingWindowLimiter(limit=30, window_seconds=900)
reset_request_limiter = SlidingWindowLimiter(limit=10, window_seconds=3600)


def _rate_limit(limiter: SlidingWindowLimiter, request: Request, message: str) -> None:
    allowed, retry_after = limiter.hit(get_client_key(request))
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=message,
            headers={"Retry-After": str(retry_after)},
        )


def _client_meta(request: Request) -> tuple[str | None, str | None]:
    ip = request.client.host if request.client else None
    agent = request.headers.get("user-agent")
    return ip, agent


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        max_age=settings.session_ttl_hours * 3600,
        path="/",
    )


def _challenge_response_fields(row, code: str) -> dict:
    return {
        "challenge_id": row.id,
        "phone_masked": mask_phone(row.phone_number),
        "expires_in": settings.otp_ttl_minutes * 60,
        "dev_otp": code if settings.exposes_development_otp else None,
    }


@router.post("/login", response_model=LoginResponse)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> LoginResponse:
    allowed, retry_after = login_limiter.hit(get_client_key(request))
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Try again later.",
            headers={"Retry-After": str(retry_after)},
        )

    try:
        user = auth_service.authenticate(db, payload.identifier, payload.password, request)
    except auth_service.AuthError as exc:
        code = (
            status.HTTP_423_LOCKED
            if exc.code == "locked"
            else status.HTTP_401_UNAUTHORIZED
        )
        raise HTTPException(status_code=code, detail=exc.message) from exc

    if user.phone:
        try:
            row, code = otp_service.create_challenge(db, user, otp_service.PURPOSE_LOGIN)
            otp_service.deliver(db, row, code)
        except OtpError as exc:
            activity.record(
                db,
                activity.OTP_FAILED,
                status="failure",
                user_id=user.id,
                identifier=user.email,
                detail=exc.code,
                request=request,
            )
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=exc.message) from exc
        except Exception as exc:  # pragma: no cover - defensive
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="We couldn't send the verification code right now. Please try again shortly.",
            ) from exc

        activity.record(
            db,
            activity.OTP_REQUESTED,
            user_id=user.id,
            identifier=user.email,
            detail="Login verification",
            request=request,
        )
        return LoginResponse(
            status="otp_required",
            message="Enter the code sent to your phone.",
            **_challenge_response_fields(row, code),
        )

    token, _ = auth_service.create_session(
        db, user, ip_address=_client_meta(request)[0], user_agent=_client_meta(request)[1]
    )
    _set_session_cookie(response, token)
    activity.record(
        db,
        activity.LOGIN,
        user_id=user.id,
        identifier=user.email,
        detail="Password login (no verification phone configured)",
        request=request,
    )
    return LoginResponse(status="authenticated", admin=AdminOut.model_validate(user))


@router.post("/verify-otp", response_model=LoginResponse)
def verify_otp(
    payload: VerifyOtpRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> LoginResponse:
    _rate_limit(
        verify_limiter,
        request,
        "Too many verification attempts. Wait a few minutes and try again.",
    )
    try:
        user = otp_service.verify(db, payload.challenge_id, otp_service.PURPOSE_LOGIN, payload.code)
    except OtpError as exc:
        activity.record(
            db,
            activity.OTP_FAILED,
            status="failure",
            detail=exc.code,
            request=request,
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message) from exc

    token, _ = auth_service.create_session(
        db, user, ip_address=_client_meta(request)[0], user_agent=_client_meta(request)[1]
    )
    _set_session_cookie(response, token)
    activity.record(
        db,
        activity.OTP_VERIFIED,
        user_id=user.id,
        identifier=user.email,
        detail="Login verification",
        request=request,
    )
    activity.record(
        db,
        activity.LOGIN,
        user_id=user.id,
        identifier=user.email,
        request=request,
    )
    return LoginResponse(status="authenticated", admin=AdminOut.model_validate(user))


@router.post("/resend-otp", response_model=LoginResponse)
def resend_otp(
    payload: ResendOtpRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> LoginResponse:
    from app.models import OtpVerification

    row = db.get(OtpVerification, payload.challenge_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="That code is no longer valid.")
    try:
        row, code = otp_service.resend(db, row)
    except OtpError as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS
            if exc.code in {"cooldown", "rate_limited"}
            else status.HTTP_400_BAD_REQUEST,
            detail=exc.message,
        ) from exc

    activity.record(
        db,
        activity.OTP_RESENT,
        user_id=row.user_id,
        detail=row.purpose,
        request=request,
    )
    return LoginResponse(
        status="otp_required",
        message="A new code has been sent.",
        **_challenge_response_fields(row, code),
    )


@router.post("/logout", response_model=MessageResponse)
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> MessageResponse:
    token = request.cookies.get(settings.session_cookie_name)
    admin = auth_service.resolve_session(db, token) if token else None
    if token:
        auth_service.revoke_session(db, token)
    response.delete_cookie(
        settings.session_cookie_name,
        path="/",
        secure=settings.cookie_secure,
        httponly=True,
        samesite=settings.cookie_samesite,
    )
    if admin is not None:
        activity.record(
            db,
            activity.LOGOUT,
            user_id=admin.id,
            identifier=admin.email,
            request=request,
        )
    return MessageResponse(message="Signed out")


@router.get("/me", response_model=AdminOut)
def me(admin: AdminUser = Depends(get_authenticated_admin)) -> AdminOut:
    return AdminOut.model_validate(admin)


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    payload: ChangePasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
    admin: AdminUser = Depends(get_authenticated_admin),
) -> MessageResponse:
    token = request.cookies.get(settings.session_cookie_name)
    try:
        auth_service.change_password(
            db,
            admin,
            payload.current_password,
            payload.new_password,
            keep_token=token,
        )
    except auth_service.AuthError as exc:
        activity.record(
            db,
            activity.PASSWORD_CHANGED,
            status="failure",
            user_id=admin.id,
            identifier=admin.email,
            detail=exc.code,
            request=request,
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message) from exc

    activity.record(
        db,
        activity.PASSWORD_CHANGED,
        user_id=admin.id,
        identifier=admin.email,
        detail="Other sessions revoked",
        request=request,
    )
    return MessageResponse(message="Password changed. Other sessions were signed out.")


def _identifier_hint(identifier: str) -> str | None:
    """A phone hint derived from the submitted value, never from the account.

    Returning the stored masked phone for an existing account (and ``None`` for
    an unknown one) would let the recovery form reveal whether an email address
    belongs to an administrator. The hint therefore depends only on what the
    caller typed: phone identifiers get their own mask; anything else gets none.
    """

    try:
        return mask_phone(normalize_ghana_phone(identifier)) or None
    except PhoneNumberError:
        return None


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> ForgotPasswordResponse:
    _rate_limit(
        reset_request_limiter,
        request,
        "Too many recovery requests. Wait a few minutes and try again.",
    )
    generic = (
        "If an account with that identifier exists and has a verification "
        "phone, a reset code has been sent."
    )
    hint = _identifier_hint(payload.identifier)
    user = auth_service.find_by_identifier(db, payload.identifier)

    if user is None or not user.is_active or not user.phone:
        # Keep the response shape identical; never confirm whether the account
        # exists. The phone hint comes from the submitted identifier only.
        return ForgotPasswordResponse(
            message=generic,
            challenge_id=uuid.uuid4(),
            phone_masked=hint,
            expires_in=settings.otp_ttl_minutes * 60,
            dev_otp=None,
        )

    try:
        row, code = otp_service.create_challenge(
            db, user, otp_service.PURPOSE_PASSWORD_RESET
        )
        otp_service.deliver(db, row, code)
    except OtpError as exc:
        activity.record(
            db,
            activity.OTP_FAILED,
            status="failure",
            user_id=user.id,
            identifier=user.email,
            detail=f"password_reset:{exc.code}",
            request=request,
        )
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=exc.message) from exc

    activity.record(
        db,
        activity.OTP_REQUESTED,
        user_id=user.id,
        identifier=user.email,
        detail="Password reset",
        request=request,
    )
    activity.record(
        db,
        activity.PASSWORD_RESET_REQUESTED,
        user_id=user.id,
        identifier=user.email,
        detail="Reset code issued to the configured phone",
        request=request,
    )
    return ForgotPasswordResponse(
        message=generic,
        challenge_id=row.id,
        phone_masked=hint,
        expires_in=settings.otp_ttl_minutes * 60,
        dev_otp=code if settings.exposes_development_otp else None,
    )


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(
    payload: ResetPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> MessageResponse:
    try:
        user = otp_service.verify(
            db, payload.challenge_id, otp_service.PURPOSE_PASSWORD_RESET, payload.code
        )
    except OtpError as exc:
        activity.record(
            db,
            activity.PASSWORD_RESET,
            status="failure",
            detail=exc.code,
            request=request,
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message) from exc

    try:
        auth_service.reset_password(db, user, payload.new_password)
    except auth_service.AuthError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message) from exc

    activity.record(
        db,
        activity.PASSWORD_RESET,
        user_id=user.id,
        identifier=user.email,
        detail="All sessions revoked",
        request=request,
    )
    return MessageResponse(message="Password reset. Sign in with your new password.")


@router.get("/sessions", response_model=list[SessionOut])
def list_sessions(
    request: Request,
    db: Session = Depends(get_db),
    admin: AdminUser = Depends(get_authenticated_admin),
) -> list[SessionOut]:
    current_token = request.cookies.get(settings.session_cookie_name)
    current = auth_service.get_session(db, current_token or "")
    items: list[SessionOut] = []
    for item in auth_service.active_sessions(db, admin.id):
        items.append(
            SessionOut(
                id=item.id,
                created_at=item.created_at,
                last_used_at=item.last_used_at,
                expires_at=item.expires_at,
                ip_address=item.ip_address,
                user_agent=item.user_agent,
                is_current=bool(current and current.id == item.id),
            )
        )
    return items


@router.delete("/sessions/{session_id}", response_model=MessageResponse)
def revoke_session(
    session_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    admin: AdminUser = Depends(get_authenticated_admin),
) -> MessageResponse:
    if not auth_service.revoke_session_by_id(db, session_id, admin.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
    activity.record(
        db,
        activity.SESSION_REVOKED,
        user_id=admin.id,
        identifier=admin.email,
        detail="Session revoked",
        request=request,
    )
    return MessageResponse(message="Session revoked.")


@router.get("/security", response_model=SecurityOverview)
def security_overview(
    request: Request,
    db: Session = Depends(get_db),
    admin: AdminUser = Depends(get_authenticated_admin),
) -> SecurityOverview:
    sessions = auth_service.active_sessions(db, admin.id)
    current_token = request.cookies.get(settings.session_cookie_name)
    current = auth_service.get_session(db, current_token or "")
    since = now_utc() - timedelta(hours=24)

    events = list(
        db.scalars(
            select(ActivityLog)
            .where(ActivityLog.user_id == admin.id)
            .order_by(ActivityLog.created_at.desc())
            .limit(20)
        ).all()
    )
    failed = db.scalar(
        select(func.count())
        .select_from(ActivityLog)
        .where(ActivityLog.event == activity.LOGIN_FAILED)
        .where(ActivityLog.created_at >= since)
    ) or 0

    def event_count(event: str) -> int:
        return (
            db.scalar(
                select(func.count())
                .select_from(ActivityLog)
                .where(ActivityLog.event == event)
                .where(ActivityLog.created_at >= since)
            )
            or 0
        )

    successful_logins = event_count(activity.LOGIN)
    otp_verified = event_count(activity.OTP_VERIFIED)
    otp_failures = event_count(activity.OTP_FAILED)
    password_changes = event_count(activity.PASSWORD_CHANGED)

    sms_rows = db.execute(
        select(SmsLog.status, func.count())
        .where(SmsLog.created_at >= since)
        .group_by(SmsLog.status)
    ).all()
    sms_counts = {
        "QUEUED": 0,
        "SENT": 0,
        "DELIVERED": 0,
        "FAILED": 0,
        "EXPIRED": 0,
        "CANCELLED": 0,
    }
    for sms_status, count in sms_rows:
        if sms_status in sms_counts:
            sms_counts[sms_status] = int(count)

    otp_sent = sms_counts["SENT"] + sms_counts["DELIVERED"]
    sms_denominator = sms_counts["SENT"] + sms_counts["DELIVERED"] + sms_counts["FAILED"]
    otp_attempts = otp_verified + otp_failures
    revoked = (
        db.scalar(
            select(func.count())
            .select_from(AuthSession)
            .where(AuthSession.user_id == admin.id)
            .where(AuthSession.revoked_at.is_not(None))
        )
        or 0
    )

    changed = as_utc(admin.password_changed_at)
    password_age = (now_utc() - changed).days if changed else None

    return SecurityOverview(
        admin=AdminOut.model_validate(admin),
        sessions=[
            SessionOut(
                id=item.id,
                created_at=item.created_at,
                last_used_at=item.last_used_at,
                expires_at=item.expires_at,
                ip_address=item.ip_address,
                user_agent=item.user_agent,
                is_current=bool(current and current.id == item.id),
            )
            for item in sessions
        ],
        recent_events=[ActivityOut.model_validate(event) for event in events],
        failed_logins_24h=failed,
        active_sessions=len(sessions),
        password_age_days=password_age,
        successful_logins_24h=successful_logins,
        otp_sent_24h=otp_sent,
        otp_failures_24h=otp_failures,
        otp_success_rate=(
            round(otp_verified / otp_attempts * 100, 1) if otp_attempts else None
        ),
        sms_delivery_24h=sms_counts,
        sms_success_rate=(
            round(sms_counts["DELIVERED"] / sms_denominator * 100, 1)
            if sms_denominator
            else None
        ),
        sms_provider=sms_service.provider_name(),
        revoked_sessions=revoked,
        password_changes_24h=password_changes,
    )
