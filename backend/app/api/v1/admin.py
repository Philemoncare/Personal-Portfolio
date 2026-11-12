import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_admin
from app.core.constants import (
    CASE_STUDY_RESULT_TYPES,
    CASE_STUDY_SECTIONS,
    CONTENT_STATUSES,
    PROJECT_STAGES,
    WORK_MODES,
)
from app.db.session import get_db
from app.models import (
    AdminUser,
    CaseStudy,
    ContactMessage,
    LeadershipEntry,
    NowItem,
    Project,
    ProjectCategory,
    Technology,
)
from app.repositories.projects import CaseStudyRepository, ProjectRepository
from app.schemas.admin import (
    AdminOverview,
    AdminRecentMessage,
    AdminRecentProject,
    AdminReference,
    CaseStudyAdminOut,
    CaseStudyInput,
    ProjectAdminOut,
    ProjectInput,
    ProjectReorderInput,
    ProjectStatusInput,
)
from app.schemas.project import ProjectCategoryOut, ProjectDetail, TechnologyOut
from app.services import project_admin
from app.services.content import ContentService

router = APIRouter()

MODE_LABELS = {
    "build": "Build",
    "data": "Data",
    "lead": "Lead",
    "explore": "Explore",
}

SECTION_LABELS = {
    "overview": "Overview",
    "problem": "Problem",
    "context": "Context",
    "goals": "Goals",
    "idea": "The idea",
    "research": "Research",
    "planning": "Planning",
    "design": "Design",
    "solution": "Solution",
    "role": "My role",
    "architecture": "Architecture",
    "technology": "Technology",
    "key_features": "Key features",
    "technical_decisions": "Technical decisions",
    "challenges": "Challenges",
    "implementation": "Implementation",
    "testing": "Testing",
    "results": "Results",
    "lessons": "Lessons learned",
    "future_improvements": "Future improvements",
}


def _get_project(db: Session, project_id: uuid.UUID) -> Project:
    project = db.scalar(
        select(Project)
        .where(Project.id == project_id)
        .options(
            selectinload(Project.category),
            selectinload(Project.secondary_categories),
            selectinload(Project.technologies),
            selectinload(Project.media),
        )
    )
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def _get_case_study(db: Session, study_id: uuid.UUID) -> CaseStudy:
    study = db.get(CaseStudy, study_id)
    if study is None:
        raise HTTPException(status_code=404, detail="Case study not found")
    return study


