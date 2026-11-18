from datetime import UTC, datetime
from urllib.parse import quote
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session

from app.api.deps import get_client_key
from app.core.config import settings
from app.db.session import get_db
from app.repositories.content import ContentRepository
from app.repositories.data_projects import DataProjectRepository
from app.repositories.identity import IdentityRepository
from app.repositories.projects import CaseStudyRepository, ProjectRepository
from app.schemas.common import ListResponse
from app.schemas.contact import ContactCreate, ContactReceipt
from app.schemas.content import (
    ArticleDetail,
    ArticleSummary,
    CertificateOut,
    ExperienceOut,
    LeadershipOut,
    SkillGroupOut,
)
from app.schemas.identity import (
    NowOut,
    ProfilePublic,
    ResumePublic,
    SearchIndexEntry,
    SearchIndexOut,
    SiteSettingsPublic,
    TimelineOut,
)
from app.schemas.site import PageContentOut, SocialLinkOut
from app.schemas.project import (
    CaseStudyDetail,
    CaseStudySummary,
    ProjectCategoryOut,
    ProjectDetail,
    ProjectSummary,
    TechnologyOut,
)
from app.services import contact as contact_service
from app.services.content import ContentService, case_study_summary
from app.services.identity import (
    now_public,
    profile_public,
    resume_download_url,
    resume_public,
    settings_public,
    timeline_public,
)
from app.services.resume_files import resume_file_path
from app.services.site_content import (
    get_public_page,
    list_social_links,
    public_pages,
)

router = APIRouter()


def content_service(db: Session) -> ContentService:
    return ContentService(ProjectRepository(db), CaseStudyRepository(db))


# --- Projects -------------------------------------------------------------


