"""Admin media library: validated image storage and metadata."""

from __future__ import annotations

import hashlib
import io
import logging
import re
import uuid
from pathlib import Path

from PIL import Image, UnidentifiedImageError
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.constants import MEDIA_FOLDERS
from app.models import (
    AdminUser,
    Article,
    CaseStudy,
    Certificate,
    DataProject,
    ExperienceEntry,
    LeadershipEntry,
    MediaAsset,
    PageContent,
    Project,
    ProjectMedia,
    SiteProfile,
    SiteSettings,
    TimelineEntry,
)

logger = logging.getLogger("portfolio.media")

ALLOWED: dict[str, tuple[str, str]] = {
    ".jpg": ("image/jpeg", "JPEG"),
    ".jpeg": ("image/jpeg", "JPEG"),
    ".png": ("image/png", "PNG"),
    ".webp": ("image/webp", "WEBP"),
}

MAX_FILENAME = 180


class MediaError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


def media_directory() -> Path:
    directory = settings.media_directory
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def safe_title(original: str) -> str:
    stem = Path(original).stem.replace("-", " ").replace("_", " ").strip()
    stem = re.sub(r"\s+", " ", stem)
    return (stem or "Untitled image")[:200]


def normalise_folder(value: str | None) -> str:
    folder = (value or "misc").strip().lower()
    return folder if folder in MEDIA_FOLDERS else "misc"


def _validate_image(data: bytes, extension: str) -> tuple[int, int, str]:
    try:
        with Image.open(io.BytesIO(data)) as image:
            image.verify()
        with Image.open(io.BytesIO(data)) as image:
            width, height = image.size
            image_format = (image.format or "").upper()
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise MediaError("invalid_image", "The file is not a readable image.") from exc

    expected = ALLOWED[extension][1]
    if image_format != expected:
        raise MediaError("mismatched_type", "The file contents do not match its extension.")

    if width < 1 or height < 1:
        raise MediaError("invalid_image", "The image has no usable dimensions.")
    if max(width, height) > settings.media_max_dimension:
        raise MediaError(
            "too_large_dimensions",
            f"Images must be at most {settings.media_max_dimension}px on a side.",
        )
    return width, height, image_format


def store(
    db: Session,
    *,
    uploader: AdminUser,
    original_filename: str,
    content_type: str | None,
    data: bytes,
    title: str | None = None,
    alt_text: str | None = None,
    folder: str | None = None,
) -> MediaAsset:
    if not data:
        raise MediaError("empty", "The uploaded file is empty.")
    if len(data) > settings.media_max_bytes:
        raise MediaError(
            "too_large",
            f"Images must be {settings.media_max_bytes // (1024 * 1024)} MB or smaller.",
        )

    original = Path(original_filename or "image")
    extension = original.suffix.lower()
    if extension not in ALLOWED:
        raise MediaError(
            "invalid_extension",
            "Only JPEG, PNG, and WebP images are accepted.",
        )

    expected_mime = ALLOWED[extension][0]
    if content_type and content_type.split(";")[0].strip().lower() not in {
        expected_mime,
        "application/octet-stream",
    }:
        raise MediaError("invalid_mime", "The declared file type is not allowed.")

    width, height, _ = _validate_image(data, extension)

    filename = f"{uuid.uuid4().hex}{extension}"
    directory = media_directory()
    target = directory / filename
    target.write_bytes(data)

    checksum = hashlib.sha256(data).hexdigest()
    clean_alt = (alt_text or "").strip() or safe_title(original.name)
    if len(clean_alt) < 4:
        clean_alt = safe_title(original.name)

    asset = MediaAsset(
        filename=filename,
        original_filename=original.name[:255],
        title=(title or safe_title(original.name))[:200],
        url=f"/media/{filename}",
        alt_text=clean_alt[:300],
        mime_type=expected_mime,
        extension=extension.lstrip("."),
        size_bytes=len(data),
        width=width,
        height=height,
        kind="image",
        folder=normalise_folder(folder),
        checksum=checksum,
        uploaded_by_id=uploader.id,
    )
    db.add(asset)
    try:
        db.commit()
    except Exception:
        target.unlink(missing_ok=True)
        raise
    db.refresh(asset)
    logger.info("Media asset stored id=%s bytes=%s", asset.id, asset.size_bytes)
    return asset


