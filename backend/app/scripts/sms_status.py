"""Show the Arkesel-side status of recent messages.

Usage (from ``backend/``)::

    .venv\\Scripts\\python.exe -m app.scripts.sms_status [count]

Acceptance is not delivery. A message can sit at ``PENDING APPROVAL`` when the
sender ID is not approved on the Arkesel account; this command shows that.
"""

from __future__ import annotations

import sys

from sqlalchemy import select

from app.core.config import settings
from app.db.session import SessionLocal
from app.models import SmsLog
from app.services import arkesel_service


def main(argv: list[str]) -> int:
    limit = 5
    if len(argv) > 1:
        try:
            limit = max(1, int(argv[1]))
        except ValueError:
            print("Usage: python -m app.scripts.sms_status [count]")
            return 2

    if not settings.arkesel_configured:
        print("Arkesel is not configured; there is nothing to check.")
        return 3

    with SessionLocal() as db:
        rows = db.scalars(
            select(SmsLog).order_by(SmsLog.created_at.desc()).limit(limit)
        ).all()
        if not rows:
            print("No SMS records yet.")
            return 0

        blocked = 0
        print(f"{'created':<20} {'database':<8} {'provider':<20} message id")
        for row in rows:
            provider_status = "n/a"
            if row.provider == "arkesel" and row.provider_message_id:
                record = arkesel_service.fetch_status(row.provider_message_id)
                provider_status = str(record.get("status") or "unknown")
                if "APPROVAL" in provider_status.upper():
                    blocked += 1
            created = row.created_at.strftime("%Y-%m-%d %H:%M:%S")
            print(
                f"{created:<20} {row.status:<8} {provider_status:<20} "
                f"{row.provider_message_id or '-'}"
            )

    if blocked:
        print()
        print(f"{blocked} message(s) are waiting for Arkesel approval.")
        print("Arkesel has accepted the request but will not deliver it until the")
        print(f"sender ID '{settings.arkesel_sender_id}' is approved on the account.")
        print("Check the Sender ID status in the Arkesel dashboard, or ask their")
        print("support to approve it for transactional SMS.")
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
