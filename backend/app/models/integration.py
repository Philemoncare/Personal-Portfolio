"""Provider connections and import audit records.

GitHub access tokens are stored encrypted (AES-256-GCM) and are never written
to logs or API responses. A revoked connection keeps its audit row but loses
the credential so a database dump cannot be replayed.
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    Uuid,
    false,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class GitHubConnection(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """One GitHub OAuth authorization per administrator."""

    __tablename__ = "github_connections"
    __table_args__ = (
        Index("ix_github_connections_user_id", "user_id", unique=True),
        Index("ix_github_connections_account_id", "github_account_id"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("admin_users.id", ondelete="CASCADE"),
        nullable=False,
    )
    github_account_id: Mapped[str] = mapped_column(String(40), nullable=False)
    username: Mapped[str] = mapped_column(String(120), nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(160), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    account_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    encrypted_access_token: Mapped[str] = mapped_column(Text, nullable=False)
    encrypted_refresh_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    token_type: Mapped[str] = mapped_column(
        String(40), default="bearer", server_default="bearer", nullable=False
    )
    scopes: Mapped[str] = mapped_column(String(300), default="", server_default="", nullable=False)
    repository_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    private_repository_access: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=false(), nullable=False
    )
    connected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    @property
    def is_active(self) -> bool:
        return self.revoked_at is None and bool(self.encrypted_access_token)

    @property
    def scope_list(self) -> list[str]:
        return [scope for scope in self.scopes.split(",") if scope]

    @property
    def repository_access(self) -> str:
        return "public_and_private" if self.private_repository_access else "public"


class GitHubImportLog(UUIDPrimaryKeyMixin, Base):
    """Audit trail for imports, syncs, and repository image imports.

    Only counts and field names are stored. Repository file contents, README
    bodies, and credentials never enter this table.
    """

    __tablename__ = "github_import_logs"
    __table_args__ = (
        CheckConstraint(
            "status IN ('success', 'failed', 'skipped')",
            name="github_import_status_valid",
        ),
        Index("ix_github_import_logs_repository_id", "repository_id"),
        Index("ix_github_import_logs_created_at", "created_at"),
    )

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("admin_users.id", ondelete="SET NULL"),
        nullable=True,
    )
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True,
    )
    repository_id: Mapped[str] = mapped_column(String(40), nullable=False)
    repository_full_name: Mapped[str] = mapped_column(String(300), nullable=False)
    action: Mapped[str] = mapped_column(String(40), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), default="success", server_default="success", nullable=False
    )
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    details: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
