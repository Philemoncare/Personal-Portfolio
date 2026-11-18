"""SMS delivery abstraction.

Authentication depends on this module, not on Arkesel directly. Swapping the
provider means adding another implementation here; routes and OTP logic remain
unchanged.

Status vocabulary is canonical across the application so the admin interface
can distinguish "the provider accepted the request" (``SENT``) from a delivery
confirmation received by webhook (``DELIVERED``).
"""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass

from app.core.config import settings

logger = logging.getLogger("portfolio.sms")

QUEUED = "QUEUED"
SENT = "SENT"
DELIVERED = "DELIVERED"
FAILED = "FAILED"
EXPIRED = "EXPIRED"
CANCELLED = "CANCELLED"

STATUSES = (QUEUED, SENT, DELIVERED, FAILED, EXPIRED, CANCELLED)


class SmsError(Exception):
    """Provider failure with a safe, non-secret application code.

    ``message`` is safe to return to an API caller. ``detail`` carries the
    provider's own short explanation (for example a rejected sender ID) and is
    only meant for server logs and the operator CLI.
    """

    def __init__(self, code: str, message: str, detail: str | None = None) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.detail = detail


@dataclass(slots=True)
class SmsResult:
    status: str
    provider: str
    provider_message_id: str | None = None


def provider_name() -> str:
    """The transport that will be used for the next message."""

    return "arkesel" if settings.arkesel_configured else "development"


def sender_name() -> str | None:
    return settings.arkesel_sender_id if settings.arkesel_configured else None


def send_sms(phone: str, message: str) -> SmsResult:
    """Send one transactional SMS through the configured provider."""

    if settings.arkesel_configured:
        from app.services import arkesel_service

        return arkesel_service.send_sms(phone, message)

    if settings.environment == "production":
        logger.error("SMS delivery attempted without a configured provider")
        raise SmsError(
            "not_configured",
            "SMS delivery is not configured.",
        )

    # Local development transport. The OTP is returned by the development-only
    # API affordance; nothing secret is written to the log.
    logger.warning(
        "Development SMS transport accepted a message for %s",
        phone[:3] + "******" + phone[-3:],
    )
    return SmsResult(
        status=SENT,
        provider="development",
        provider_message_id=f"dev-{uuid.uuid4()}",
    )
