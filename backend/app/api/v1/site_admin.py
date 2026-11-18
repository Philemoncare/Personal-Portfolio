"""Admin endpoints for social links, editable page content, experience, and leadership."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.core.constants import PAGE_KEYS
from app.db.session import get_db
from app.models import AdminUser, ExperienceEntry, LeadershipEntry
from app.schemas.site import (
    ExperienceAdminOut,
    ExperienceInput,
    LeadershipAdminOut,
    LeadershipInput,
    PageContentAdminOut,
    PageContentInput,
    SocialLinkAdminOut,
    SocialLinkInput,
)
from app.services import activity, profile_content_admin, site_content

router = APIRouter()


def _get_social(db: Session, link_id: uuid.UUID):
    link = site_content.get_social_link(db, link_id)
    if link is None:
        raise HTTPException(status_code=404, detail="Social link not found")
    return link


# --- Social links ---------------------------------------------------------


@router.get("/social-links", response_model=list[SocialLinkAdminOut])
def list_social_links(
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[SocialLinkAdminOut]:
    return [
        SocialLinkAdminOut.model_validate(item)
        for item in site_content.list_social_links(db, include_hidden=True)
    ]


@router.post(
    "/social-links",
    response_model=SocialLinkAdminOut,
    status_code=status.HTTP_201_CREATED,
)
def create_social_link(
    payload: SocialLinkInput,
    request: Request,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> SocialLinkAdminOut:
    link = site_content.create_social_link(db, payload)
    activity.record(
        db,
        "social_link_created",
        user_id=admin.id,
        identifier=link.label,
        detail=f"Added {link.platform} link",
        request=request,
    )
    return SocialLinkAdminOut.model_validate(link)


@router.put("/social-links/{link_id}", response_model=SocialLinkAdminOut)
def update_social_link(
    link_id: uuid.UUID,
    payload: SocialLinkInput,
    request: Request,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> SocialLinkAdminOut:
    link = _get_social(db, link_id)
    link = site_content.update_social_link(db, link, payload)
    activity.record(
        db,
        "social_link_updated",
        user_id=admin.id,
        identifier=link.label,
        detail=f"Updated {link.platform} link",
        request=request,
    )
    return SocialLinkAdminOut.model_validate(link)


@router.delete(
    "/social-links/{link_id}", status_code=status.HTTP_204_NO_CONTENT
)
def delete_social_link(
    link_id: uuid.UUID,
    request: Request,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> Response:
    link = _get_social(db, link_id)
    label = link.label
    site_content.delete_social_link(db, link)
    activity.record(
        db,
        "social_link_deleted",
        user_id=admin.id,
        identifier=label,
        detail="Deleted social link",
        request=request,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Page content and SEO -------------------------------------------------


@router.get("/pages", response_model=list[PageContentAdminOut])
def list_pages(
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[PageContentAdminOut]:
    return [
        PageContentAdminOut.model_validate(item)
        for item in site_content.list_pages(db)
    ]


@router.get("/pages/{page_key}", response_model=PageContentAdminOut)
def get_page(
    page_key: str,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> PageContentAdminOut:
    page = site_content.get_page(db, page_key)
    if page is None:
        raise HTTPException(status_code=404, detail="Page content not saved yet")
    return PageContentAdminOut.model_validate(page)


@router.put("/pages/{page_key}", response_model=PageContentAdminOut)
def put_page(
    page_key: str,
    payload: PageContentInput,
    request: Request,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> PageContentAdminOut:
    if page_key not in PAGE_KEYS:
        raise HTTPException(status_code=404, detail="Unknown page")
    try:
        page = site_content.upsert_page(db, page_key, payload)
    except site_content.SiteContentError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    activity.record(
        db,
        "page_content_updated",
        user_id=admin.id,
        identifier=page_key,
        detail=f"Updated page content for {page_key}",
        request=request,
    )
    return PageContentAdminOut.model_validate(page)


# --- Experience -----------------------------------------------------------


def _get_experience(db: Session, entry_id: uuid.UUID) -> ExperienceEntry:
    entry = db.get(ExperienceEntry, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Experience entry not found")
    return entry


@router.get("/experience", response_model=list[ExperienceAdminOut])
def list_experience(
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[ExperienceAdminOut]:
    rows = db.scalars(
        select(ExperienceEntry).order_by(
            ExperienceEntry.sort_order, ExperienceEntry.started_on.desc()
        )
    ).all()
    return [ExperienceAdminOut.model_validate(item) for item in rows]


@router.post(
    "/experience",
    response_model=ExperienceAdminOut,
    status_code=status.HTTP_201_CREATED,
)
def create_experience(
    payload: ExperienceInput,
    request: Request,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> ExperienceAdminOut:
    try:
        entry = profile_content_admin.create_experience(db, payload)
    except profile_content_admin.AdminInputError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    activity.record(
        db,
        "experience_created",
        user_id=admin.id,
        identifier=entry.slug,
        detail=f"Created experience “{entry.title}” as {entry.status}",
        request=request,
    )
    return ExperienceAdminOut.model_validate(entry)


@router.put("/experience/{entry_id}", response_model=ExperienceAdminOut)
def update_experience(
    entry_id: uuid.UUID,
    payload: ExperienceInput,
    request: Request,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> ExperienceAdminOut:
    entry = _get_experience(db, entry_id)
    try:
        entry = profile_content_admin.update_experience(db, entry, payload)
    except profile_content_admin.AdminInputError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    activity.record(
        db,
        "experience_updated",
        user_id=admin.id,
        identifier=entry.slug,
        detail=f"Updated experience “{entry.title}”",
        request=request,
    )
    return ExperienceAdminOut.model_validate(entry)


@router.delete(
    "/experience/{entry_id}", status_code=status.HTTP_204_NO_CONTENT
)
def delete_experience(
    entry_id: uuid.UUID,
    request: Request,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> Response:
    entry = _get_experience(db, entry_id)
    title, slug = entry.title, entry.slug
    profile_content_admin.delete_experience(db, entry)
    activity.record(
        db,
        "experience_deleted",
        user_id=admin.id,
        identifier=slug,
        detail=f"Deleted experience “{title}”",
        request=request,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Leadership -----------------------------------------------------------


def _get_leadership(db: Session, entry_id: uuid.UUID) -> LeadershipEntry:
    entry = db.get(LeadershipEntry, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Leadership entry not found")
    return entry


@router.get("/leadership", response_model=list[LeadershipAdminOut])
def list_leadership(
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[LeadershipAdminOut]:
    rows = db.scalars(
        select(LeadershipEntry).order_by(
            LeadershipEntry.sort_order, LeadershipEntry.started_on.desc()
        )
    ).all()
    return [LeadershipAdminOut.model_validate(item) for item in rows]


@router.post(
    "/leadership",
    response_model=LeadershipAdminOut,
    status_code=status.HTTP_201_CREATED,
)
def create_leadership(
    payload: LeadershipInput,
    request: Request,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> LeadershipAdminOut:
    try:
        entry = profile_content_admin.create_leadership(db, payload)
    except profile_content_admin.AdminInputError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    activity.record(
        db,
        "leadership_created",
        user_id=admin.id,
        identifier=entry.slug,
        detail=f"Created leadership “{entry.title}” as {entry.status}",
        request=request,
    )
    return LeadershipAdminOut.model_validate(entry)


@router.put("/leadership/{entry_id}", response_model=LeadershipAdminOut)
def update_leadership(
    entry_id: uuid.UUID,
    payload: LeadershipInput,
    request: Request,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> LeadershipAdminOut:
    entry = _get_leadership(db, entry_id)
    try:
        entry = profile_content_admin.update_leadership(db, entry, payload)
    except profile_content_admin.AdminInputError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    activity.record(
        db,
        "leadership_updated",
        user_id=admin.id,
        identifier=entry.slug,
        detail=f"Updated leadership “{entry.title}”",
        request=request,
    )
    return LeadershipAdminOut.model_validate(entry)


@router.delete(
    "/leadership/{entry_id}", status_code=status.HTTP_204_NO_CONTENT
)
def delete_leadership(
    entry_id: uuid.UUID,
    request: Request,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> Response:
    entry = _get_leadership(db, entry_id)
    title, slug = entry.title, entry.slug
    profile_content_admin.delete_leadership(db, entry)
    activity.record(
        db,
        "leadership_deleted",
        user_id=admin.id,
        identifier=slug,
        detail=f"Deleted leadership “{title}”",
        request=request,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
