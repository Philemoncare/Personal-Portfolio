"""Admin endpoints for the identity and communication layer."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from urllib.parse import quote

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Request,
    Response,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.core.config import settings
from app.core.constants import (
    CONTACT_INQUIRY_LABELS,
    CONTACT_INQUIRY_TYPES,
    CONTENT_STATUSES,
    MESSAGE_STATUSES,
    NOW_CATEGORIES,
    NOW_CATEGORY_LABELS,
    NOW_STATUSES,
    TIMELINE_KIND_LABELS,
    TIMELINE_KINDS,
)
from app.db.session import get_db
from app.models import (
    AdminUser,
    Article,
    ContactMessage,
    ExperienceEntry,
    LeadershipEntry,
    NowItem,
    Project,
    SiteSettings,
    TimelineEntry,
)
from app.repositories.identity import IdentityRepository
from app.schemas.content import (
    ArticleAdminOut,
    ArticleInput,
    ArticleReorderInput,
)
from app.schemas.identity import (
    AdminMessageList,
    AdminSettingsInput,
    AdminSettingsOut,
    ContactMessageAdmin,
    ContentReference,
    LinkedRecord,
    MessageStatusInput,
    NowAdminOut,
    NowInput,
    NowReorderInput,
    ProfileAdminOut,
    ProfileInput,
    ResumeAdminOut,
    ResumePatch,
    SiteSettingsAdminOut,
    TimelineAdminOut,
    TimelineInput,
    TimelineReorderInput,
)
from app.schemas.identity import SiteSettingsInput
from app.services import activity, identity_admin, article_admin
from app.services.identity import (
    now_public,
    profile_admin,
    resume_admin,
    timeline_public,
)
from app.services.resume_files import (
    ResumeFileError,
    delete_resume_file,
    resume_file_path,
    store_resume_file,
)

router = APIRouter()


def _identity_repo(db: Session) -> IdentityRepository:
    return IdentityRepository(db)


def now_admin_out(item: NowItem) -> NowAdminOut:
    base = now_public(item).model_dump()
    base.update(
        publish_status=item.status,
        related_project_id=item.related_project_id,
        related_build_lab_id=item.related_build_lab_id,
        related_leadership_id=item.related_leadership_id,
        related_project_title=(
            item.related_project.title if item.related_project else None
        ),
        related_build_lab_title=(
            item.related_build_lab.title if item.related_build_lab else None
        ),
        related_leadership_title=(
            item.related_leadership.title if item.related_leadership else None
        ),
    )
    return NowAdminOut(**base)


def timeline_admin_out(item: TimelineEntry) -> TimelineAdminOut:
    base = timeline_public(item).model_dump()
    base.update(
        publish_status=item.status,
        related_project_id=item.related_project_id,
        related_experience_id=item.related_experience_id,
        related_leadership_id=item.related_leadership_id,
        related_project_title=(
            item.related_project.title if item.related_project else None
        ),
        related_experience_title=(
            f"{item.related_experience.title} · {item.related_experience.organization}"
            if item.related_experience
            else None
        ),
        related_leadership_title=(
            f"{item.related_leadership.title} · {item.related_leadership.organization}"
            if item.related_leadership
            else None
        ),
    )
    return TimelineAdminOut(**base)


# --- Profile --------------------------------------------------------------


@router.get("/profile", response_model=ProfileAdminOut)
def get_profile(
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> ProfileAdminOut:
    repo = _identity_repo(db)
    payload = profile_admin(repo.profile(), repo.current_resume())
    if payload is None:
        raise HTTPException(status_code=404, detail="The profile has not been added yet.")
    return payload


@router.put("/profile", response_model=ProfileAdminOut)
def put_profile(
    payload: ProfileInput,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> ProfileAdminOut:
    try:
        profile = identity_admin.update_profile(db, payload)
    except identity_admin.AdminInputError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    repo = _identity_repo(db)
    result = profile_admin(profile, repo.current_resume())
    if result is None:
        raise HTTPException(status_code=500, detail="Profile could not be saved.")
    return result


# --- Now ------------------------------------------------------------------


@router.get("/now", response_model=list[NowAdminOut])
def list_now(
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[NowAdminOut]:
    rows = db.scalars(
        select(NowItem).order_by(
            NowItem.sort_order, NowItem.priority.desc(), NowItem.updated_at.desc()
        )
    ).all()
    return [now_admin_out(item) for item in rows]


@router.post("/now/reorder", response_model=dict[str, int])
def reorder_now(
    payload: NowReorderInput,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> dict[str, int]:
    return {"updated": identity_admin.reorder_now(db, payload.ids)}


@router.post("/now", response_model=NowAdminOut, status_code=status.HTTP_201_CREATED)
def create_now(
    payload: NowInput,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> NowAdminOut:
    try:
        item = identity_admin.create_now(db, payload)
    except identity_admin.AdminInputError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return now_admin_out(item)


@router.put("/now/{item_id}", response_model=NowAdminOut)
def update_now(
    item_id: uuid.UUID,
    payload: NowInput,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> NowAdminOut:
    item = db.get(NowItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Now item not found")
    try:
        item = identity_admin.update_now(db, item, payload)
    except identity_admin.AdminInputError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return now_admin_out(item)


@router.delete("/now/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_now(
    item_id: uuid.UUID,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> Response:
    item = db.get(NowItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Now item not found")
    identity_admin.delete_now(db, item)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Timeline -------------------------------------------------------------


@router.get("/timeline", response_model=list[TimelineAdminOut])
def list_timeline(
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[TimelineAdminOut]:
    rows = db.scalars(
        select(TimelineEntry).order_by(
            TimelineEntry.start_date.desc().nulls_last(),
            TimelineEntry.year.desc(),
            TimelineEntry.month.desc().nulls_last(),
            TimelineEntry.display_order,
        )
    ).all()
    return [timeline_admin_out(item) for item in rows]


@router.post("/timeline/reorder", response_model=dict[str, int])
def reorder_timeline(
    payload: TimelineReorderInput,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> dict[str, int]:
    return {"updated": identity_admin.reorder_timeline(db, payload.ids)}


@router.post(
    "/timeline", response_model=TimelineAdminOut, status_code=status.HTTP_201_CREATED
)
def create_timeline(
    payload: TimelineInput,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> TimelineAdminOut:
    try:
        item = identity_admin.create_timeline(db, payload)
    except identity_admin.AdminInputError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return timeline_admin_out(item)


@router.put("/timeline/{entry_id}", response_model=TimelineAdminOut)
def update_timeline(
    entry_id: uuid.UUID,
    payload: TimelineInput,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> TimelineAdminOut:
    item = db.get(TimelineEntry, entry_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Timeline entry not found")
    try:
        item = identity_admin.update_timeline(db, item, payload)
    except identity_admin.AdminInputError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return timeline_admin_out(item)


@router.delete("/timeline/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_timeline(
    entry_id: uuid.UUID,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> Response:
    item = db.get(TimelineEntry, entry_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Timeline entry not found")
    identity_admin.delete_timeline(db, item)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Articles -------------------------------------------------------------


@router.get("/articles", response_model=list[ArticleAdminOut])
def list_articles(
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[ArticleAdminOut]:
    rows = db.scalars(
        select(Article).order_by(
            Article.sort_order,
            Article.published_at.desc().nulls_last(),
            Article.created_at.desc(),
        )
    ).all()
    return [ArticleAdminOut.model_validate(item) for item in rows]


@router.get("/articles/{article_id}", response_model=ArticleAdminOut)
def get_article(
    article_id: uuid.UUID,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> ArticleAdminOut:
    article = db.get(Article, article_id)
    if article is None:
        raise HTTPException(status_code=404, detail="Article not found")
    return ArticleAdminOut.model_validate(article)


@router.post(
    "/articles", response_model=ArticleAdminOut, status_code=status.HTTP_201_CREATED
)
def create_article(
    payload: ArticleInput,
    request: Request,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> ArticleAdminOut:
    try:
        article = article_admin.create_article(db, payload)
    except article_admin.AdminInputError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    activity.record(
        db,
        "article_created",
        user_id=admin.id,
        identifier=admin.email,
        detail=f"Created article “{article.title}”",
        request=request,
    )
    return ArticleAdminOut.model_validate(article)


@router.put("/articles/{article_id}", response_model=ArticleAdminOut)
def update_article(
    article_id: uuid.UUID,
    payload: ArticleInput,
    request: Request,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> ArticleAdminOut:
    article = db.get(Article, article_id)
    if article is None:
        raise HTTPException(status_code=404, detail="Article not found")
    try:
        article = article_admin.update_article(db, article, payload)
    except article_admin.AdminInputError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    activity.record(
        db,
        "article_updated",
        user_id=admin.id,
        identifier=admin.email,
        detail=f"Updated article “{article.title}” ({article.status})",
        request=request,
    )
    return ArticleAdminOut.model_validate(article)


@router.post("/articles/reorder", response_model=dict[str, int])
def reorder_articles(
    payload: ArticleReorderInput,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> dict[str, int]:
    return {"updated": article_admin.reorder_articles(db, payload.ids)}


@router.delete("/articles/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_article(
    article_id: uuid.UUID,
    request: Request,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> Response:
    article = db.get(Article, article_id)
    if article is None:
        raise HTTPException(status_code=404, detail="Article not found")
    title = article.title
    article_admin.delete_article(db, article)
    activity.record(
        db,
        "article_deleted",
        user_id=admin.id,
        identifier=admin.email,
        detail=f"Deleted article “{title}”",
        request=request,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Resume ---------------------------------------------------------------


@router.get("/resume", response_model=list[ResumeAdminOut])
def list_resumes(
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[ResumeAdminOut]:
    return [resume_admin(item) for item in _identity_repo(db).resumes()]


@router.post("/resume", response_model=ResumeAdminOut, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    title: str = Form(...),
    version_label: str = Form(...),
    publish_status: str = Form("draft"),
    is_current: bool = Form(False),
    file: UploadFile = File(...),
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> ResumeAdminOut:
    if publish_status not in CONTENT_STATUSES:
        raise HTTPException(status_code=400, detail="Choose a valid visibility setting.")

    stored = None
    try:
        stored = await store_resume_file(file)
        resume = identity_admin.create_resume(
            db,
            stored,
            title=title,
            version_label=version_label,
            publish_status=publish_status,
            is_current=is_current,
        )
    except ResumeFileError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except identity_admin.AdminInputError as exc:
        if stored is not None:
            delete_resume_file(stored.storage_path)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception:
        if stored is not None:
            delete_resume_file(stored.storage_path)
        raise
    return resume_admin(resume)


@router.patch("/resume/{resume_id}", response_model=ResumeAdminOut)
def patch_resume(
    resume_id: uuid.UUID,
    payload: ResumePatch,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> ResumeAdminOut:
    resume = _identity_repo(db).resume(resume_id)
    if resume is None:
        raise HTTPException(status_code=404, detail="Resume not found")
    try:
        resume = identity_admin.patch_resume(
            db,
            resume,
            title=payload.title,
            version_label=payload.version_label,
            is_current=payload.is_current,
            publish_status=payload.publish_status,
        )
    except identity_admin.AdminInputError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return resume_admin(resume)


@router.delete("/resume/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_resume(
    resume_id: uuid.UUID,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> Response:
    resume = _identity_repo(db).resume(resume_id)
    if resume is None:
        raise HTTPException(status_code=404, detail="Resume not found")
    identity_admin.delete_resume(db, resume)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/resume/{resume_id}/download")
def admin_download_resume(
    resume_id: uuid.UUID,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> FileResponse:
    resume = _identity_repo(db).resume(resume_id)
    if resume is None:
        raise HTTPException(status_code=404, detail="Resume not found")
    path = resume_file_path(resume.storage_path)
    if path is None:
        raise HTTPException(status_code=404, detail="The resume file is not available.")
    filename = resume.original_filename.replace('"', "")
    return FileResponse(
        path,
        media_type="application/pdf",
        filename=filename,
        headers={
            "Content-Disposition": (
                f"attachment; filename=\"resume.pdf\"; "
                f"filename*=UTF-8''{quote(filename)}"
            ),
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )


# --- Messages -------------------------------------------------------------


@router.get("/messages", response_model=AdminMessageList)
def list_messages(
    status_filter: str | None = Query(default=None, alias="status"),
    search: str | None = Query(default=None, max_length=160),
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminMessageList:
    statement = select(ContactMessage)
    if status_filter:
        if status_filter not in MESSAGE_STATUSES:
            raise HTTPException(status_code=400, detail="Choose a valid message status.")
        statement = statement.where(ContactMessage.status == status_filter)
    term = (search or "").strip()
    if term:
        pattern = f"%{term}%"
        statement = statement.where(
            or_(
                ContactMessage.name.ilike(pattern),
                ContactMessage.email.ilike(pattern),
                ContactMessage.subject.ilike(pattern),
                ContactMessage.message.ilike(pattern),
            )
        )

    total = int(
        db.scalar(
            select(func.count()).select_from(statement.order_by(None).subquery())
        )
        or 0
    )
    unread = int(
        db.scalar(
            select(func.count(ContactMessage.id)).where(
                ContactMessage.status == "new"
            )
        )
        or 0
    )
    spam = int(
        db.scalar(
            select(func.count(ContactMessage.id)).where(
                ContactMessage.status == "spam"
            )
        )
        or 0
    )
    rows = db.scalars(
        statement.order_by(ContactMessage.created_at.desc())
        .limit(limit)
        .offset(offset)
    ).all()
    return AdminMessageList(
        items=[ContactMessageAdmin.model_validate(item) for item in rows],
        total=total,
        unread=unread,
        spam=spam,
        email_delivery_configured=settings.email_delivery_configured,
        notification_email=settings.contact_notification_email,
    )


@router.get("/messages/{message_id}", response_model=ContactMessageAdmin)
def get_message(
    message_id: uuid.UUID,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> ContactMessageAdmin:
    message = db.get(ContactMessage, message_id)
    if message is None:
        raise HTTPException(status_code=404, detail="Message not found")
    return ContactMessageAdmin.model_validate(message)


@router.patch("/messages/{message_id}/status", response_model=ContactMessageAdmin)
def set_message_status(
    message_id: uuid.UUID,
    payload: MessageStatusInput,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> ContactMessageAdmin:
    message = db.get(ContactMessage, message_id)
    if message is None:
        raise HTTPException(status_code=404, detail="Message not found")

    now = datetime.now(UTC)
    message.status = payload.status
    if payload.status == "read" and message.read_at is None:
        message.read_at = now
    if payload.status == "replied":
        message.read_at = message.read_at or now
        message.replied_at = now
    db.commit()
    db.refresh(message)
    return ContactMessageAdmin.model_validate(message)


@router.delete("/messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_message(
    message_id: uuid.UUID,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> Response:
    message = db.get(ContactMessage, message_id)
    if message is None:
        raise HTTPException(status_code=404, detail="Message not found")
    db.delete(message)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Settings -------------------------------------------------------------


def _settings_payload(db: Session) -> AdminSettingsOut:
    repo = _identity_repo(db)
    site = repo.site_settings()
    profile = profile_admin(repo.profile(), repo.current_resume())
    if site is None or profile is None:
        raise HTTPException(
            status_code=404,
            detail="Settings have not been set up yet.",
        )
    return AdminSettingsOut(
        profile=profile,
        site=SiteSettingsAdminOut.model_validate(site),
        resume=resume_admin(repo.current_resume())
        if repo.current_resume()
        else None,
        email_delivery_configured=settings.email_delivery_configured,
        notification_email=settings.contact_notification_email,
        options={
            "now_categories": [
                {"value": value, "label": NOW_CATEGORY_LABELS[value]}
                for value in NOW_CATEGORIES
            ],
            "timeline_kinds": [
                {"value": value, "label": TIMELINE_KIND_LABELS[value]}
                for value in TIMELINE_KINDS
            ],
        },
    )


@router.get("/settings", response_model=AdminSettingsOut)
def get_settings(
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminSettingsOut:
    return _settings_payload(db)


@router.put("/settings", response_model=AdminSettingsOut)
def put_settings(
    payload: AdminSettingsInput,
    request: Request,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminSettingsOut:
    try:
        identity_admin.update_profile(db, payload.profile)
        identity_admin.update_site_settings(db, payload.site)
    except identity_admin.AdminInputError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    activity.record(
        db,
        "settings_changed",
        user_id=admin.id,
        identifier=admin.email,
        detail="Updated profile and site settings",
        request=request,
    )
    return _settings_payload(db)


# --- Reference data -------------------------------------------------------


@router.get("/content-reference", response_model=ContentReference)
def content_reference(
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> ContentReference:
    projects = db.scalars(
        select(Project).order_by(Project.sort_order, Project.title)
    ).all()
    leadership = db.scalars(
        select(LeadershipEntry).order_by(LeadershipEntry.organization, LeadershipEntry.title)
    ).all()
    experience = db.scalars(
        select(ExperienceEntry).order_by(
            ExperienceEntry.organization, ExperienceEntry.title
        )
    ).all()

    return ContentReference(
        projects=[
            LinkedRecord(
                id=item.id,
                title=item.title,
                subtitle=item.category.name if item.category else None,
                slug=item.slug,
                status=item.status,
            )
            for item in projects
        ],
        leadership=[
            LinkedRecord(
                id=item.id,
                title=item.title,
                subtitle=item.organization,
                slug=item.slug,
                status=item.status,
            )
            for item in leadership
        ],
        experience=[
            LinkedRecord(
                id=item.id,
                title=item.title,
                subtitle=item.organization,
                slug=item.slug,
                status=item.status,
            )
            for item in experience
        ],
        now_categories=[
            {"value": value, "label": NOW_CATEGORY_LABELS[value]}
            for value in NOW_CATEGORIES
        ],
        now_statuses=list(NOW_STATUSES),
        timeline_kinds=[
            {"value": value, "label": TIMELINE_KIND_LABELS[value]}
            for value in TIMELINE_KINDS
        ],
        publish_statuses=list(CONTENT_STATUSES),
        message_statuses=list(MESSAGE_STATUSES),
        inquiry_types=[
            {"value": value, "label": CONTACT_INQUIRY_LABELS[value]}
            for value in CONTACT_INQUIRY_TYPES
        ],
    )
