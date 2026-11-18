"""Send one real test SMS through the configured transport.

Usage (from ``backend/``)::

    .venv\\Scripts\\python.exe -m app.scripts.sms_check 0599811870

This spends one SMS. It prints the provider acceptance result, never the API
key, and does not create an OTP challenge. Delivery still depends on the
carrier; only a signed delivery webhook confirms ``DELIVERED``.
"""

from __future__ import annotations

import sys

from app.core.config import settings
from app.core.phone import PhoneNumberError, mask_phone, normalize_ghana_phone
from app.services import sms
from app.services.sms import SmsError

TEST_MESSAGE = (
    "Portfolio SMS check. If you received this, Arkesel delivery is working."
)


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("Usage: python -m app.scripts.sms_check <ghana-phone>")
        return 2

    try:
        phone = normalize_ghana_phone(argv[1])
    except PhoneNumberError as exc:
        print(f"Invalid phone number: {exc}")
        return 2

    if not settings.arkesel_configured:
        print(
            "Arkesel is not configured. Set ARKESEL_API_KEY and "
            "ARKESEL_SENDER_ID in backend/.env, then restart the API."
        )
        print(f"Current transport: {sms.provider_name()}")
        return 3

    print(
        f"Sending one test SMS via {sms.provider_name()} to {mask_phone(phone)} ..."
    )
    try:
        result = sms.send_sms(phone, TEST_MESSAGE)
    except SmsError as exc:
        print(f"FAILED [{exc.code}]: {exc.message}")
        if exc.detail:
            print(f"Provider said: {exc.detail}")
        if exc.code == "invalid_sender":
            print(
                "Fix: ARKESEL_SENDER_ID must be a Sender ID approved for this "
                "Arkesel account. Check the Arkesel dashboard or ask their "
                "support to approve one."
            )
        elif exc.code == "authentication":
            print("Fix: ARKESEL_API_KEY is invalid or revoked. Create a new key.")
        elif exc.code == "insufficient_balance":
            print("Fix: top up the Arkesel SMS credits.")
        return 1

    print(
        f"ACCEPTED status={result.status} provider={result.provider} "
        f"id={result.provider_message_id or 'none'}"
    )
    print(
        "Acceptance is not delivery. Confirm the handset and check the signed "
        "webhook or the SMS log in /admin/security."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
