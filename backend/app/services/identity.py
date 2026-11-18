"""Response mappers for the identity layer.

Keeps published-only rules and content-link generation in one place so public
routers never expose drafts or duplicate relationship logic.
"""

from __future__ import annotations

from datetime import UTC, datetime

from app.core.config import settings
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
    ContentLink,
    NowOut,
    ProfileAdminOut,
    ProfilePublic,
    ResumeAdminOut,
    ResumePublic,
    SiteSettingsPublic,
    TimelineOut,
)


def resume_download_url(resume: Resume) -> str:
    return f"/api/v1/resume/{resume.id}/download"


def resume_public(resume: Resume) -> ResumePublic:
    return ResumePublic(
        id=resume.id,
        title=resume.title,
        version_label=resume.version_label,
        file_size=resume.file_size,
        download_url=resume_download_url(resume),
        published_at=resume.published_at,
        updated_at=resume.updated_at,
    )


def resume_admin(resume: Resume) -> ResumeAdminOut:
    return ResumeAdminOut(
        id=resume.id,
        title=resume.title,
        version_label=resume.version_label,
        original_filename=resume.original_filename,
        mime_type=resume.mime_type,
        file_size=resume.file_size,
        status=resume.status,
        is_current=resume.is_current,
        # Admin downloads go through the authenticated route so drafts and
        # archived versions can be inspected without exposing them publicly.
        download_url=f"/api/v1/admin/resume/{resume.id}/download",
        download_count=resume.download_count,
        published_at=resume.published_at,
        created_at=resume.created_at,
        updated_at=resume.updated_at,
    )


def project_link(project: Project | None, kind: str, label: str) -> ContentLink | None:
    if project is None or project.status != "published":
        return None
    href = f"/build-lab/{project.slug}" if kind == "build_lab" else f"/work/{project.slug}"
    return ContentLink(
        kind="build_lab" if kind == "build_lab" else "project",
        title=project.title,
        slug=project.slug,
        href=href,
        label=label,
    )


def experience_link(entry: ExperienceEntry | None) -> ContentLink | None:
    if entry is None or entry.status != "published":
        return None
    href = f"/experience/{entry.slug}" if entry.slug else "/experience"
    return ContentLink(
        kind="experience",
        title=f"{entry.title} · {entry.organization}",
        slug=entry.slug,
        href=href,
        label="Experience",
    )


def leadership_link(entry: LeadershipEntry | None) -> ContentLink | None:
    if entry is None or entry.status != "published":
        return None
    href = f"/leadership/{entry.slug}" if entry.slug else "/leadership"
    return ContentLink(
        kind="leadership",
        title=f"{entry.title} · {entry.organization}",
        slug=entry.slug,
        href=href,
        label="Leadership",
    )


def now_public(item: NowItem) -> NowOut:
    return NowOut(
        id=item.id,
        title=item.title,
        description=item.description,
        category=item.category,
        status=item.item_status,
        active=item.active,
        priority=item.priority,
        display_order=item.sort_order,
        external_url=item.external_url,
        related_project=project_link(item.related_project, "project", "Project"),
        related_build_lab=project_link(item.related_build_lab, "build_lab", "Build Lab"),
        related_leadership=leadership_link(item.related_leadership),
        is_placeholder=item.is_placeholder,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def timeline_public(entry: TimelineEntry) -> TimelineOut:
    return TimelineOut(
        id=entry.id,
        slug=entry.slug,
        title=entry.title,
        kind=entry.kind,
        summary=entry.summary,
        description=entry.description,
        organization=entry.organization,
        location=entry.location,
        start_date=entry.start_date,
        end_date=entry.end_date,
        year=entry.year,
        month=entry.month,
        external_url=entry.external_url,
        featured=entry.featured,
        display_order=entry.display_order,
        related_project=project_link(entry.related_project, "project", "Project"),
        related_experience=experience_link(entry.related_experience),
        related_leadership=leadership_link(entry.related_leadership),
        is_placeholder=entry.is_placeholder,
        published_at=entry.published_at,
    )


def profile_public(
    profile: SiteProfile | None, resume: Resume | None
) -> ProfilePublic | None:
    if profile is None:
        return None
    return ProfilePublic(
        name=profile.name,
        display_name=profile.display_name,
        professional_title=profile.professional_title,
        short_bio=profile.short_bio,
        long_bio=profile.long_bio,
        what_i_build=profile.what_i_build,
        how_i_work=profile.how_i_work,
        current_direction=profile.current_direction,
        personal_interests=profile.personal_interests,
        profile_image=profile.profile_image,
        location=profile.location,
        email=profile.email,
        phone=profile.phone,
        availability=profile.availability,
        resume_url=profile.resume_url,
        github_url=profile.github_url,
        linkedin_url=profile.linkedin_url,
        website_url=profile.website_url,
        is_placeholder=profile.is_placeholder,
        updated_at=profile.updated_at,
        current_resume=resume_public(resume) if resume else None,
    )


def profile_admin(
    profile: SiteProfile | None, resume: Resume | None
) -> ProfileAdminOut | None:
    public = profile_public(profile, resume)
    if public is None or profile is None:
        return None
    return ProfileAdminOut(
        **public.model_dump(),
        created_at=profile.created_at,
    )


def settings_public(
    row: SiteSettings | None,
    profile: SiteProfile | None,
    resume: Resume | None,
    social_links: list | None = None,
) -> SiteSettingsPublic | None:
    if row is None:
        return None

    def first(*values: str | None) -> str | None:
        for value in values:
            if value:
                return value
        return None

    updated_candidates = [
        value
        for value in (
            row.updated_at,
            profile.updated_at if profile else None,
            resume.updated_at if resume else None,
        )
        if value is not None
    ]
    updated_at = max(updated_candidates) if updated_candidates else datetime.now(UTC)

    return SiteSettingsPublic(
        site_name=row.site_name,
        site_description=row.site_description,
        wordmark=row.wordmark,
        accent=row.accent,
        footer_text=row.footer_text,
        copyright_text=row.copyright_text,
        social_image=row.social_image,
        favicon=row.favicon,
        display_name=first(profile.display_name if profile else None, row.display_name)
        or "Phill",
        role_title=first(
            profile.professional_title if profile else None, row.role_title
        )
        or "Developer",
        hero_intro=first(
            profile.short_bio if profile else None, row.hero_intro, row.bio
        ),
        bio=first(profile.short_bio if profile else None, row.bio),
        location=first(profile.location if profile else None, row.location),
        availability=first(profile.availability if profile else None, row.availability),
        email=first(profile.email if profile else None, row.email),
        phone=first(profile.phone if profile else None, row.phone),
        website_url=first(profile.website_url if profile else None, row.website_url),
        github_url=first(profile.github_url if profile else None, row.github_url),
        linkedin_url=first(profile.linkedin_url if profile else None, row.linkedin_url),
        cv_url=(
            resume_download_url(resume)
            if resume
            else first(profile.resume_url if profile else None, row.cv_url)
        ),
        seo_title=row.seo_title,
        seo_description=row.seo_description,
        is_placeholder=(
            profile.is_placeholder if profile else row.is_placeholder
        ),
        updated_at=updated_at,
        contact_delivery=(
            "email_configured"
            if settings.email_delivery_configured
            else "stored_only"
        ),
        resume_available=resume is not None,
        social_links=[
            {
                "id": item.id,
                "platform": item.platform,
                "label": item.label,
                "url": item.url,
                "handle": item.handle,
                "sort_order": item.sort_order,
                "is_visible": item.is_visible,
            }
            for item in (social_links or [])
        ],
    )