def list_assets(
    db: Session,
    *,
    search: str | None = None,
    kind: str | None = None,
    folder: str | None = None,
    attached_to_type: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> tuple[list[MediaAsset], int]:
    statement = select(MediaAsset)
    if search:
        pattern = f"%{search.strip().lower()}%"
        statement = statement.where(
            or_(
                func.lower(MediaAsset.title).like(pattern),
                func.lower(MediaAsset.original_filename).like(pattern),
                func.lower(MediaAsset.alt_text).like(pattern),
            )
        )
    if kind:
        statement = statement.where(MediaAsset.kind == kind)
    if folder:
        statement = statement.where(MediaAsset.folder == normalise_folder(folder))
    if attached_to_type:
        statement = statement.where(MediaAsset.attached_to_type == attached_to_type)

    total = db.scalar(select(func.count()).select_from(statement.subquery())) or 0
    items = list(
        db.scalars(
            statement.order_by(MediaAsset.created_at.desc()).limit(limit).offset(offset)
        ).all()
    )
    return items, total


def get_asset(db: Session, asset_id: uuid.UUID) -> MediaAsset | None:
    return db.get(MediaAsset, asset_id)


def update_asset(db: Session, asset: MediaAsset, **values) -> MediaAsset:
    for field in (
        "title",
        "alt_text",
        "caption",
        "folder",
        "attached_to_type",
        "attached_to_id",
    ):
        if field in values:
            if field == "folder":
                setattr(asset, field, normalise_folder(values[field]))
            else:
                setattr(asset, field, values[field])
    db.commit()
    db.refresh(asset)
    return asset


def _collect_usage(db: Session, asset: MediaAsset) -> list[dict[str, str | None]]:
    """Return every stored reference to this asset URL.

    Media associations are real foreign keys; content image fields are URL
    strings. Both are reported so the editor can warn before deleting.
    """

    usage: list[dict[str, str | None]] = []

    for project in db.scalars(
        select(Project).where(
            or_(
                Project.cover_image == asset.url,
                Project.og_image == asset.url,
                Project.preview_image == asset.url,
            )
        )
    ).all():
        field = (
            "cover"
            if project.cover_image == asset.url
            else "homepage preview"
            if project.preview_image == asset.url
            else "SEO image"
        )
        usage.append(
            {
                "type": "project",
                "id": str(project.id),
                "title": project.title,
                "field": field,
            }
        )

    for project, media in db.execute(
        select(Project, ProjectMedia)
        .join(ProjectMedia, ProjectMedia.project_id == Project.id)
        .where(ProjectMedia.url == asset.url)
    ).all():
        usage.append(
            {
                "type": "project_media",
                "id": str(project.id),
                "title": project.title,
                "field": "Gallery / diagram",
            }
        )

    for item in db.scalars(
        select(DataProject).where(DataProject.cover_image == asset.url)
    ).all():
        usage.append(
            {
                "type": "data_project",
                "id": str(item.id),
                "title": item.title,
                "field": "Cover image",
            }
        )

    for page in db.scalars(
        select(PageContent).where(
            or_(PageContent.hero_image == asset.url, PageContent.og_image == asset.url)
        )
    ).all():
        usage.append(
            {
                "type": "page",
                "id": str(page.id),
                "title": page.page_key,
                "field": "Hero image" if page.hero_image == asset.url else "SEO image",
            }
        )

    for article in db.scalars(
        select(Article).where(Article.cover_image_url == asset.url)
    ).all():
        usage.append(
            {
                "type": "article",
                "id": str(article.id),
                "title": article.title,
                "field": "Cover image",
            }
        )

    for study in db.scalars(
        select(CaseStudy).where(CaseStudy.cover_image_url == asset.url)
    ).all():
        usage.append(
            {
                "type": "case_study",
                "id": str(study.id),
                "title": study.title,
                "field": "Cover image",
            }
        )

    for experience in db.scalars(
        select(ExperienceEntry).where(ExperienceEntry.logo_url == asset.url)
    ).all():
        usage.append(
            {
                "type": "experience",
                "id": str(experience.id),
                "title": f"{experience.title} · {experience.organization}",
                "field": "Organization logo",
            }
        )

    for leadership in db.scalars(
        select(LeadershipEntry).where(LeadershipEntry.image_url == asset.url)
    ).all():
        usage.append(
            {
                "type": "leadership",
                "id": str(leadership.id),
                "title": f"{leadership.title} · {leadership.organization}",
                "field": "Image",
            }
        )

    for timeline in db.scalars(
        select(TimelineEntry).where(TimelineEntry.image_url == asset.url)
    ).all():
        usage.append(
            {
                "type": "timeline",
                "id": str(timeline.id),
                "title": timeline.title,
                "field": "Image",
            }
        )

    for certificate in db.scalars(
        select(Certificate).where(Certificate.media_url == asset.url)
    ).all():
        usage.append(
            {
                "type": "certificate",
                "id": str(certificate.id),
                "title": certificate.name,
                "field": "Certificate image",
            }
        )

    profile = db.get(SiteProfile, 1)
    if profile is not None and profile.profile_image == asset.url:
        usage.append(
            {
                "type": "profile",
                "id": "1",
                "title": "Site profile",
                "field": "Profile image",
            }
        )

    site = db.get(SiteSettings, 1)
    if site is not None:
        if site.social_image == asset.url:
            usage.append(
                {
                    "type": "site_settings",
                    "id": "1",
                    "title": "Site settings",
                    "field": "Social image",
                }
            )
        if site.favicon == asset.url:
            usage.append(
                {
                    "type": "site_settings",
                    "id": "1",
                    "title": "Site settings",
                    "field": "Favicon",
                }
            )

    return usage


def usage_for_asset(db: Session, asset: MediaAsset) -> list[dict[str, str | None]]:
    return _collect_usage(db, asset)


def replace_asset(
    db: Session,
    asset: MediaAsset,
    *,
    original_filename: str,
    content_type: str | None,
    data: bytes,
) -> MediaAsset:
    """Replace the stored bytes while preserving the public URL.

    The extension must stay the same so every existing reference keeps
    resolving. Metadata is recomputed from the new image.
    """

    if not data:
        raise MediaError("empty", "The uploaded file is empty.")
    if len(data) > settings.media_max_bytes:
        raise MediaError(
            "too_large",
            f"Images must be {settings.media_max_bytes // (1024 * 1024)} MB or smaller.",
        )

    extension = Path(original_filename or "image").suffix.lower()
    current_extension = f".{asset.extension}"
    if extension not in ALLOWED:
        raise MediaError(
            "invalid_extension", "Only JPEG, PNG, and WebP images are accepted."
        )
    if extension != current_extension:
        raise MediaError(
            "extension_mismatch",
            (
                "Replacements must keep the existing file type so current links "
                f"keep working ({current_extension})."
            ),
        )

    expected_mime = ALLOWED[extension][0]
    if content_type and content_type.split(";")[0].strip().lower() not in {
        expected_mime,
        "application/octet-stream",
    }:
        raise MediaError("invalid_mime", "The declared file type is not allowed.")

    width, height, _ = _validate_image(data, extension)
    target = media_directory() / asset.filename
    target.write_bytes(data)

    asset.size_bytes = len(data)
    asset.width = width
    asset.height = height
    asset.checksum = hashlib.sha256(data).hexdigest()
    asset.mime_type = expected_mime
    asset.original_filename = Path(original_filename).name[:255]
    db.commit()
    db.refresh(asset)
    return asset


def delete_asset(db: Session, asset: MediaAsset, *, force: bool = False) -> None:
    usage = _collect_usage(db, asset)
    if usage and not force:
        raise MediaError(
            "in_use",
            f"Used in {len(usage)} place{'s' if len(usage) != 1 else ''}. "
            "Detach it from that content or confirm deletion.",
        )
    directory = media_directory().resolve()
    target = (directory / asset.filename).resolve()
    if directory not in target.parents:
        raise MediaError("unsafe_path", "Refusing to delete a file outside media storage.")
    target.unlink(missing_ok=True)
    db.delete(asset)
    db.commit()
