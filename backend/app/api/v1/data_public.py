"""Public Data Lab endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.repositories.data_projects import DataProjectRepository
from app.schemas.common import ListResponse
from app.schemas.data import (
    DataCategoryOut,
    DataProjectDetail,
    DataProjectSummary,
    DataToolOut,
)

router = APIRouter()


@router.get("/data-projects/featured", response_model=ListResponse[DataProjectSummary])
def list_featured_data_projects(
    limit: int = Query(default=4, ge=1, le=12),
    db: Session = Depends(get_db),
) -> ListResponse[DataProjectSummary]:
    items, total = DataProjectRepository(db).list(featured=True, limit=limit)
    return ListResponse(
        items=[DataProjectSummary.model_validate(item) for item in items],
        total=total,
        limit=limit,
        offset=0,
    )


@router.get("/data-projects/categories", response_model=list[DataCategoryOut])
def list_data_categories(db: Session = Depends(get_db)) -> list[DataCategoryOut]:
    return [
        DataCategoryOut.model_validate(item)
        for item in DataProjectRepository(db).categories()
    ]


@router.get("/data-projects/tools", response_model=list[DataToolOut])
def list_data_tools(db: Session = Depends(get_db)) -> list[DataToolOut]:
    return [
        DataToolOut.model_validate(item)
        for item in DataProjectRepository(db).tools()
    ]


@router.get("/data-projects", response_model=ListResponse[DataProjectSummary])
def list_data_projects(
    category: str | None = None,
    tool: str | None = None,
    project_type: str | None = Query(
        default=None,
        pattern=(
            "^(eda|sql|excel|dashboard|bi|statistical|cleaning|research|"
            "visualization)$"
        ),
    ),
    featured: bool | None = None,
    search: str | None = Query(default=None, max_length=120),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> ListResponse[DataProjectSummary]:
    items, total = DataProjectRepository(db).list(
        category=category,
        tool=tool,
        project_type=project_type,
        featured=featured,
        search=search,
        limit=limit,
        offset=offset,
    )
    return ListResponse(
        items=[DataProjectSummary.model_validate(item) for item in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/data-projects/{slug}", response_model=DataProjectDetail)
def get_data_project(slug: str, db: Session = Depends(get_db)) -> DataProjectDetail:
    project = DataProjectRepository(db).get_by_slug(slug)
    if project is None:
        raise HTTPException(status_code=404, detail="Data project not found")
    return DataProjectDetail.model_validate(project)
