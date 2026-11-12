"""Contact submission handling: validate, rate-limit, persist."""

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.rate_limit import SlidingWindowLimiter
from app.models import ContactMessage
from app.schemas.contact import ContactCreate

contact_limiter = SlidingWindowLimiter(
    limit=settings.contact_rate_limit_per_hour, window_seconds=3600
)


class ContactRateLimited(Exception):
    def __init__(self, retry_after: int) -> None:
        self.retry_after = retry_after
        super().__init__("Too many contact submissions")


def submit_message(db: Session, payload: ContactCreate, client_key: str) -> ContactMessage:
    allowed, retry_after = contact_limiter.hit(client_key)
    if not allowed:
        raise ContactRateLimited(retry_after)

    message = ContactMessage(
        name=payload.name,
        email=payload.email.lower(),
        subject=payload.subject,
        message=payload.message,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message
