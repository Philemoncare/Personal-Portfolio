from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Runtime configuration. Values come from the environment or backend/.env."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "Phill Portfolio API"
    environment: Literal["development", "test", "production"] = "development"
    api_v1_prefix: str = "/api/v1"

    database_url: str = "sqlite:///./portfolio.db"
    frontend_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    public_site_url: str = "http://localhost:5173"

    session_cookie_name: str = "phill_session"
    session_ttl_hours: int = 72
    cookie_secure: bool = False
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"

    # Backend-only secret used to HMAC OTP codes and webhook signatures.
    secret_key: str = "development-only-secret-change-me"

    contact_rate_limit_per_hour: int = 5
    contact_max_request_bytes: int = 32 * 1024
    login_rate_limit_per_15_minutes: int = 10

    login_max_failures: int = 5
    login_lockout_minutes: int = 15
    otp_ttl_minutes: int = 5
    otp_max_attempts: int = 5
    otp_resend_cooldown_seconds: int = 60
    otp_requests_per_hour: int = 8

    arkesel_api_key: str | None = None
    arkesel_sender_id: str | None = None
    arkesel_webhook_secret: str | None = None
    arkesel_api_base_url: str = "https://sms.arkesel.com"
    arkesel_timeout_seconds: float = 10.0
    arkesel_webhook_max_skew_seconds: int = 300
    sms_brand_name: str = "Phill Portfolio"

    initial_admin_email: str | None = None
    initial_admin_phone: str | None = None
    initial_admin_password: str | None = None
    initial_admin_full_name: str = "Philemon Melabah"

    media_storage_dir: str = "storage/media"
    media_max_bytes: int = 8 * 1024 * 1024
    media_max_dimension: int = 8000

    resume_storage_dir: str = "storage/resumes"
    resume_max_bytes: int = 5 * 1024 * 1024

    # Optional email delivery. Contact messages are always persisted first.
    contact_notification_email: str | None = None
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str | None = None
    smtp_use_tls: bool = True

    admin_email: str | None = None
    admin_password: str | None = None

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")

    @property
    def resume_directory(self) -> Path:
        path = Path(self.resume_storage_dir)
        return path if path.is_absolute() else BACKEND_ROOT / path

    @property
    def media_directory(self) -> Path:
        path = Path(self.media_storage_dir)
        return path if path.is_absolute() else BACKEND_ROOT / path

    @property
    def arkesel_configured(self) -> bool:
        return bool(self.arkesel_api_key and self.arkesel_sender_id)

    @property
    def exposes_development_otp(self) -> bool:
        """True only for local development without a real SMS provider.

        The OTP is returned to the client so the flow can be exercised locally.
        This must never be enabled in production, regardless of provider state.
        """

        return self.environment == "development" and not self.arkesel_configured

    @property
    def initial_admin_configured(self) -> bool:
        return bool(
            self.initial_admin_email
            and self.initial_admin_password
            and self.initial_admin_phone
        )

    @property
    def email_delivery_configured(self) -> bool:
        return bool(
            self.smtp_host
            and self.contact_notification_email
            and (self.smtp_from_email or self.smtp_username)
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
