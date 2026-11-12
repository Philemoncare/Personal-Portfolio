"""Administrator endpoints for the Data Lab."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_admin
from app.core.constants import (
    DATA_CHART_TYPES,
    DATA_PROJECT_STATUSES,
    DATA_PROJECT_TYPE_LABELS,
    DATA_PROJECT_TYPES,
    DATA_RESOURCE_TYPES,
)
from app.db.session import get_db
from app.models import (
    AdminUser,
    DataProject,
    DataProjectCategory,
    DataTool,
)
from app.repositories.data_projects import DataProjectRepository
from app.schemas.data import DataCategoryOut, DataProjectDetail, DataProjectSummary, DataToolOut
from app.schemas.data_admin import (
    DataCategoryInput,
    DataProjectAdminOut,
    DataProjectInput,
    DataProjectStatusInput,
    DataReference,
    DataToolInput,
)
from app.services import data_admin

router = APIRouter()


def _load_project_options() -> tuple:
    return (
        selectinload(DataProject.category),
        selectinload(DataProject.tools),
        selectinload(DataProject.visualizations),
        selectinload(DataProject.insights),
        selectinload(DataProject.resources),
    )


def _get_project(db: Session, project_id: uuid.UUID) -> DataProject:
    project = db.scalar(
        select(DataProject)
        .where(DataProject.id == project_id)
        .options(*_load_project_options())
    )
    if project is None:
        raise HTTPException(status_code=404, detail="Data project not found")
    return project


@router.get("/data/reference", response_model=DataReference)
def data_reference(
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> DataReference:
    categories = db.scalars(
        select(DataProjectCategory).order_by(
            DataProjectCategory.sort_order, DataProjectCategory.name
        )
    ).all()
    tools = db.scalars(
        select(DataTool).order_by(DataTool.sort_order, DataTool.name)
    ).all()
    featured_rows, _ = DataProjectRepository(db).list(featured=True, limit=6)
    return DataReference(
        categories=[DataCategoryOut.model_validate(item) for item in categories],
        tools=[DataToolOut.model_validate(item) for item in tools],
        statuses=list(DATA_PROJECT_STATUSES),
        project_types=[
            {"value": value, "label": DATA_PROJECT_TYPE_LABELS[value]}
            for value in DATA_PROJECT_TYPES
        ],
        chart_types=list(DATA_CHART_TYPES),
        resource_types=list(DATA_RESOURCE_TYPES),
        featured=[
            DataProjectSummary.model_validate(item) for item in featured_rows
        ],
    )


@router.post(
    "/data/categories",
    response_model=DataCategoryOut,
    status_code=status.HTTP_201_CREATED,
)
def create_data_category(
    payload: DataCategoryInput,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> DataCategoryOut:
    try:
        category = data_admin.create_category(db, payload)
    except data_admin.AdminInputError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return DataCategoryOut.model_validate(category)


@router.post(
    "/data/tools",
    response_model=DataToolOut,
    status_code=status.HTTP_201_CREATED,
)
def create_data_tool(
    payload: DataToolInput,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> DataToolOut:
    try:
        tool = data_admin.create_tool(db, payload)
    except data_admin.AdminInputError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return DataToolOut.model_validate(tool)


@router.get("/data-projects", response_model=list[DataProjectAdminOut])
def list_data_projects(
    status_filter: str | None = Query(default=None, alias="status"),
    search: str | None = Query(default=None, max_length=120),
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[DataProjectAdminOut]:
    statement = select(DataProject).options(*_load_project_options())
    if status_filter:
        statement = statement.where(DataProject.status == status_filter)
    term = (search or "").strip()
    if term:
        pattern = f"%{term}%"
        statement = statement.where(
            or_(DataProject.title.ilike(pattern), DataProject.slug.ilike(pattern))
        )
    rows = db.scalars(
        statement.order_by(DataProject.sort_order, DataProject.title)
    ).all()
    return [DataProjectAdminOut.model_validate(item) for item in rows]


@router.post(
    "/data-projects",
    response_model=DataProjectAdminOut,
    status_code=status.HTTP_201_CREATED,
)
def create_data_project(
    payload: DataProjectInput,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> DataProjectAdminOut:
    try:
        project = data_admin.create_project(db, payload)
    except data_admin.AdminInputError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return DataProjectAdminOut.model_validate(_get_project(db, project.id))


@router.get("/data-projects/{project_id}", response_model=DataProjectAdminOut)
def get_data_project(
    project_id: uuid.UUID,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> DataProjectAdminOut:
    return DataProjectAdminOut.model_validate(_get_project(db, project_id))


@router.get("/data-projects/{project_id}/preview", response_model=DataProjectDetail)
def preview_data_project(
    project_id: uuid.UUID,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> DataProjectDetail:
    project = DataProjectRepository(db).get_by_id(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Data project not found")
    return DataProjectDetail.model_validate(project)


@router.put("/data-projects/{project_id}", response_model=DataProjectAdminOut)
def update_data_project(
    project_id: uuid.UUID,
    payload: DataProjectInput,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> DataProjectAdminOut:
    project = _get_project(db, project_id)
    try:
        project = data_admin.update_project(db, project, payload)
    except data_admin.AdminInputError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return DataProjectAdminOut.model_validate(_get_project(db, project.id))


@router.patch("/data-projects/{project_id}/status", response_model=DataProjectAdminOut)
def set_data_project_status(
    project_id: uuid.UUID,
    payload: DataProjectStatusInput,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> DataProjectAdminOut:
    project = _get_project(db, project_id)
    data_admin.set_status(db, project, payload.status)
    return DataProjectAdminOut.model_validate(_get_project(db, project_id))


@router.delete("/data-projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_data_project(
    project_id: uuid.UUID,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> Response:
    project = _get_project(db, project_id)
    data_admin.delete_project(db, project)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