@router.get("/overview", response_model=AdminOverview)
def overview(
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminOverview:
    status_rows = db.execute(
        select(Project.status, func.count(Project.id)).group_by(Project.status)
    ).all()
    counts = {status: 0 for status in CONTENT_STATUSES}
    counts.update({str(status): int(count) for status, count in status_rows})

    recent_project_rows = db.scalars(
        select(Project).order_by(Project.updated_at.desc()).limit(5)
    ).all()
    recent_message_rows = db.scalars(
        select(ContactMessage).order_by(ContactMessage.created_at.desc()).limit(5)
    ).all()

    return AdminOverview(
        admin=admin,
        project_counts=counts,
        published_projects=counts.get("published", 0),
        featured_projects=int(
            db.scalar(
                select(func.count(Project.id)).where(Project.featured.is_(True))
            )
            or 0
        ),
        placeholder_projects=int(
            db.scalar(
                select(func.count(Project.id)).where(Project.is_placeholder.is_(True))
            )
            or 0
        ),
        unread_messages=int(
            db.scalar(
                select(func.count(ContactMessage.id)).where(
                    ContactMessage.status == "new"
                )
            )
            or 0
        ),
        total_messages=int(
            db.scalar(select(func.count(ContactMessage.id))) or 0
        ),
        leadership_entries=int(
            db.scalar(select(func.count(LeadershipEntry.id))) or 0
        ),
        now_items=int(db.scalar(select(func.count(NowItem.id))) or 0),
        case_studies=int(db.scalar(select(func.count(CaseStudy.id))) or 0),
        recent_projects=[
            AdminRecentProject.model_validate(item) for item in recent_project_rows
        ],
        recent_messages=[
            AdminRecentMessage.model_validate(item) for item in recent_message_rows
        ],
    )


# --- Reference data -------------------------------------------------------


@router.get("/reference", response_model=AdminReference)
def reference(
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminReference:
    categories = db.scalars(
        select(ProjectCategory).order_by(ProjectCategory.sort_order)
    ).all()
    technologies = db.scalars(
        select(Technology).order_by(Technology.sort_order, Technology.name)
    ).all()
    return AdminReference(
        categories=[ProjectCategoryOut.model_validate(item) for item in categories],
        technologies=[TechnologyOut.model_validate(item) for item in technologies],
        statuses=list(CONTENT_STATUSES),
        stages=list(PROJECT_STAGES),
        modes=[{"value": mode, "label": MODE_LABELS[mode]} for mode in WORK_MODES],
        case_study_sections=[
            {"value": key, "label": SECTION_LABELS.get(key, key.title())}
            for key in CASE_STUDY_SECTIONS
        ],
        result_types=list(CASE_STUDY_RESULT_TYPES),
    )


# --- Projects -------------------------------------------------------------


@router.get("/projects", response_model=list[ProjectAdminOut])
def list_projects(
    status_filter: str | None = Query(default=None, alias="status"),
    search: str | None = Query(default=None, max_length=120),
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[ProjectAdminOut]:
    statement = select(Project).options(
        selectinload(Project.category),
        selectinload(Project.secondary_categories),
        selectinload(Project.technologies),
        selectinload(Project.media),
    )
    if status_filter:
        statement = statement.where(Project.status == status_filter)
    term = (search or "").strip()
    if term:
        pattern = f"%{term}%"
        statement = statement.where(
            or_(Project.title.ilike(pattern), Project.slug.ilike(pattern))
        )
    rows = db.scalars(
        statement.order_by(Project.sort_order, Project.title)
    ).all()
    return [ProjectAdminOut.model_validate(item) for item in rows]


@router.post("/projects/reorder", response_model=dict[str, int])
def reorder_projects(
    payload: ProjectReorderInput,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> dict[str, int]:
    updated = project_admin.reorder_projects(db, payload.ids)
    return {"updated": updated}


@router.post(
    "/projects",
    response_model=ProjectAdminOut,
    status_code=status.HTTP_201_CREATED,
)
def create_project(
    payload: ProjectInput,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> ProjectAdminOut:
    try:
        project = project_admin.create_project(db, payload)
    except project_admin.AdminInputError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ProjectAdminOut.model_validate(_get_project(db, project.id))


@router.get("/projects/{project_id}", response_model=ProjectAdminOut)
def get_project(
    project_id: uuid.UUID,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> ProjectAdminOut:
    return ProjectAdminOut.model_validate(_get_project(db, project_id))


@router.get("/projects/{project_id}/preview", response_model=ProjectDetail)
def preview_project(
    project_id: uuid.UUID,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> ProjectDetail:
    """Render-ready project payload for drafts and archived records."""

    detail = ContentService(
        ProjectRepository(db), CaseStudyRepository(db)
    ).preview_project(project_id)
    if detail is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return detail


@router.put("/projects/{project_id}", response_model=ProjectAdminOut)
def update_project(
    project_id: uuid.UUID,
    payload: ProjectInput,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> ProjectAdminOut:
    project = _get_project(db, project_id)
    try:
        project = project_admin.update_project(db, project, payload)
    except project_admin.AdminInputError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ProjectAdminOut.model_validate(_get_project(db, project.id))


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: uuid.UUID,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> Response:
    project = _get_project(db, project_id)
    project_admin.delete_project(db, project)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/projects/{project_id}/duplicate",
    response_model=ProjectAdminOut,
    status_code=status.HTTP_201_CREATED,
)
def duplicate_project(
    project_id: uuid.UUID,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> ProjectAdminOut:
    project = _get_project(db, project_id)
    copy = project_admin.duplicate_project(db, project)
    return ProjectAdminOut.model_validate(_get_project(db, copy.id))


@router.patch("/projects/{project_id}/status", response_model=ProjectAdminOut)
def set_project_status(
    project_id: uuid.UUID,
    payload: ProjectStatusInput,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> ProjectAdminOut:
    project = _get_project(db, project_id)
    project_admin.set_publish_status(db, project, payload.status)
    return ProjectAdminOut.model_validate(_get_project(db, project_id))


# --- Case studies ---------------------------------------------------------


@router.get("/case-studies", response_model=list[CaseStudyAdminOut])
def list_case_studies(
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[CaseStudyAdminOut]:
    rows = db.scalars(
        select(CaseStudy).order_by(CaseStudy.sort_order, CaseStudy.title)
    ).all()
    return [CaseStudyAdminOut.model_validate(item) for item in rows]


@router.post(
    "/case-studies",
    response_model=CaseStudyAdminOut,
    status_code=status.HTTP_201_CREATED,
)
def create_case_study(
    payload: CaseStudyInput,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> CaseStudyAdminOut:
    try:
        study = project_admin.create_case_study(db, payload)
    except project_admin.AdminInputError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return CaseStudyAdminOut.model_validate(_get_case_study(db, study.id))


@router.get("/case-studies/{study_id}", response_model=CaseStudyAdminOut)
def get_case_study(
    study_id: uuid.UUID,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> CaseStudyAdminOut:
    return CaseStudyAdminOut.model_validate(_get_case_study(db, study_id))


@router.put("/case-studies/{study_id}", response_model=CaseStudyAdminOut)
def update_case_study(
    study_id: uuid.UUID,
    payload: CaseStudyInput,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> CaseStudyAdminOut:
    study = _get_case_study(db, study_id)
    try:
        study = project_admin.update_case_study(db, study, payload)
    except project_admin.AdminInputError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return CaseStudyAdminOut.model_validate(_get_case_study(db, study.id))


@router.delete("/case-studies/{study_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_case_study(
    study_id: uuid.UUID,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> Response:
    study = _get_case_study(db, study_id)
    project_admin.delete_case_study(db, study)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
