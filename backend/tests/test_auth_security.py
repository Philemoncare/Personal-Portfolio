"""Authentication, OTP, Arkesel, webhook and media security tests."""

from __future__ import annotations

import io
import uuid
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.phone import PhoneNumberError, mask_phone, normalize_ghana_phone
from app.core.security import hash_password, sign_webhook
from app.core.time import now_utc
from app.models import AdminUser, MediaAsset, OtpVerification, SmsLog

PHONE = "0599811870"
CANONICAL_PHONE = "233599811870"
PASSWORD = "correct-horse-battery-staple"


@pytest.fixture(autouse=True)
def development_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "environment", "development")
    monkeypatch.setattr(settings, "arkesel_api_key", None)
    monkeypatch.setattr(settings, "arkesel_sender_id", None)
    monkeypatch.setattr(settings, "arkesel_webhook_secret", None)


def make_admin(db: Session, *, phone: str | None = CANONICAL_PHONE) -> AdminUser:
    admin = AdminUser(
        email="phone-admin@test.dev",
        phone=phone,
        full_name="Phone Admin",
        role="SUPER_ADMIN",
        password_hash=hash_password(PASSWORD),
        is_active=True,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


def start_login(client: TestClient, admin: AdminUser) -> dict:
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": admin.email, "password": PASSWORD},
    )
    assert response.status_code == 200, response.text
    return response.json()


# --- Phone normalization -------------------------------------------------


@pytest.mark.parametrize(
    "value",
    [
        "0599811870",
        "+233599811870",
        "233599811870",
        "0599 811 870",
        "00233599811870",
    ],
)
def test_ghana_phone_variants_normalize_to_one_format(value: str) -> None:
    assert normalize_ghana_phone(value) == CANONICAL_PHONE


@pytest.mark.parametrize("value", ["12345", "059981187", "0199999999", "0500000000"])
def test_invalid_phone_numbers_are_rejected(value: str) -> None:
    with pytest.raises(PhoneNumberError):
        normalize_ghana_phone(value)


# --- Login and OTP -------------------------------------------------------


def test_otp_message_is_short_branded_and_purpose_specific() -> None:
    from app.services import otp as otp_service

    login = otp_service.message_for("123456", otp_service.PURPOSE_LOGIN)
    reset = otp_service.message_for("123456", otp_service.PURPOSE_PASSWORD_RESET)

    assert login.startswith(f"{settings.sms_brand_name}: 123456")
    assert "sign-in code" in login
    assert "password reset code" in reset
    assert "Never share it." in login
    assert len(login) <= 160


def test_login_with_phone_returns_hashed_otp_challenge(
    client: TestClient, db_session: Session
) -> None:
    admin = make_admin(db_session)
    data = start_login(client, admin)

    assert data["status"] == "otp_required"
    assert data["phone_masked"] == "233******870"
    assert data["expires_in"] == settings.otp_ttl_minutes * 60
    assert data["dev_otp"] and len(data["dev_otp"]) == 6

    row = db_session.scalar(
        select(OtpVerification).where(OtpVerification.user_id == admin.id)
    )
    assert row is not None
    assert row.code_hash != data["dev_otp"]
    assert len(row.code_hash) == 64
    assert row.purpose == "login"
    assert client.get("/api/v1/auth/me").status_code == 401


def test_reserved_email_domain_does_not_break_authenticated_response(
    client: TestClient, db_session: Session
) -> None:
    """A stored address must never turn a successful login into a 500."""

    admin = make_admin(db_session)
    admin.email = "reserved-domain@portfolio.local"
    db_session.commit()

    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": admin.email, "password": PASSWORD},
    )
    assert response.status_code == 200, response.text
    challenge = response.json()

    verified = client.post(
        "/api/v1/auth/verify-otp",
        json={"challenge_id": challenge["challenge_id"], "code": challenge["dev_otp"]},
    )
    assert verified.status_code == 200, verified.text
    assert verified.json()["admin"]["email"] == admin.email


