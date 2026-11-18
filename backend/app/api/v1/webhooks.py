"""Provider callbacks.

Callbacks are verified before any side effect. Webhook IDs are stored so a
replayed request is accepted without being processed twice.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.time import now_utc
from app.db.session import get_db
from app.models import ArkeselWebhookEvent, OtpVerification
from app.services import arkesel_service, sms_logs
from app.services.sms import SmsError

logger = logging.getLogger("portfolio.webhooks")

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

MAX_BODY = 64 * 1024


@router.post("/arkesel")
async def arkesel_webhook(request: Request, db: Session = Depends(get_db)):
    raw = await request.body()
    if len(raw) > MAX_BODY:
        return JSONResponse(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            content={"detail": "Payload too large."},
        )

    headers = {key.lower(): value for key, value in request.headers.items()}
    try:
        payload = arkesel_service.verify_callback(headers, raw)
    except SmsError as exc:
        logger.warning("Rejected Arkesel webhook: %s", exc.code)
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED
            if exc.code in {"invalid_signature", "stale_timestamp"}
            else status.HTTP_400_BAD_REQUEST,
            content={"detail": "Webhook rejected."},
        )

    webhook_id = headers.get("x-arkesel-webhook-id", "")[:160]
    existing = db.scalar(
        select(ArkeselWebhookEvent).where(ArkeselWebhookEvent.webhook_id == webhook_id)
    )
    if existing is not None:
        return JSONResponse(status_code=status.HTTP_200_OK, content={"status": "duplicate"})

    event = ArkeselWebhookEvent(
        webhook_id=webhook_id,
        event_type=str(payload.get("event") or payload.get("type") or "")[:80] or None,
        payload_hash=arkesel_service.payload_hash(raw),
        processed_at=now_utc(),
    )
    db.add(event)

    data = payload.get("data")
    message_id = payload.get("message_id") or payload.get("id")
    if not message_id and isinstance(data, dict):
        message_id = data.get("id")
    if not message_id and isinstance(data, list) and data and isinstance(data[0], dict):
        message_id = data[0].get("id")
    delivery_status = payload.get("status") or payload.get("delivery_status")
    if message_id and delivery_status:
        otp = db.scalar(
            select(OtpVerification).where(
                OtpVerification.provider_message_id == str(message_id)
            )
        )
        if otp is not None:
            otp.delivery_status = str(delivery_status)[:40]

    if message_id:
        reason = payload.get("reason") or payload.get("failure_reason")
        sms_logs.apply_delivery(
            db,
            str(message_id),
            delivery_status,
            failure_reason=reason if isinstance(reason, str) else None,
        )

    try:
        db.commit()
    except Exception:
        db.rollback()
        # A concurrent delivery may have inserted the same ID.
        duplicate = db.scalar(
            select(ArkeselWebhookEvent).where(
                ArkeselWebhookEvent.webhook_id == webhook_id
            )
        )
        if duplicate is not None:
            return JSONResponse(status_code=status.HTTP_200_OK, content={"status": "duplicate"})
        logger.exception("Failed to store Arkesel webhook")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Webhook could not be stored."},
        )

    return JSONResponse(status_code=status.HTTP_200_OK, content={"status": "accepted"})