@router.get("/projects", response_model=ListResponse[ProjectSummary])
def list_projects(
    category: str | None = None,
    technology: str | None = None,
    project_status: str | None = Query(
        default=None,
        alias="status",
        pattern="^(in_progress|active|completed|archived|experiment)$",
    ),
    mode: str | None = Query(default=None, pattern="^(build|data|lead|explore)$"),
    featured: bool | None = None,
    search: str | None = Query(default=None, max_length=120),
    include_archived: bool = False,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> ListResponse[ProjectSummary]:
    repo = ProjectRepository(db)
    items, total = repo.list(
        category=category,
        technology=technology,
        project_status=project_status,
        mode=mode,
        featured=featured,
        search=search,
        include_archived=include_archived,
        limit=limit,
        offset=offset,
    )
    return ListResponse(
        items=[ProjectSummary.model_validate(item) for item in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/projects/featured", response_model=ListResponse[ProjectSummary])
def list_featured_projects(
    limit: int = Query(default=6, ge=1, le=24),
    db: Session = Depends(get_db),
) -> ListResponse[ProjectSummary]:
    items, total = ProjectRepository(db).list(featured=True, limit=limit)
    return ListResponse(
        items=[ProjectSummary.model_validate(item) for item in items],
        total=total,
        limit=limit,
        offset=0,
    )


@router.get("/projects/categories", response_model=list[ProjectCategoryOut])
def list_project_categories_alias(
    db: Session = Depends(get_db),
) -> list[ProjectCategoryOut]:
    return [
        ProjectCategoryOut.model_validate(item)
        for item in ProjectRepository(db).categories()
    ]


@router.get("/projects/technologies", response_model=list[TechnologyOut])
def list_project_technologies_alias(
    db: Session = Depends(get_db),
) -> list[TechnologyOut]:
    return [
        TechnologyOut.model_validate(item)
        for item in ProjectRepository(db).technologies()
    ]


@router.get("/project-categories", response_model=list[ProjectCategoryOut])
def list_project_categories(db: Session = Depends(get_db)) -> list[ProjectCategoryOut]:
    return [
        ProjectCategoryOut.model_validate(item)
        for item in ProjectRepository(db).categories()
    ]


@router.get("/technologies", response_model=list[TechnologyOut])
def list_technologies(db: Session = Depends(get_db)) -> list[TechnologyOut]:
    return [
        TechnologyOut.model_validate(item)
        for item in ProjectRepository(db).technologies()
    ]


@router.get("/projects/{slug}", response_model=ProjectDetail)
def get_project(slug: str, db: Session = Depends(get_db)) -> ProjectDetail:
    project = content_service(db).project(slug)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


# --- Case studies ---------------------------------------------------------


@router.get("/case-studies", response_model=ListResponse[CaseStudySummary])
def list_case_studies(
    featured: bool | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> ListResponse[CaseStudySummary]:
    repo = CaseStudyRepository(db)
    items, total = repo.list(featured=featured, limit=limit, offset=offset)
    return ListResponse(
        items=[case_study_summary(item) for item in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/case-studies/{slug}", response_model=CaseStudyDetail)
def get_case_study(slug: str, db: Session = Depends(get_db)) -> CaseStudyDetail:
    study = content_service(db).case_study(slug)
    if study is None:
        raise HTTPException(status_code=404, detail="Case study not found")
    return study


# --- Profile content ------------------------------------------------------


@router.get("/experience", response_model=list[ExperienceOut])
def list_experience(db: Session = Depends(get_db)) -> list[ExperienceOut]:
    return [
        ExperienceOut.model_validate(item)
        for item in ContentRepository(db).experience()
    ]


@router.get("/experience/{slug}", response_model=ExperienceOut)
def get_experience(slug: str, db: Session = Depends(get_db)) -> ExperienceOut:
    entry = IdentityRepository(db).experience_by_slug(slug)
    if entry is None:
        raise HTTPException(status_code=404, detail="Experience entry not found")
    return ExperienceOut.model_validate(entry)


@router.get("/leadership", response_model=list[LeadershipOut])
def list_leadership(db: Session = Depends(get_db)) -> list[LeadershipOut]:
    return [
        LeadershipOut.model_validate(item)
        for item in ContentRepository(db).leadership()
    ]


@router.get("/leadership/{slug}", response_model=LeadershipOut)
def get_leadership(slug: str, db: Session = Depends(get_db)) -> LeadershipOut:
    entry = IdentityRepository(db).leadership_by_slug(slug)
    if entry is None:
        raise HTTPException(status_code=404, detail="Leadership entry not found")
    return LeadershipOut.model_validate(entry)


@router.get("/skills", response_model=list[SkillGroupOut])
def list_skills(db: Session = Depends(get_db)) -> list[SkillGroupOut]:
    groups = ContentRepository(db).skill_groups()
    return [SkillGroupOut.model_validate(group) for group in groups]


@router.get("/certificates", response_model=list[CertificateOut])
def list_certificates(db: Session = Depends(get_db)) -> list[CertificateOut]:
    return [
        CertificateOut.model_validate(item)
        for item in ContentRepository(db).certificates()
    ]


@router.get("/articles", response_model=list[ArticleSummary])
def list_articles(db: Session = Depends(get_db)) -> list[ArticleSummary]:
    return [
        ArticleSummary.model_validate(item)
        for item in ContentRepository(db).articles()
    ]


@router.get("/articles/{slug}", response_model=ArticleDetail)
def get_article(slug: str, db: Session = Depends(get_db)) -> ArticleDetail:
    article = ContentRepository(db).article_by_slug(slug)
    if article is None:
        raise HTTPException(status_code=404, detail="Article not found")
    return ArticleDetail.model_validate(article)


# --- Identity -------------------------------------------------------------


@router.get("/profile", response_model=ProfilePublic)
def get_profile(db: Session = Depends(get_db)) -> ProfilePublic:
    repo = IdentityRepository(db)
    profile = profile_public(repo.profile(), repo.current_resume())
    if profile is None:
        raise HTTPException(
            status_code=404,
            detail="Profile is not configured yet.",
        )
    return profile


@router.get("/timeline", response_model=list[TimelineOut])
def list_timeline(
    kind: str | None = Query(default=None, max_length=40),
    db: Session = Depends(get_db),
) -> list[TimelineOut]:
    return [timeline_public(item) for item in IdentityRepository(db).timeline(kind)]


@router.get("/timeline/{slug}", response_model=TimelineOut)
def get_timeline_entry(slug: str, db: Session = Depends(get_db)) -> TimelineOut:
    entry = IdentityRepository(db).timeline_by_slug(slug)
    if entry is None:
        raise HTTPException(status_code=404, detail="Timeline entry not found")
    return timeline_public(entry)


@router.get("/now", response_model=list[NowOut])
def list_now(
    category: str | None = Query(default=None, max_length=40),
    db: Session = Depends(get_db),
) -> list[NowOut]:
    return [now_public(item) for item in IdentityRepository(db).now_items(category)]


@router.get("/now/active", response_model=list[NowOut])
def list_now_active(db: Session = Depends(get_db)) -> list[NowOut]:
    return [now_public(item) for item in IdentityRepository(db).now_items()]


# --- Resume ---------------------------------------------------------------


@router.get("/resume", response_model=list[ResumePublic])
def list_resumes(db: Session = Depends(get_db)) -> list[ResumePublic]:
    repo = IdentityRepository(db)
    return [
        resume_public(item)
        for item in repo.resumes()
        if item.status == "published"
    ]


@router.get("/resume/current", response_model=ResumePublic)
def get_current_resume(db: Session = Depends(get_db)) -> ResumePublic:
    resume = IdentityRepository(db).current_resume()
    if resume is None:
        raise HTTPException(status_code=404, detail="No resume is published yet.")
    return resume_public(resume)


@router.get("/resume/{resume_id}/download")
def download_resume(resume_id: UUID, db: Session = Depends(get_db)) -> FileResponse:
    resume = IdentityRepository(db).resume(resume_id)
    if resume is None or resume.status != "published":
        raise HTTPException(status_code=404, detail="Resume not found")
    path = resume_file_path(resume.storage_path)
    if path is None:
        raise HTTPException(status_code=404, detail="Resume file is unavailable")

    resume.download_count = resume.download_count + 1
    db.commit()

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


@router.get("/site-settings/public", response_model=SiteSettingsPublic)
def get_public_settings(db: Session = Depends(get_db)) -> SiteSettingsPublic:
    repo = IdentityRepository(db)
    payload = settings_public(
        repo.site_settings(),
        repo.profile(),
        repo.current_resume(),
        list_social_links(db),
    )
    if payload is None:
        raise HTTPException(
            status_code=404,
            detail="Site settings are not configured. Run the seed command.",
        )
    return payload


# --- Social links and editable page content -------------------------------


@router.get("/social-links", response_model=list[SocialLinkOut])
def get_social_links(db: Session = Depends(get_db)) -> list[SocialLinkOut]:
    return [
        SocialLinkOut.model_validate(item) for item in list_social_links(db)
    ]


@router.get("/pages", response_model=list[PageContentOut])
def get_pages(db: Session = Depends(get_db)) -> list[PageContentOut]:
    return [PageContentOut.model_validate(item) for item in public_pages(db)]


@router.get("/pages/{page_key}", response_model=PageContentOut)
def get_page(page_key: str, db: Session = Depends(get_db)) -> PageContentOut:
    page = get_public_page(db, page_key)
    if page is None:
        raise HTTPException(status_code=404, detail="Page content not found")
    return PageContentOut.model_validate(page)


# --- Search preparation ---------------------------------------------------


@router.get("/search-index", response_model=SearchIndexOut)
def search_index(db: Session = Depends(get_db)) -> SearchIndexOut:
    """A lightweight, published-only index for a future unified search UI.

    The endpoint exists so search metadata has one reusable shape. It is not
    called by public pages and does not run a search engine.
    """

    entries: list[SearchIndexEntry] = []

    projects, _ = ProjectRepository(db).list(limit=100)
    for project in projects:
        entries.append(
            SearchIndexEntry(
                kind="project",
                title=project.title,
                slug=project.slug,
                description=project.summary,
                category=project.category.name if project.category else None,
                url=f"/work/{project.slug}",
                updated_at=project.updated_at,
            )
        )

    data_projects, _ = DataProjectRepository(db).list(limit=100)
    for project in data_projects:
        entries.append(
            SearchIndexEntry(
                kind="data_project",
                title=project.title,
                slug=project.slug,
                description=project.short_description,
                category=project.category.name if project.category else None,
                url=f"/data-lab/{project.slug}",
                updated_at=project.updated_at,
            )
        )

    content = ContentRepository(db)
    for entry in content.leadership():
        if not entry.slug:
            continue
        entries.append(
            SearchIndexEntry(
                kind="leadership",
                title=entry.title,
                slug=entry.slug,
                description=entry.description,
                category="Leadership",
                url=f"/leadership/{entry.slug}",
                updated_at=entry.updated_at,
            )
        )
    for entry in content.experience():
        if not entry.slug:
            continue
        entries.append(
            SearchIndexEntry(
                kind="experience",
                title=entry.title,
                slug=entry.slug,
                description=entry.description,
                category="Experience",
                url=f"/experience/{entry.slug}",
                updated_at=entry.updated_at,
            )
        )
    for entry in IdentityRepository(db).timeline():
        if not entry.slug:
            continue
        entries.append(
            SearchIndexEntry(
                kind="timeline",
                title=entry.title,
                slug=entry.slug,
                description=entry.summary or entry.description,
                category=entry.kind,
                url=f"/timeline#{entry.slug}",
                updated_at=entry.updated_at,
            )
        )
    for article in content.articles():
        entries.append(
            SearchIndexEntry(
                kind="article",
                title=article.title,
                slug=article.slug,
                description=article.excerpt,
                category="Article",
                url=f"/articles/{article.slug}",
                updated_at=article.updated_at,
            )
        )

    return SearchIndexOut(
        entries=entries,
        generated_at=datetime.now(UTC),
        note=(
            "Published-only search metadata. A unified search UI is not "
            "implemented yet; this endpoint exists so it can be added without "
            "duplicating content indexes."
        ),
    )


# --- Contact --------------------------------------------------------------


@router.post("/contact", response_model=ContactReceipt, status_code=201)
def submit_contact(
    payload: ContactCreate,
    request: Request,
    db: Session = Depends(get_db),
) -> ContactReceipt:
    try:
        message = contact_service.submit_message(
            db, payload, get_client_key(request)
        )
    except contact_service.ContactRateLimited as exc:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"detail": "Too many messages. Please try again later."},
            headers={"Retry-After": str(exc.retry_after)},
        )
    return ContactReceipt(
        status="received",
        message="Message received. Thanks for reaching out.",
        stored=True,
        email_delivery=(
            "configured" if settings.email_delivery_configured else "not_configured"
        ),
    )
