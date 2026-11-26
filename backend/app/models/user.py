import uuid
from datetime import UTC, datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin

ROLES = ("SUPER_ADMIN", "EDITOR", "ANALYST", "VIEWER")


def utcnow() -> datetime:
    return datetime.now(UTC)


class AdminUser(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "admin_users"
    __table_args__ = (
        CheckConstraint(
            "role IN ('SUPER_ADMIN', 'EDITOR', 'ANALYST', 'VIEWER')",
            name="admin_role_valid",
        ),
    )

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(
        String(20), unique=True, index=True, nullable=True
    )
    full_name: Mapped[str | None] = mapped_column(String(160), nullable=True)
    role: Mapped[str] = mapped_column(
        String(20), default="SUPER_ADMIN", server_default="SUPER_ADMIN", nullable=False
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true", nullable=False
    )
    must_change_password: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false", nullable=False
    )
    failed_login_attempts: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )
    locked_until: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    password_changed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    sessions: Mapped[list["AuthSession"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    otp_verifications: Mapped[list["OtpVerification"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

    @property
    def display_name(self) -> str:
        return self.full_name or self.email.split("@")[0]


class AuthSession(UUIDPrimaryKeyMixin, Base):
    """Opaque server-side session.

    Only a SHA-256 digest of the browser token is stored, so a database leak
    does not expose live sessions.
    """

    __tablename__ = "auth_sessions"
    __table_args__ = (
        Index("ix_auth_sessions_token_hash", "token_hash", unique=True),
        Index("ix_auth_sessions_expires_at", "expires_at"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("admin_users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(400), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    last_used_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped[AdminUser] = relationship(back_populates="sessions")


class OtpVerification(UUIDPrimaryKeyMixin, Base):
    """A hashed, single-use one-time code.

    The plaintext code is never stored. The hash is an HMAC over the code using
    the backend secret, so a database dump alone is not enough to recover it.
    """

    __tablename__ = "otp_verifications"
    __table_args__ = (
        CheckConstraint(
            "purpose IN ('login', 'password_reset')",
            name="otp_purpose_valid",
        ),
        Index("ix_otp_verifications_user_purpose", "user_id", "purpose"),
        Index("ix_otp_verifications_expires_at", "expires_at"),
        Index("ix_otp_verifications_phone", "phone_number"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("admin_users.id", ondelete="CASCADE"),
        nullable=False,
    )
    purpose: Mapped[str] = mapped_column(String(20), nullable=False)
    phone_number: Mapped[str] = mapped_column(String(20), nullable=False)
    code_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    invalidated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    attempts: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )
    max_attempts: Mapped[int] = mapped_column(
        Integer, default=5, server_default="5", nullable=False
    )
    resend_count: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )
    last_sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    provider_message_id: Mapped[str | None] = mapped_column(String(160), nullable=True)
    delivery_status: Mapped[str | None] = mapped_column(String(40), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped[AdminUser] = relationship(back_populates="otp_verifications")


SMS_STATUSES = ("QUEUED", "SENT", "DELIVERED", "FAILED", "EXPIRED", "CANCELLED")


class SmsLog(UUIDPrimaryKeyMixin, Base):
    """Delivery record for one transactional SMS.

    The message body is never stored: an OTP message would otherwise leak the
    code. Only non-secret routing metadata and provider status are kept.
    """

    __tablename__ = "sms_logs"
    __table_args__ = (
        CheckConstraint(
            "status IN ('QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'EXPIRED', 'CANCELLED')",
            name="sms_status_valid",
        ),
        Index("ix_sms_logs_user_id", "user_id"),
        Index("ix_sms_logs_status", "status"),
        Index("ix_sms_logs_purpose", "purpose"),
        Index("ix_sms_logs_created_at", "created_at"),
        Index("ix_sms_logs_provider_message_id", "provider_message_id"),
    )

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("admin_users.id", ondelete="SET NULL"),
        nullable=True,
    )
    otp_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("otp_verifications.id", ondelete="SET NULL"),
        nullable=True,
    )
    purpose: Mapped[str] = mapped_column(String(40), nullable=False)
    recipient_phone: Mapped[str] = mapped_column(String(20), nullable=False)
    sender_id: Mapped[str | None] = mapped_column(String(40), nullable=True)
    message_type: Mapped[str] = mapped_column(
        String(30), default="otp", server_default="otp", nullable=False
    )
    provider: Mapped[str] = mapped_column(
        String(30), default="arkesel", server_default="arkesel", nullable=False
    )
    provider_message_id: Mapped[str | None] = mapped_column(String(160), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), default="QUEUED", server_default="QUEUED", nullable=False
    )
    failure_reason: Mapped[str | None] = mapped_column(String(200), nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    delivered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class ActivityLog(UUIDPrimaryKeyMixin, Base):
    """Security-relevant events. Never stores passwords, codes or tokens."""

    __tablename__ = "activity_logs"
    __table_args__ = (
        Index("ix_activity_logs_event", "event"),
        Index("ix_activity_logs_created_at", "created_at"),
        Index("ix_activity_logs_user_id", "user_id"),
    )

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("admin_users.id", ondelete="SET NULL"),
        nullable=True,
    )
    event: Mapped[str] = mapped_column(String(60), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20),
        default="success",
        server_default="success",
        nullable=False,
        index=True,
    )
    identifier: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(400), nullable=True)
    detail: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
