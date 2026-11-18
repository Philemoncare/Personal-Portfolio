"""Optional email notifications for contact messages.

Contact messages are always stored first. Email is attempted only when the
environment is fully configured, and the recorded status is honest about what
actually happened.
"""

from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings
from app.models import ContactMessage

logger = logging.getLogger("portfolio.notifications")


def send_contact_notification(message: ContactMessage) -> str:
    """Return ``sent``, ``failed``, or ``not_configured``."""

    if not settings.email_delivery_configured:
        return "not_configured"

    recipient = settings.contact_notification_email
    sender = settings.smtp_from_email or settings.smtp_username
    if not recipient or not sender:
        return "not_configured"

    email = EmailMessage()
    email["Subject"] = f"Portfolio contact: {message.subject}"
    email["From"] = sender
    email["To"] = recipient
    email["Reply-To"] = message.email
    email.set_content(
        "\n".join(
            [
                f"Name: {message.name}",
                f"Email: {message.email}",
                f"Inquiry: {message.inquiry_type or 'not specified'}",
                "",
                message.message,
            ]
        )
    )

    try:
        with smtplib.SMTP(settings.smtp_host or "", settings.smtp_port, timeout=12) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            if settings.smtp_username and settings.smtp_password:
                smtp.login(settings.smtp_username, settings.smtp_password)
            smtp.send_message(email)
    except Exception:  # pragma: no cover - depends on external SMTP
        logger.exception("Contact notification email failed")
        return "failed"
    return "sent"
