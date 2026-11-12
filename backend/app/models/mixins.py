"""Reusable ORM mixins."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column


class UUIDPrimaryKeyMixin:
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class PublishableMixin:
    status: Mapped[str] = mapped_column(
        String(20), default="draft", server_default="draft", nullable=False, index=True
    )
    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    is_placeholder: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false", nullable=False
    )


def status_check() -> CheckConstraint:
    return CheckConstraint(
        "status IN ('draft', 'published', 'archived')",
        name="status_valid",
    )
