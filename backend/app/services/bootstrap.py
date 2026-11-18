"""First-run administrator provisioning.

The account is created only when absent. Credentials come from environment
configuration and are never logged. A forced password change follows the first
successful login.
"""

from __future__ import annotations

import logging

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.phone import PhoneNumberError, normalize_ghana_phone
from app.core.security import hash_password, password_problem
from app.models import AdminUser
from app.services import activity

logger = logging.getLogger("portfolio.bootstrap")


def ensure_initial_admin(db: Session) -> AdminUser | None:
    if not settings.initial_admin_configured:
        return None

    email = (settings.initial_admin_email or "").strip().lower()
    password = settings.initial_admin_password or ""
    try:
        phone = normalize_ghana_phone(settings.initial_admin_phone)
    except PhoneNumberError:
        logger.error("Initial admin phone is not a valid Ghana number; provisioning skipped.")
        return None

    problem = password_problem(password)
    if problem:
        logger.error("Initial admin password does not meet policy; provisioning skipped.")
        return None

    existing = db.scalar(
        select(AdminUser).where(or_(AdminUser.email == email, AdminUser.phone == phone))
    )
    if existing is not None:
        if not existing.phone:
            existing.phone = phone
            db.commit()
        return existing

    user = AdminUser(
        email=email,
        phone=phone,
        full_name=settings.initial_admin_full_name or None,
        role="SUPER_ADMIN",
        password_hash=hash_password(password),
        is_active=True,
        must_change_password=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    activity.record(
        db,
        activity.USER_CREATED,
        user_id=user.id,
        identifier=user.email,
        detail="Initial administrator provisioned from environment",
        commit=True,
    )
    logger.info("Initial administrator provisioned (password change required)")
    return user
