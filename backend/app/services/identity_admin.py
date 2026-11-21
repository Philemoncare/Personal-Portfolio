"""Write operations for the identity-layer admin editors."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    ExperienceEntry,
    LeadershipEntry,
    NowItem,
    Project,
    Resume,
    SiteProfile,
    SiteSettings,
    TimelineEntry,
)
from app.schemas.identity import (
    NowInput,
    ProfileInput,
    SiteSettingsInput,
    TimelineInput,
)
from app.services.resume_files import StoredResumeFile, delete_resume_file


class AdminInputError(Exception):
    """A validation problem that should be reported as a 400 response."""


def slugify(value: str, max_length: int = 220) -> str:
    import re

    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug[:max_length].strip("-")


def unique_slug(db: Session, model, base: str, exclude_id=None) -> str:
    candidate = base or "entry"
    suffix = 2
    while True:
        statement = select(model.id).where(model.slug == candidate)
        if exclude_id is not None:
            statement = statement.where(model.id != exclude_id)
        if db.scalar(statement) is None:
            return candidate
        candidate = f"{base}-{suffix}"[:220]
        suffix += 1


def _apply_publish_state(item, status: str) -> None:
    item.status = status
    if status == "published" and item.published_at is None:
        item.published_at = datetime.now(UTC)
    if status != "published":
        item.published_at = None


# --- Profile --------------------------------------------------------------


def get_or_create_profile(db: Session) -> SiteProfile:
    profile = db.get(SiteProfile, 1)
    if profile is None:
        profile = SiteProfile(
            id=1,
            name="Philemon Melabah",
            display_name="Phill",
            is_placeholder=True,
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


def _sync_identity_settings(db: Session, profile: SiteProfile) -> None:
    """Keep legacy settings identity columns aligned with the profile."""

    row = db.get(SiteSettings, 1)
    if row is None:
        return
    row.display_name = profile.display_name
    row.role_title = profile.professional_title or row.role_title
    row.bio = profile.short_bio or row.bio
    row.location = profile.location
    row.availability = profile.availability
    row.email = profile.email
    row.phone = profile.phone
    row.website_url = profile.website_url
    row.github_url = profile.github_url
    row.linkedin_url = profile.linkedin_url
    if profile.resume_url:
        row.cv_url = profile.resume_url


def update_profile(db: Session, payload: ProfileInput) -> SiteProfile:
    profile = get_or_create_profile(db)
    name = payload.name.strip()
    display_name = payload.display_name.strip()
    if not name:
        raise AdminInputError("A name is required.")
    if not display_name:
        raise AdminInputError("A display name is required.")

    profile.name = name
    profile.display_name = display_name
    profile.professional_title = (payload.professional_title or "").strip() or None
    profile.short_bio = payload.short_bio
    profile.long_bio = payload.long_bio
    profile.what_i_build = payload.what_i_build
    profile.how_i_work = payload.how_i_work
    profile.current_direction = payload.current_direction
    profile.personal_interests = payload.personal_interests
    profile.profile_image = payload.profile_image
    profile.location = (payload.location or "").strip() or None
    profile.email = payload.email
    profile.phone = payload.phone
    profile.availability = (payload.availability or "").strip() or None
    profile.resume_url = payload.resume_url
    profile.github_url = payload.github_url
    profile.linkedin_url = payload.linkedin_url
    profile.website_url = payload.website_url
    profile.is_placeholder = payload.is_placeholder
    _sync_identity_settings(db, profile)
    db.commit()
    db.refresh(profile)
    return profile


def update_site_settings(db: Session, payload: SiteSettingsInput) -> SiteSettings:
    row = db.get(SiteSettings, 1)
    if row is None:
        row = SiteSettings(id=1)
        db.add(row)
    if not payload.site_name.strip():
        raise AdminInputError("A site name is required.")
    row.site_name = payload.site_name.strip()
    row.site_description = payload.site_description
    row.wordmark = payload.wordmark.strip() or "Phill"
    row.accent = payload.accent.strip() or "signal"
    row.footer_text = payload.footer_text
    row.copyright_text = payload.copyright_text
    row.social_image = payload.social_image
    row.favicon = payload.favicon
    row.seo_title = payload.seo_title
    row.seo_description = payload.seo_description
    db.commit()
    db.refresh(row)
    return row


# --- Now ------------------------------------------------------------------


def _check_project(db: Session, project_id: uuid.UUID | None) -> None:
    if project_id is not None and db.get(Project, project_id) is None:
        raise AdminInputError("The selected project does not exist.")


def _check_leadership(db: Session, leadership_id: uuid.UUID | None) -> None:
    if leadership_id is not None and db.get(LeadershipEntry, leadership_id) is None:
        raise AdminInputError("The selected leadership entry does not exist.")


def _apply_now(item: NowItem, payload: NowInput) -> None:
    title = payload.title.strip()
    if not title:
        raise AdminInputError("A title is required.")
    item.title = title
    item.label = payload.category.title()
    item.description = payload.description
    item.category = payload.category
    item.item_status = payload.status
    item.active = payload.active
    item.priority = payload.priority
    item.sort_order = payload.display_order
    item.external_url = payload.external_url
    item.image_url = payload.image_url
    item.related_project_id = payload.related_project_id
    item.related_build_lab_id = payload.related_build_lab_id
    item.related_leadership_id = payload.related_leadership_id
    item.is_placeholder = payload.is_placeholder
    _apply_publish_state(item, payload.publish_status)


def create_now(db: Session, payload: NowInput) -> NowItem:
    _check_project(db, payload.related_project_id)
    _check_project(db, payload.related_build_lab_id)
    _check_leadership(db, payload.related_leadership_id)
    item = NowItem()
    _apply_now(item, payload)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def update_now(db: Session, item: NowItem, payload: NowInput) -> NowItem:
    _check_project(db, payload.related_project_id)
    _check_project(db, payload.related_build_lab_id)
    _check_leadership(db, payload.related_leadership_id)
    _apply_now(item, payload)
    db.commit()
    db.refresh(item)
    return item


def delete_now(db: Session, item: NowItem) -> None:
    db.delete(item)
    db.commit()


def reorder_now(db: Session, ids: list[uuid.UUID]) -> int:
    items = {
        item.id: item
        for item in db.scalars(select(NowItem).where(NowItem.id.in_(ids))).all()
    }
    for index, item_id in enumerate(ids):
        item = items.get(item_id)
        if item is not None:
            item.sort_order = index * 10
    db.commit()
    return len(items)


# --- Timeline -------------------------------------------------------------


def _apply_timeline(item: TimelineEntry, payload: TimelineInput, db: Session) -> None:
    title = payload.title.strip()
    if not title:
        raise AdminInputError("A title is required.")
    if payload.start_date is None:
        raise AdminInputError("A milestone date is required.")

    requested = payload.slug or slugify(title)
    if not requested:
        raise AdminInputError("A slug is required.")
    item.slug = unique_slug(db, TimelineEntry, requested, exclude_id=item.id)
    item.title = title
    item.kind = payload.kind
    item.summary = payload.summary
    item.description = payload.description
    item.organization = payload.organization
    item.location = payload.location
    item.start_date = payload.start_date
    item.end_date = payload.end_date
    item.year = payload.start_date.year
    item.month = payload.start_date.month
    item.external_url = payload.external_url
    item.image_url = payload.image_url
    item.related_project_id = payload.related_project_id
    item.related_experience_id = payload.related_experience_id
    item.related_leadership_id = payload.related_leadership_id
    item.featured = payload.featured
    item.display_order = payload.display_order
    item.is_placeholder = payload.is_placeholder
    _apply_publish_state(item, payload.publish_status)


def _check_links(db: Session, payload: TimelineInput) -> None:
    if payload.related_project_id and db.get(Project, payload.related_project_id) is None:
        raise AdminInputError("The selected project does not exist.")
    if (
        payload.related_experience_id
        and db.get(ExperienceEntry, payload.related_experience_id) is None
    ):
        raise AdminInputError("The selected experience entry does not exist.")
    if (
        payload.related_leadership_id
        and db.get(LeadershipEntry, payload.related_leadership_id) is None
    ):
        raise AdminInputError("The selected leadership entry does not exist.")


def create_timeline(db: Session, payload: TimelineInput) -> TimelineEntry:
    _check_links(db, payload)
    item = TimelineEntry()
    _apply_timeline(item, payload, db)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def update_timeline(
    db: Session, item: TimelineEntry, payload: TimelineInput
) -> TimelineEntry:
    _check_links(db, payload)
    _apply_timeline(item, payload, db)
    db.commit()
    db.refresh(item)
    return item


def delete_timeline(db: Session, item: TimelineEntry) -> None:
    db.delete(item)
    db.commit()


def reorder_timeline(db: Session, ids: list[uuid.UUID]) -> int:
    items = {
        item.id: item
        for item in db.scalars(
            select(TimelineEntry).where(TimelineEntry.id.in_(ids))
        ).all()
    }
    for index, item_id in enumerate(ids):
        item = items.get(item_id)
        if item is not None:
            item.display_order = index * 10
    db.commit()
    return len(items)


# --- Resume ---------------------------------------------------------------


def _demote_other_current(db: Session, keep: Resume) -> None:
    for other in db.scalars(
        select(Resume).where(Resume.is_current.is_(True), Resume.id != keep.id)
    ).all():
        other.is_current = False


def create_resume(
    db: Session,
    stored: StoredResumeFile,
    *,
    title: str,
    version_label: str,
    publish_status: str,
    is_current: bool,
) -> Resume:
    clean_title = title.strip()
    clean_version = version_label.strip()
    if not clean_title:
        raise AdminInputError("A resume title is required.")
    if not clean_version:
        raise AdminInputError("A version label is required.")

    resume = Resume(
        title=clean_title,
        version_label=clean_version,
        original_filename=stored.original_filename,
        file_name=stored.file_name,
        storage_path=stored.storage_path,
        mime_type=stored.mime_type,
        file_size=stored.file_size,
        is_current=is_current,
    )
    _apply_publish_state(resume, publish_status)
    if is_current:
        resume.is_current = True
    db.add(resume)
    db.flush()
    if is_current:
        _demote_other_current(db, resume)
    db.commit()
    db.refresh(resume)
    return resume


def patch_resume(
    db: Session,
    resume: Resume,
    *,
    title: str | None = None,
    version_label: str | None = None,
    is_current: bool | None = None,
    publish_status: str | None = None,
) -> Resume:
    if title is not None:
        if not title.strip():
            raise AdminInputError("A resume title is required.")
        resume.title = title.strip()
    if version_label is not None:
        if not version_label.strip():
            raise AdminInputError("A version label is required.")
        resume.version_label = version_label.strip()
    if publish_status is not None:
        _apply_publish_state(resume, publish_status)
        if publish_status != "published":
            resume.is_current = False
    if is_current is not None:
        resume.is_current = is_current
        if is_current:
            if resume.status != "published":
                _apply_publish_state(resume, "published")
            db.flush()
            _demote_other_current(db, resume)
    db.commit()
    db.refresh(resume)
    return resume


def delete_resume(db: Session, resume: Resume) -> None:
    delete_resume_file(resume.storage_path)
    db.delete(resume)
    db.commit()
