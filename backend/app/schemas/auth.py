import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.phone import PhoneNumberError, mask_phone, normalize_ghana_phone


class LoginRequest(BaseModel):
    identifier: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1, max_length=200)

    @field_validator("identifier")
    @classmethod
    def clean_identifier(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Enter your email or phone number.")
        return value


class AdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    # Output only: the stored value is already validated at write time, and a
    # restrictive output type would turn a legacy address into a 500 at login.
    email: str
    phone: str | None = None
    full_name: str | None = None
    role: str
    is_active: bool
    must_change_password: bool
    last_login_at: datetime | None
    password_changed_at: datetime | None
    created_at: datetime


class SessionOut(BaseModel):
    id: uuid.UUID
    created_at: datetime
    last_used_at: datetime
    expires_at: datetime
    ip_address: str | None
    user_agent: str | None
    is_current: bool = False


class LoginResponse(BaseModel):
    status: str
    admin: AdminOut | None = None
    challenge_id: uuid.UUID | None = None
    phone_masked: str | None = None
    expires_in: int | None = None
    dev_otp: str | None = None
    message: str | None = None


class VerifyOtpRequest(BaseModel):
    challenge_id: uuid.UUID
    code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")


class ResendOtpRequest(BaseModel):
    challenge_id: uuid.UUID


class ForgotPasswordRequest(BaseModel):
    identifier: str = Field(min_length=3, max_length=255)


class ForgotPasswordResponse(BaseModel):
    message: str
    challenge_id: uuid.UUID | None = None
    phone_masked: str | None = None
    expires_in: int | None = None
    dev_otp: str | None = None


class ResetPasswordRequest(BaseModel):
    challenge_id: uuid.UUID
    code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")
    new_password: str = Field(min_length=12, max_length=200)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=200)
    new_password: str = Field(min_length=12, max_length=200)


class PhoneUpdateRequest(BaseModel):
    phone: str

    @field_validator("phone")
    @classmethod
    def normalize(cls, value: str) -> str:
        try:
            return normalize_ghana_phone(value)
        except PhoneNumberError as exc:
            raise ValueError(str(exc)) from exc


class ActivityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    event: str
    status: str
    identifier: str | None
    ip_address: str | None
    detail: str | None
    created_at: datetime


class ActivityListOut(BaseModel):
    items: list[ActivityOut]
    total: int
    limit: int
    offset: int


class AdminSessionOut(SessionOut):
    """Session row with an explicit lifecycle status and revocation time."""

    revoked_at: datetime | None = None
    status: str = "active"


class SessionRevokeRequest(BaseModel):
    session_id: uuid.UUID


class SessionRevokeAllRequest(BaseModel):
    keep_current: bool = True


class SmsLogOut(BaseModel):
    """SMS metadata. The recipient is masked and no message body is stored."""

    id: uuid.UUID
    user_id: uuid.UUID | None
    purpose: str
    recipient_phone: str
    sender_id: str | None
    message_type: str
    provider: str
    provider_message_id: str | None
    status: str
    failure_reason: str | None
    sent_at: datetime | None
    delivered_at: datetime | None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_model(cls, row) -> "SmsLogOut":
        return cls(
            id=row.id,
            user_id=row.user_id,
            purpose=row.purpose,
            recipient_phone=mask_phone(row.recipient_phone),
            sender_id=row.sender_id,
            message_type=row.message_type,
            provider=row.provider,
            provider_message_id=row.provider_message_id,
            status=row.status,
            failure_reason=row.failure_reason,
            sent_at=row.sent_at,
            delivered_at=row.delivered_at,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )


class SmsLogListOut(BaseModel):
    items: list[SmsLogOut]
    total: int
    limit: int
    offset: int


class SecurityOverview(BaseModel):
    admin: AdminOut
    sessions: list[SessionOut]
    recent_events: list[ActivityOut]
    failed_logins_24h: int
    active_sessions: int
    password_age_days: int | None
    successful_logins_24h: int = 0
    otp_sent_24h: int = 0
    otp_failures_24h: int = 0
    otp_success_rate: float | None = None
    sms_delivery_24h: dict[str, int] = Field(default_factory=dict)
    sms_success_rate: float | None = None
    sms_provider: str = "development"
    revoked_sessions: int = 0
    password_changes_24h: int = 0