def test_verify_otp_sets_session_and_code_is_single_use(
    client: TestClient, db_session: Session
) -> None:
    admin = make_admin(db_session)
    challenge = start_login(client, admin)

    verified = client.post(
        "/api/v1/auth/verify-otp",
        json={"challenge_id": challenge["challenge_id"], "code": challenge["dev_otp"]},
    )
    assert verified.status_code == 200, verified.text
    assert verified.json()["status"] == "authenticated"
    assert "phill_session" in verified.cookies

    me = client.get("/api/v1/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == admin.email
    assert "password_hash" not in me.text

    reused = client.post(
        "/api/v1/auth/verify-otp",
        json={"challenge_id": challenge["challenge_id"], "code": challenge["dev_otp"]},
    )
    assert reused.status_code == 400


def test_wrong_otp_attempts_are_capped(client: TestClient, db_session: Session) -> None:
    admin = make_admin(db_session)
    challenge = start_login(client, admin)
    wrong = "000000" if challenge["dev_otp"] != "000000" else "111111"

    for attempt in range(1, settings.otp_max_attempts + 1):
        response = client.post(
            "/api/v1/auth/verify-otp",
            json={"challenge_id": challenge["challenge_id"], "code": wrong},
        )
        assert response.status_code == 400
        if attempt == settings.otp_max_attempts:
            # The failure that exhausts the cap must say so, not "invalid code".
            assert "too many attempts" in response.json()["detail"].lower()
        else:
            assert "not valid" in response.json()["detail"].lower()

    row = db_session.get(OtpVerification, uuid.UUID(challenge["challenge_id"]))
    db_session.refresh(row)
    assert row is not None and row.invalidated_at is not None

    # Even the correct code is refused once the cap is reached.
    response = client.post(
        "/api/v1/auth/verify-otp",
        json={"challenge_id": challenge["challenge_id"], "code": challenge["dev_otp"]},
    )
    assert response.status_code == 400
    assert "too many attempts" in response.json()["detail"].lower()


def test_resend_replaces_an_attempt_exhausted_challenge(
    client: TestClient, db_session: Session
) -> None:
    admin = make_admin(db_session)
    challenge = start_login(client, admin)
    wrong = "000000" if challenge["dev_otp"] != "000000" else "111111"

    for _ in range(settings.otp_max_attempts):
        client.post(
            "/api/v1/auth/verify-otp",
            json={"challenge_id": challenge["challenge_id"], "code": wrong},
        )

    row = db_session.get(OtpVerification, uuid.UUID(challenge["challenge_id"]))
    assert row is not None and row.invalidated_at is not None

    row.last_sent_at = now_utc() - timedelta(seconds=settings.otp_resend_cooldown_seconds + 5)
    db_session.commit()

    resent = client.post(
        "/api/v1/auth/resend-otp",
        json={"challenge_id": challenge["challenge_id"]},
    )
    assert resent.status_code == 200, resent.text
    fresh = resent.json()["dev_otp"]
    assert fresh != challenge["dev_otp"]

    db_session.refresh(row)
    assert row.invalidated_at is None
    assert row.attempts == 0

    verified = client.post(
        "/api/v1/auth/verify-otp",
        json={"challenge_id": challenge["challenge_id"], "code": fresh},
    )
    assert verified.status_code == 200, verified.text
    assert verified.json()["status"] == "authenticated"


def test_expired_otp_is_rejected(client: TestClient, db_session: Session) -> None:
    admin = make_admin(db_session)
    challenge = start_login(client, admin)

    row = db_session.get(OtpVerification, uuid.UUID(challenge["challenge_id"]))
    assert row is not None
    row.expires_at = now_utc() - timedelta(minutes=1)
    db_session.commit()

    response = client.post(
        "/api/v1/auth/verify-otp",
        json={"challenge_id": challenge["challenge_id"], "code": challenge["dev_otp"]},
    )
    assert response.status_code == 400
    assert "expired" in response.json()["detail"].lower()


def test_resend_respects_cooldown(client: TestClient, db_session: Session) -> None:
    admin = make_admin(db_session)
    challenge = start_login(client, admin)

    response = client.post(
        "/api/v1/auth/resend-otp",
        json={"challenge_id": challenge["challenge_id"]},
    )
    assert response.status_code == 429
    assert "wait" in response.json()["detail"].lower()


def test_account_lockout_after_repeated_failures(
    client: TestClient, db_session: Session
) -> None:
    admin = make_admin(db_session, phone=None)

    for _ in range(settings.login_max_failures):
        response = client.post(
            "/api/v1/auth/login",
            json={"identifier": admin.email, "password": "not-the-password"},
        )
        assert response.status_code == 401

    locked = client.post(
        "/api/v1/auth/login",
        json={"identifier": admin.email, "password": PASSWORD},
    )
    assert locked.status_code == 423

    db_session.refresh(admin)
    assert admin.locked_until is not None


# --- Passwords -----------------------------------------------------------


def test_password_change_keeps_current_session_and_revokes_others(
    client: TestClient, db_session: Session
) -> None:
    admin = make_admin(db_session, phone=None)
    login = client.post(
        "/api/v1/auth/login",
        json={"identifier": admin.email, "password": PASSWORD},
    )
    assert login.status_code == 200

    from app.services import auth as auth_service

    other_token, _ = auth_service.create_session(db_session, admin)

    changed = client.post(
        "/api/v1/auth/change-password",
        json={
            "current_password": PASSWORD,
            "new_password": "a-brand-new-long-password",
        },
    )
    assert changed.status_code == 200, changed.text
    assert client.get("/api/v1/auth/me").status_code == 200

    # The extra session was revoked, the current one was kept.
    assert auth_service.resolve_session(db_session, other_token) is None

    db_session.refresh(admin)
    assert admin.must_change_password is False
    assert admin.password_changed_at is not None


def test_password_reset_flow_revokes_sessions(client: TestClient, db_session: Session) -> None:
    admin = make_admin(db_session)
    challenge = start_login(client, admin)

    reset_request = client.post(
        "/api/v1/auth/forgot-password",
        json={"identifier": admin.email},
    )
    assert reset_request.status_code == 200
    reset = reset_request.json()
    assert reset["challenge_id"] != challenge["challenge_id"]

    response = client.post(
        "/api/v1/auth/reset-password",
        json={
            "challenge_id": reset["challenge_id"],
            "code": reset["dev_otp"],
            "new_password": "reset-password-is-long",
        },
    )
    assert response.status_code == 200, response.text

    db_session.refresh(admin)
    assert client.get("/api/v1/auth/me").status_code == 401

    relogin = client.post(
        "/api/v1/auth/login",
        json={"identifier": admin.email, "password": "reset-password-is-long"},
    )
    assert relogin.status_code == 200
    assert relogin.json()["status"] == "otp_required"


def test_forgot_password_does_not_reveal_accounts(
    client: TestClient, db_session: Session
) -> None:
    admin = make_admin(db_session)

    unknown = client.post(
        "/api/v1/auth/forgot-password",
        json={"identifier": "nobody@example.com"},
    )
    assert unknown.status_code == 200
    assert "if an account" in unknown.json()["message"].lower()
    assert unknown.json()["phone_masked"] is None

    # A real email account must not gain a phone hint, or the response would
    # distinguish it from an unknown address.
    known = client.post(
        "/api/v1/auth/forgot-password",
        json={"identifier": admin.email},
    )
    assert known.status_code == 200
    assert known.json()["phone_masked"] is None
    assert known.json()["message"] == unknown.json()["message"]

    # For phone identifiers the hint is derived from the submitted number, so
    # an unknown number produces the same kind of value as a known one.
    submitted = "0244000999"
    unknown_phone = client.post(
        "/api/v1/auth/forgot-password",
        json={"identifier": submitted},
    )
    assert unknown_phone.status_code == 200
    assert unknown_phone.json()["phone_masked"] == mask_phone(
        normalize_ghana_phone(submitted)
    )


# --- Roles ---------------------------------------------------------------


def test_editor_cannot_use_super_admin_media_library(
    client: TestClient, db_session: Session
) -> None:
    editor = AdminUser(
        email="editor@test.dev",
        password_hash=hash_password(PASSWORD),
        role="EDITOR",
        is_active=True,
    )
    db_session.add(editor)
    db_session.commit()

    login = client.post(
        "/api/v1/auth/login",
        json={"identifier": editor.email, "password": PASSWORD},
    )
    assert login.status_code == 200
    assert login.json()["status"] == "authenticated"

    denied = client.get("/api/v1/admin/media")
    assert denied.status_code == 403


# --- Webhook verification ------------------------------------------------


def _webhook_headers(timestamp: str, body: bytes, secret: str, webhook_id: str) -> dict:
    return {
        "X-Arkesel-Webhook-Timestamp": timestamp,
        "X-Arkesel-Webhook-Signature": sign_webhook(timestamp, body, secret),
        "X-Arkesel-Webhook-Id": webhook_id,
        "Content-Type": "application/json",
    }


def test_webhook_rejects_missing_or_bad_configuration(client: TestClient) -> None:
    response = client.post("/api/v1/webhooks/arkesel", json={"status": "delivered"})
    assert response.status_code in {400, 401}


def test_webhook_verifies_signature_and_rejects_replay(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    secret = "test-webhook-secret"
    monkeypatch.setattr(settings, "arkesel_webhook_secret", secret)
    body = b'{"status":"delivered","message_id":"abc"}'
    timestamp = str(int(now_utc().timestamp()))

    bad = client.post(
        "/api/v1/webhooks/arkesel",
        content=body,
        headers=_webhook_headers(timestamp, body, "wrong-secret", "evt-1"),
    )
    assert bad.status_code == 401

    stale_timestamp = str(int(now_utc().timestamp()) - 5000)
    stale = client.post(
        "/api/v1/webhooks/arkesel",
        content=body,
        headers=_webhook_headers(stale_timestamp, body, secret, "evt-2"),
    )
    assert stale.status_code == 401

    good = client.post(
        "/api/v1/webhooks/arkesel",
        content=body,
        headers=_webhook_headers(timestamp, body, secret, "evt-3"),
    )
    assert good.status_code == 200, good.text
    assert good.json()["status"] == "accepted"

    replay = client.post(
        "/api/v1/webhooks/arkesel",
        content=body,
        headers=_webhook_headers(timestamp, body, secret, "evt-3"),
    )
    assert replay.status_code == 200
    assert replay.json()["status"] == "duplicate"


# --- Arkesel error mapping ----------------------------------------------


class FakeResponse:
    def __init__(self, status_code: int, payload: object) -> None:
        self.status_code = status_code
        self._payload = payload

    def json(self) -> object:
        if isinstance(self._payload, Exception):
            raise self._payload
        return self._payload


def test_configured_provider_never_exposes_development_code(
    monkeypatch: pytest.MonkeyPatch, client: TestClient, db_session: Session
) -> None:
    """With a real provider configured, even development hides the local code."""

    from app.services import arkesel_service

    monkeypatch.setattr(settings, "arkesel_api_key", "test-key")
    monkeypatch.setattr(settings, "arkesel_sender_id", "Portfolio")
    monkeypatch.setattr(
        arkesel_service.httpx,
        "post",
        lambda *a, **k: FakeResponse(
            200, {"status": "success", "data": [{"id": "provider-message-1"}]}
        ),
    )

    admin = make_admin(db_session)
    data = start_login(client, admin)

    assert data["status"] == "otp_required"
    assert data["dev_otp"] is None
    log = db_session.scalar(
        select(SmsLog).where(SmsLog.otp_id == uuid.UUID(data["challenge_id"]))
    )
    assert log is not None
    assert log.status == "SENT"
    assert log.provider == "arkesel"
    assert log.provider_message_id == "provider-message-1"


@pytest.mark.parametrize(
    ("status_code", "payload", "code"),
    [
        (401, {"message": "bad key"}, "authentication"),
        (402, {"message": "insufficient balance"}, "insufficient_balance"),
        (429, {"message": "slow down"}, "rate_limited"),
        (400, {"message": "invalid sender id"}, "invalid_sender"),
        (400, {"message": "invalid recipient number"}, "invalid_recipient"),
        (422, {"message": "You are not allowed to use this Sender ID."}, "invalid_sender"),
        (422, {"message": "The recipients must be valid phone numbers."}, "invalid_recipient"),
        (500, {"message": "boom"}, "unavailable"),
    ],
)
def test_arkesel_error_mapping(
    monkeypatch: pytest.MonkeyPatch, status_code: int, payload: object, code: str
) -> None:
    from app.services import arkesel_service
    from app.services.sms import SmsError

    monkeypatch.setattr(settings, "arkesel_api_key", "test-key")
    monkeypatch.setattr(settings, "arkesel_sender_id", "Phill")
    monkeypatch.setattr(
        arkesel_service.httpx, "post", lambda *a, **k: FakeResponse(status_code, payload)
    )

    with pytest.raises(SmsError) as caught:
        arkesel_service.send_sms(CANONICAL_PHONE, "Code 123456")
    assert caught.value.code == code


def test_arkesel_rejected_sender_reports_provider_reason(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A rejected sender ID keeps its reason for the operator, not the API caller."""

    from app.services import arkesel_service
    from app.services.sms import SmsError

    monkeypatch.setattr(settings, "arkesel_api_key", "test-key")
    monkeypatch.setattr(settings, "arkesel_sender_id", "Unapproved")
    monkeypatch.setattr(
        arkesel_service.httpx,
        "post",
        lambda *a, **k: FakeResponse(
            422, {"status": "error", "message": "You are not allowed to use this Sender ID."}
        ),
    )

    with pytest.raises(SmsError) as caught:
        arkesel_service.send_sms(CANONICAL_PHONE, "Code 123456")

    assert caught.value.code == "invalid_sender"
    assert caught.value.detail == "You are not allowed to use this Sender ID."
    assert caught.value.message == "The SMS sender ID was rejected."


def test_arkesel_status_lookup_reports_state_without_the_message(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The status lookup must expose approval state but never the OTP body."""

    from app.services import arkesel_service

    monkeypatch.setattr(settings, "arkesel_api_key", "test-key")
    monkeypatch.setattr(settings, "arkesel_sender_id", "Portfolio")
    monkeypatch.setattr(
        arkesel_service.httpx,
        "get",
        lambda *a, **k: FakeResponse(
            200,
            {
                "status": "success",
                "data": {
                    "ID": "abc",
                    "status": "PENDING APPROVAL",
                    "sender": "Portfolio",
                    "recipient": CANONICAL_PHONE,
                    "sent_at_time": "2026-11-18 12:24:21",
                    "message": "Your verification code is 123456",
                },
            },
        ),
    )

    record = arkesel_service.fetch_status("abc")

    assert record["status"] == "PENDING APPROVAL"
    assert record["sender"] == "Portfolio"
    assert "message" not in record


def test_arkesel_timeout_maps_to_safe_error(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.services import arkesel_service
    from app.services.sms import SmsError

    monkeypatch.setattr(settings, "arkesel_api_key", "test-key")
    monkeypatch.setattr(settings, "arkesel_sender_id", "Phill")

    def raise_timeout(*args, **kwargs):
        raise arkesel_service.httpx.TimeoutException("timed out")

    monkeypatch.setattr(arkesel_service.httpx, "post", raise_timeout)

    with pytest.raises(SmsError) as caught:
        arkesel_service.send_sms(CANONICAL_PHONE, "Code 123456")
    assert caught.value.code == "timeout"


# --- Media library -------------------------------------------------------


def _png_bytes(size: tuple[int, int] = (32, 24)) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", size, (20, 20, 24)).save(buffer, format="PNG")
    return buffer.getvalue()


def test_media_upload_list_update_delete(
    admin_client: TestClient, db_session: Session
) -> None:
    upload = admin_client.post(
        "/api/v1/admin/media",
        files={"file": ("cover.png", _png_bytes((120, 90)), "image/png")},
        data={"title": "Test cover", "alt_text": "A dark test cover image."},
    )
    assert upload.status_code == 201, upload.text
    asset = upload.json()
    assert asset["width"] == 120 and asset["height"] == 90
    assert asset["url"].startswith("/media/")
    assert asset["filename"].endswith(".png")

    listed = admin_client.get("/api/v1/admin/media", params={"search": "Test cover"})
    assert listed.status_code == 200
    assert listed.json()["total"] == 1

    updated = admin_client.patch(
        f"/api/v1/admin/media/{asset['id']}",
        json={"title": "Renamed cover", "attached_to_type": "project"},
    )
    assert updated.status_code == 200
    assert updated.json()["title"] == "Renamed cover"
    assert updated.json()["attached_to_type"] == "project"

    deleted = admin_client.delete(f"/api/v1/admin/media/{asset['id']}")
    assert deleted.status_code == 200
    assert db_session.scalar(select(MediaAsset)) is None


def test_media_rejects_non_image_and_mismatched_extension(admin_client: TestClient) -> None:
    html = admin_client.post(
        "/api/v1/admin/media",
        files={"file": ("payload.png", b"<html><script>alert(1)</script></html>", "image/png")},
    )
    assert html.status_code == 400

    mismatched = admin_client.post(
        "/api/v1/admin/media",
        files={"file": ("photo.jpg", _png_bytes(), "image/jpeg")},
    )
    assert mismatched.status_code == 400

    wrong_type = admin_client.post(
        "/api/v1/admin/media",
        files={"file": ("page.html", b"<html></html>", "text/html")},
    )
    assert wrong_type.status_code == 400


def test_media_requires_authentication(client: TestClient) -> None:
    assert client.get("/api/v1/admin/media").status_code == 401


# --- SMS delivery log ----------------------------------------------------


def test_login_records_sms_metadata_without_message_body(
    client: TestClient, db_session: Session
) -> None:
    admin = make_admin(db_session)
    challenge = start_login(client, admin)

    log = db_session.scalar(select(SmsLog).where(SmsLog.user_id == admin.id))
    assert log is not None
    assert log.purpose == "LOGIN_OTP"
    assert log.recipient_phone == CANONICAL_PHONE
    assert log.status == "SENT"
    assert log.provider == "development"
    assert log.provider_message_id
    assert log.sent_at is not None
    assert challenge["dev_otp"] not in (log.failure_reason or "")
    assert challenge["dev_otp"] not in (log.provider_message_id or "")

    # No column in the record may contain the code or the full message.
    for value in vars(log).values():
        if isinstance(value, str):
            assert challenge["dev_otp"] not in value
            assert "verification code is" not in value.lower()


def test_resend_adds_a_second_sms_record(
    client: TestClient, db_session: Session
) -> None:
    admin = make_admin(db_session)
    challenge = start_login(client, admin)

    row = db_session.get(OtpVerification, uuid.UUID(challenge["challenge_id"]))
    assert row is not None
    row.last_sent_at = now_utc() - timedelta(seconds=settings.otp_resend_cooldown_seconds + 5)
    db_session.commit()

    resent = client.post(
        "/api/v1/auth/resend-otp",
        json={"challenge_id": challenge["challenge_id"]},
    )
    assert resent.status_code == 200, resent.text
    assert resent.json()["dev_otp"] != challenge["dev_otp"]

    logs = db_session.scalars(
        select(SmsLog).where(SmsLog.user_id == admin.id).order_by(SmsLog.created_at.asc())
    ).all()
    assert len(logs) == 2
    assert all(log.status == "SENT" for log in logs)


def test_sms_provider_failure_is_logged_and_not_reported_as_sent(
    client: TestClient, db_session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.services import arkesel_service

    monkeypatch.setattr(settings, "arkesel_api_key", "test-key")
    monkeypatch.setattr(settings, "arkesel_sender_id", "Phill")

    def raise_timeout(*args, **kwargs):
        raise arkesel_service.httpx.TimeoutException("timed out")

    monkeypatch.setattr(arkesel_service.httpx, "post", raise_timeout)

    admin = make_admin(db_session)
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": admin.email, "password": PASSWORD},
    )
    assert response.status_code == 503
    assert "couldn't send" in response.json()["detail"].lower()

    log = db_session.scalar(select(SmsLog).where(SmsLog.user_id == admin.id))
    assert log is not None
    assert log.status == "FAILED"
    assert log.failure_reason == "timeout"

    otp = db_session.scalar(
        select(OtpVerification).where(OtpVerification.user_id == admin.id)
    )
    assert otp is not None and otp.delivery_status == "failed:timeout"


def test_webhook_updates_sms_status_and_does_not_downgrade(
    client: TestClient, db_session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    secret = "sms-status-secret"
    monkeypatch.setattr(settings, "arkesel_webhook_secret", secret)

    admin = make_admin(db_session)
    start_login(client, admin)
    log = db_session.scalar(select(SmsLog).where(SmsLog.user_id == admin.id))
    assert log is not None and log.provider_message_id

    delivered_body = (
        '{"status":"delivered","message_id":"'
        + log.provider_message_id
        + '"}'
    ).encode()
    timestamp = str(int(now_utc().timestamp()))
    response = client.post(
        "/api/v1/webhooks/arkesel",
        content=delivered_body,
        headers=_webhook_headers(timestamp, delivered_body, secret, "sms-evt-1"),
    )
    assert response.status_code == 200, response.text

    db_session.expire_all()
    delivered = db_session.scalar(select(SmsLog).where(SmsLog.id == log.id))
    assert delivered is not None
    assert delivered.status == "DELIVERED"
    assert delivered.delivered_at is not None

    # A later "sent" callback must not erase the delivery confirmation.
    sent_body = (
        '{"status":"sent","message_id":"' + log.provider_message_id + '"}'
    ).encode()
    second = client.post(
        "/api/v1/webhooks/arkesel",
        content=sent_body,
        headers=_webhook_headers(timestamp, sent_body, secret, "sms-evt-2"),
    )
    assert second.status_code == 200

    db_session.expire_all()
    unchanged = db_session.scalar(select(SmsLog).where(SmsLog.id == log.id))
    assert unchanged is not None and unchanged.status == "DELIVERED"

    replay = client.post(
        "/api/v1/webhooks/arkesel",
        content=delivered_body,
        headers=_webhook_headers(timestamp, delivered_body, secret, "sms-evt-1"),
    )
    assert replay.status_code == 200
    assert replay.json()["status"] == "duplicate"


def test_admin_sms_list_masks_recipient(admin_client: TestClient, db_session: Session) -> None:
    admin = db_session.scalar(select(AdminUser).where(AdminUser.email == "admin@test.dev"))
    assert admin is not None
    db_session.add(
        SmsLog(
            user_id=admin.id,
            purpose="LOGIN_OTP",
            recipient_phone=CANONICAL_PHONE,
            provider="arkesel",
            provider_message_id="provider-ref-1",
            status="DELIVERED",
        )
    )
    db_session.commit()

    response = admin_client.get("/api/v1/admin/sms", params={"status": "DELIVERED"})
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["total"] == 1
    item = payload["items"][0]
    assert item["recipient_phone"] == "233******870"
    assert CANONICAL_PHONE not in response.text
    assert item["provider_message_id"] == "provider-ref-1"

    detail = admin_client.get(f"/api/v1/admin/sms/{item['id']}")
    assert detail.status_code == 200
    assert detail.json()["status"] == "DELIVERED"


# --- Admin security APIs -------------------------------------------------


def test_security_activity_filters_and_pagination(admin_client: TestClient) -> None:
    listed = admin_client.get("/api/v1/admin/security/activity", params={"limit": 1})
    assert listed.status_code == 200
    body = listed.json()
    assert body["limit"] == 1
    assert body["total"] >= 1
    assert len(body["items"]) == 1
    assert body["items"][0]["event"] == "login"

    filtered = admin_client.get(
        "/api/v1/admin/security/activity",
        params={"event": "login", "status": "success", "search": "admin@test.dev"},
    )
    assert filtered.status_code == 200
    assert filtered.json()["total"] >= 1

    empty = admin_client.get(
        "/api/v1/admin/security/activity", params={"event": "does_not_exist"}
    )
    assert empty.status_code == 200
    assert empty.json()["total"] == 0
    assert empty.json()["items"] == []

    ascending = admin_client.get(
        "/api/v1/admin/security/activity",
        params={"sort": "created_at", "order": "asc"},
    )
    assert ascending.status_code == 200


def test_admin_sessions_can_be_revoked_and_other_sessions_cleared(
    admin_client: TestClient, db_session: Session
) -> None:
    from app.services import auth as auth_service

    admin = db_session.scalar(select(AdminUser).where(AdminUser.email == "admin@test.dev"))
    assert admin is not None
    extra_token, extra = auth_service.create_session(db_session, admin)

    listed = admin_client.get("/api/v1/admin/security/sessions")
    assert listed.status_code == 200
    sessions = listed.json()
    current = next(item for item in sessions if item["is_current"])
    assert current["status"] == "active"
    assert any(item["id"] == str(extra.id) for item in sessions)

    refused = admin_client.post(
        "/api/v1/admin/security/sessions/revoke",
        json={"session_id": current["id"]},
    )
    assert refused.status_code == 409

    revoked = admin_client.post(
        "/api/v1/admin/security/sessions/revoke",
        json={"session_id": str(extra.id)},
    )
    assert revoked.status_code == 200
    assert auth_service.resolve_session(db_session, extra_token) is None

    cleared = admin_client.post(
        "/api/v1/admin/security/sessions/revoke-all",
        json={"keep_current": True},
    )
    assert cleared.status_code == 200
    remaining = admin_client.get("/api/v1/admin/security/sessions").json()
    assert sum(1 for item in remaining if item["is_current"]) == 1


def test_session_list_is_scoped_to_the_calling_administrator(
    admin_client: TestClient, db_session: Session
) -> None:
    from app.services import auth as auth_service

    other = AdminUser(
        email="other-admin@test.dev",
        password_hash=hash_password(PASSWORD),
        is_active=True,
    )
    db_session.add(other)
    db_session.commit()
    _, other_session = auth_service.create_session(db_session, other)

    listed = admin_client.get("/api/v1/admin/security/sessions")
    assert listed.status_code == 200
    assert all(item["id"] != str(other_session.id) for item in listed.json())

    # The revoke endpoint is also scoped to the caller, so the two views agree.
    refused = admin_client.post(
        "/api/v1/admin/security/sessions/revoke",
        json={"session_id": str(other_session.id)},
    )
    assert refused.status_code == 404


def test_security_and_sms_endpoints_require_authentication(client: TestClient) -> None:
    assert client.get("/api/v1/admin/security/activity").status_code == 401
    assert client.get("/api/v1/admin/security/sessions").status_code == 401
    assert client.get("/api/v1/admin/sms").status_code == 401
    assert (
        client.post(
            "/api/v1/admin/security/sessions/revoke-all", json={"keep_current": True}
        ).status_code
        == 401
    )
