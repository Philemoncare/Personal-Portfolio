"""Validated, non-executable resume document storage."""

from __future__ import annotations

import os
import uuid
from dataclasses import dataclass
from pathlib import Path

from fastapi import UploadFile

from app.core.config import settings

ALLOWED_SUFFIXES = {".pdf"}
ALLOWED_MIME_TYPES = {"application/pdf", "application/x-pdf"}
PDF_MAGIC = b"%PDF-"
CHUNK_SIZE = 64 * 1024


class ResumeFileError(ValueError):
    """A user-correctable upload problem."""


@dataclass(frozen=True)
class StoredResumeFile:
    original_filename: str
    file_name: str
    storage_path: str
    mime_type: str
    file_size: int


def _safe_original_name(raw: str | None) -> str:
    name = (raw or "").strip()
    if not name:
        raise ResumeFileError("Choose a PDF file to upload.")
    # Reject path components outright rather than silently normalising them.
    if "/" in name or "\\" in name or name in {".", ".."}:
        raise ResumeFileError("The filename is not allowed.")
    if len(name) > 200:
        raise ResumeFileError("The filename is too long (maximum 200 characters).")
    suffix = Path(name).suffix.lower()
    if suffix not in ALLOWED_SUFFIXES:
        raise ResumeFileError("Only PDF files can be uploaded.")
    return name


def _resume_directory() -> Path:
    directory = settings.resume_directory
    directory.mkdir(parents=True, exist_ok=True)
    return directory


async def store_resume_file(upload: UploadFile) -> StoredResumeFile:
    original = _safe_original_name(upload.filename)

    declared_type = (upload.content_type or "").split(";")[0].strip().lower()
    if declared_type not in ALLOWED_MIME_TYPES:
        raise ResumeFileError("The uploaded file is not a PDF (invalid MIME type).")

    data = await upload.read(settings.resume_max_bytes + 1)
    if not data:
        raise ResumeFileError("The uploaded file is empty.")
    if len(data) > settings.resume_max_bytes:
        raise ResumeFileError(
            f"Resume files must be {settings.resume_max_bytes // (1024 * 1024)} MB or smaller."
        )
    if not data.startswith(PDF_MAGIC):
        raise ResumeFileError("The file does not look like a valid PDF document.")

    directory = _resume_directory()
    stored_name = f"{uuid.uuid4().hex}.pdf"
    target = directory / stored_name

    try:
        with target.open("wb") as handle:
            handle.write(data)
        os.chmod(target, 0o600)
    except OSError as exc:  # pragma: no cover - filesystem failure
        target.unlink(missing_ok=True)
        raise ResumeFileError("The resume could not be stored. Try again.") from exc

    return StoredResumeFile(
        original_filename=original,
        file_name=stored_name,
        # Persist only the generated file name so the record stays portable
        # and never carries the server's absolute filesystem path.
        storage_path=stored_name,
        mime_type="application/pdf",
        file_size=len(data),
    )


def resume_file_path(storage_path: str) -> Path | None:
    """Resolve a stored reference, refusing anything outside the resume directory.

    New records store just the generated file name. Older records may still
    hold an absolute path; those keep working because the resolved candidate
    must still live directly inside the resume directory.
    """

    directory = settings.resume_directory.resolve()
    raw = Path(storage_path)
    candidate = (raw if raw.is_absolute() else directory / raw).resolve()
    if directory not in candidate.parents or not candidate.is_file():
        return None
    return candidate


def delete_resume_file(storage_path: str) -> None:
    candidate = resume_file_path(storage_path)
    if candidate is not None:
        candidate.unlink(missing_ok=True)
