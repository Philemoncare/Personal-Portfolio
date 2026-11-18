"""Admin write operations for experience and leadership entries."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ExperienceEntry, LeadershipEntry
from app.schemas.site import ExperienceInput, LeadershipInput
from app.services.project_admin import AdminInputError, _unique_slug, slugify


def _publish(item: ExperienceEntry | LeadershipEntry, status: str) -> None:
    item.status = status
    if status == "published" and item.published_at is None:
        item.published_at = datetime.now(UTC)
    if status != "published":
        item.published_at = None


def create_experience(db: Session, payload: ExperienceInput) -> ExperienceEntry:
    entry = ExperienceEntry()
    _apply_experience(db, entry, payload, is_new=True)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def update_experience(
    db: Session, entry: ExperienceEntry, payload: ExperienceInput
) -> ExperienceEntry:
    _apply_experience(db, entry, payload, is_new=False)
    db.commit()
    db.refresh(entry)
    return entry


def _apply_experience(
    db: Session,
    entry: ExperienceEntry,
    payload: ExperienceInput,
    *,
    is_new: bool,
) -> None:
    if payload.started_on is None:
        raise AdminInputError("A start date is required for an experience entry.")
    entry.organization = payload.organization.strip()
    entry.title = payload.title.strip()
    requested = payload.slug or slugify(
        f"{entry.organization}-{entry.title}", 220
    )
    entry.slug = _unique_slug(
        db, ExperienceEntry, requested, exclude_id=None if is_new else entry.id
    )
    entry.location = payload.location
    entry.description = payload.description
    entry.started_on = payload.started_on
    entry.ended_on = payload.ended_on
    entry.is_current = payload.is_current
    entry.sort_order = payload.sort_order
    entry.is_placeholder = payload.is_placeholder
    _publish(entry, payload.publish_status)


def delete_experience(db: Session, entry: ExperienceEntry) -> None:
    db.delete(entry)
    db.commit()


def create_leadership(db: Session, payload: LeadershipInput) -> LeadershipEntry:
    entry = LeadershipEntry()
    _apply_leadership(db, entry, payload, is_new=True)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def update_leadership(
    db: Session, entry: LeadershipEntry, payload: LeadershipInput
) -> LeadershipEntry:
    _apply_leadership(db, entry, payload, is_new=False)
    db.commit()
    db.refresh(entry)
    return entry


def _apply_leadership(
    db: Session,
    entry: LeadershipEntry,
    payload: LeadershipInput,
    *,
    is_new: bool,
) -> None:
    entry.organization = payload.organization.strip()
    entry.title = payload.title.strip()
    requested = payload.slug or slugify(
        f"{entry.organization}-{entry.title}", 220
    )
    entry.slug = _unique_slug(
        db, LeadershipEntry, requested, exclude_id=None if is_new else entry.id
    )
    entry.description = payload.description
    entry.contribution = payload.contribution
    entry.outcome = payload.outcome
    entry.started_on = payload.started_on
    entry.ended_on = payload.ended_on
    entry.url = payload.url
    entry.sort_order = payload.sort_order
    entry.is_placeholder = payload.is_placeholder
    _publish(entry, payload.publish_status)


def delete_leadership(db: Session, entry: LeadershipEntry) -> None:
    db.delete(entry)
    db.commit()
