"""Arkesel SMS provider.

The API key is read from backend configuration only. It is never returned in a
response, written to a log, or exposed to the Vite frontend.
"""

from __future__ import annotations

import hashlib
import json
import logging
import time
from typing import Any

import httpx

from app.core.config import settings
from app.core.security import verify_webhook_signature
from app.services.sms import SmsError, SmsResult

logger = logging.getLogger("portfolio.arkesel")

SEND_PATH = "/api/v2/sms/send"


def _safe_reason(payload: Any) -> str:
    """Extract a short provider reason without echoing the whole body."""

    if not isinstance(payload, dict):
        return ""
    for key in ("message", "error", "status", "detail"):
        value = payload.get(key)
        if isinstance(value, str):
            return value.strip()[:160]
    return ""


def send_sms(phone: str, message: str) -> SmsResult:
    if not settings.arkesel_configured:
        raise SmsError("not_configured", "SMS delivery is not configured.")

    base = settings.arkesel_api_base_url.rstrip("/")
    url = f"{base}{SEND_PATH}"
    body = {
        "sender": settings.arkesel_sender_id,
        "message": message,
        "recipients": [phone],
    }
    headers = {
        "api-key": settings.arkesel_api_key or "",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    try:
        response = httpx.post(
            url,
            json=body,
            headers=headers,
            timeout=settings.arkesel_timeout_seconds,
        )
    except httpx.TimeoutException as exc:
        logger.warning("Arkesel request timed out for %s", _masked(phone))
        raise SmsError("timeout", "The SMS provider timed out.") from exc
    except httpx.HTTPError as exc:
        logger.warning("Arkesel request failed for %s: %s", _masked(phone), type(exc).__name__)
        raise SmsError("unavailable", "The SMS provider is unavailable.") from exc

    payload: Any = None
    try:
        payload = response.json()
    except (ValueError, json.JSONDecodeError):
        payload = None

    if response.status_code in (401, 403):
        logger.error("Arkesel rejected the API credential (status=%s)", response.status_code)
        raise SmsError("authentication", "The SMS provider rejected the request.")
    if response.status_code == 402:
        logger.error("Arkesel reported insufficient balance")
        raise SmsError("insufficient_balance", "The SMS account has insufficient balance.")
    if response.status_code == 429:
        logger.warning("Arkesel rate limited the request")
        raise SmsError("rate_limited", "The SMS provider is rate limiting requests.")
    if response.status_code in (400, 422):
        reason = _safe_reason(payload)
        logger.warning("Arkesel rejected the request: %s", reason or "bad request")
        lowered = reason.lower()
        if "sender" in lowered:
            raise SmsError(
                "invalid_sender",
                "The SMS sender ID was rejected.",
                detail=reason or None,
            )
        if "recipient" in lowered or "phone" in lowered or "number" in lowered:
            raise SmsError(
                "invalid_recipient",
                "The phone number was rejected.",
                detail=reason or None,
            )
        raise SmsError(
            "bad_request",
            "The SMS provider rejected the request.",
            detail=reason or None,
        )
    if response.status_code >= 500:
        logger.warning("Arkesel unavailable (status=%s)", response.status_code)
        raise SmsError("unavailable", "The SMS provider is unavailable.")

    if not isinstance(payload, dict):
        logger.warning("Arkesel returned a malformed response (status=%s)", response.status_code)
        raise SmsError("malformed", "The SMS provider returned an unexpected response.")

    status = str(payload.get("status", "")).lower()
    if status not in {"success", "ok", "accepted"} and response.status_code >= 300:
        reason = _safe_reason(payload)
        logger.warning("Arkesel rejected the message: %s", reason or "unknown")
        raise SmsError(
            "provider_error",
            "The SMS provider rejected the message.",
            detail=reason or None,
        )

    message_id = None
    data = payload.get("data")
    if isinstance(data, list) and data and isinstance(data[0], dict):
        message_id = data[0].get("id") or data[0].get("message_id")
    if not message_id:
        message_id = payload.get("message_id") or payload.get("id")
    message_id = str(message_id) if message_id else None

    logger.info("Arkesel accepted an SMS for %s", _masked(phone))
    return SmsResult(status="SENT", provider="arkesel", provider_message_id=message_id)


def fetch_status(message_id: str) -> dict[str, Any]:
    """Provider-side record for one message.

    Acceptance (``SENT``) is not delivery. Arkesel can hold a message at
    ``PENDING APPROVAL`` when the sender ID has not been approved on the
    account; this lookup makes that state visible. The message body is
    deliberately not returned because it contains the OTP.
    """

    base = settings.arkesel_api_base_url.rstrip("/")
    headers = {
        "api-key": settings.arkesel_api_key or "",
        "Accept": "application/json",
    }
    try:
        response = httpx.get(
            f"{base}/api/v2/sms/{message_id}",
            headers=headers,
            timeout=settings.arkesel_timeout_seconds,
        )
    except httpx.HTTPError as exc:
        logger.warning("Arkesel status lookup failed: %s", type(exc).__name__)
        return {}
    if response.status_code != 200:
        return {}
    try:
        payload = response.json()
    except (ValueError, json.JSONDecodeError):
        return {}
    data = payload.get("data") if isinstance(payload, dict) else None
    if not isinstance(data, dict):
        return {}
    return {
        key: data.get(key)
        for key in ("ID", "status", "sender", "recipient", "sent_at_time")
    }


def _masked(phone: str) -> str:
    if len(phone) < 6:
        return "***"
    return f"{phone[:3]}*****{phone[-3:]}"


def verify_callback(headers: dict[str, str], raw_body: bytes) -> dict[str, Any]:
    """Validate a delivery callback before any side effect."""

    secret = settings.arkesel_webhook_secret
    if not secret:
        raise SmsError("not_configured", "Webhook verification is not configured.")

    timestamp = headers.get("x-arkesel-webhook-timestamp", "")
    signature = headers.get("x-arkesel-webhook-signature", "")
    webhook_id = headers.get("x-arkesel-webhook-id", "")

    if not timestamp or not signature or not webhook_id:
        raise SmsError("malformed", "Missing webhook headers.")

    try:
        sent_at = int(timestamp)
    except ValueError as exc:
        raise SmsError("malformed", "Invalid webhook timestamp.") from exc

    if abs(time.time() - sent_at) > settings.arkesel_webhook_max_skew_seconds:
        raise SmsError("stale_timestamp", "Stale webhook timestamp.")

    if not verify_webhook_signature(timestamp, raw_body, signature, secret):
        raise SmsError("invalid_signature", "Invalid webhook signature.")

    try:
        payload = json.loads(raw_body)
    except (ValueError, json.JSONDecodeError) as exc:
        raise SmsError("malformed", "Malformed webhook body.") from exc

    if not isinstance(payload, dict):
        raise SmsError("malformed", "Malformed webhook body.")

    return payload


def payload_hash(raw_body: bytes) -> str:
    return hashlib.sha256(raw_body).hexdigest()
