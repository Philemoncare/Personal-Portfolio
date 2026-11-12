from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.api.deps import get_client_key, get_current_admin
from app.core.config import settings
from app.core.rate_limit import SlidingWindowLimiter
from app.db.session import get_db
from app.repositories.content import ContentRepository
from app.repositories.projects import CaseStudyRepository, ProjectRepository
from app.models import AdminUser
from app.schemas.auth import AdminOut, LoginRequest
from app.schemas.common import ListResponse, MessageResponse
from app.schemas.contact import ContactCreate, ContactReceipt
from app.schemas.content import (
    ArticleDetail,
    ArticleSummary,
    CertificateOut,
    ExperienceOut,
    LeadershipOut,
    NowOut,
    SiteSettingsPublic,
    SkillGroupOut,
    TimelineOut,
)
from app.schemas.project import (
    CaseStudyDetail,
    CaseStudySummary,
    ProjectCategoryOut,
    ProjectDetail,
    ProjectSummary,
    TechnologyOut,
)
from app.services import auth as auth_service
from app.services import contact as contact_service
from app.services.content import ContentService, case_study_summary

router = APIRouter()

login_limiter = SlidingWindowLimiter(
    limit=settings.login_rate_limit_per_15_minutes, window_seconds=900
)


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


@router.get("/leadership", response_model=list[LeadershipOut])
def list_leadership(db: Session = Depends(get_db)) -> list[LeadershipOut]:
    return [
        LeadershipOut.model_validate(item)
        for item in ContentRepository(db).leadership()
    ]


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


@router.get("/timeline", response_model=list[TimelineOut])
def list_timeline(db: Session = Depends(get_db)) -> list[TimelineOut]:
    return [
        TimelineOut.model_validate(item)
        for item in ContentRepository(db).timeline()
    ]


@router.get("/now", response_model=list[NowOut])
def list_now(db: Session = Depends(get_db)) -> list[NowOut]:
    return [
        NowOut.model_validate(item) for item in ContentRepository(db).now_items()
    ]


@router.get("/site-settings/public", response_model=SiteSettingsPublic)
def get_public_settings(db: Session = Depends(get_db)) -> SiteSettingsPublic:
    settings_row = ContentRepository(db).site_settings()
    if settings_row is None:
        raise HTTPException(
            status_code=404,
            detail="Site settings are not configured. Run the seed command.",
        )
    return SiteSettingsPublic.model_validate(settings_row)


# --- Contact --------------------------------------------------------------


@router.post("/contact", response_model=ContactReceipt, status_code=201)
def submit_contact(
    payload: ContactCreate,
    request: Request,
    db: Session = Depends(get_db),
) -> ContactReceipt:
    try:
        contact_service.submit_message(db, payload, get_client_key(request))
    except contact_service.ContactRateLimited as exc:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"detail": "Too many messages. Please try again later."},
            headers={"Retry-After": str(exc.retry_after)},
        )
    return ContactReceipt(
        status="received",
        message="Thank you. Your message has been received.",
    )


# --- Auth ----------------------------------------------------------------


@router.post("/auth/login", response_model=None)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    allowed, retry_after = login_limiter.hit(get_client_key(request))
    if not allowed:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"detail": "Too many login attempts. Try again later."},
            headers={"Retry-After": str(retry_after)},
        )

    try:
        user = auth_service.authenticate(db, payload.email, payload.password)
    except auth_service.AuthError:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token, _ = auth_service.create_session(db, user)
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=settings.session_ttl_hours * 3600,
        path="/",
    )
    return {"email": user.email, "last_login_at": user.last_login_at}


@router.post("/auth/logout", response_model=MessageResponse)
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> MessageResponse:
    token = request.cookies.get(settings.session_cookie_name)
    if token:
        auth_service.revoke_session(db, token)
    response.delete_cookie(settings.session_cookie_name, path="/")
    return MessageResponse(message="Signed out")


@router.get("/auth/me", response_model=AdminOut)
def me(admin: AdminUser = Depends(get_current_admin)) -> AdminOut:
    return AdminOut.model_validate(admin)
