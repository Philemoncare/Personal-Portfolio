"""Read queries for Data Lab content."""

import uuid

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models import DataProject, DataProjectCategory, DataTool


class DataProjectRepository:
    """Public queries always constrain the result to published projects."""

    def __init__(self, db: Session) -> None:
        self.db = db

    @staticmethod
    def _load_options() -> tuple:
        return (
            selectinload(DataProject.category),
            selectinload(DataProject.tools),
            selectinload(DataProject.visualizations),
            selectinload(DataProject.insights),
            selectinload(DataProject.resources),
        )

    @classmethod
    def _base_statement(cls) -> Select[tuple[DataProject]]:
        return (
            select(DataProject)
            .where(DataProject.status == "published")
            .options(*cls._load_options())
        )

    def list(
        self,
        *,
        category: str | None = None,
        tool: str | None = None,
        project_type: str | None = None,
        featured: bool | None = None,
        search: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[DataProject], int]:
        statement = self._base_statement()

        if category:
            statement = statement.where(
                DataProject.category.has(DataProjectCategory.slug == category)
            )
        if tool:
            statement = statement.where(DataProject.tools.any(DataTool.slug == tool))
        if project_type:
            statement = statement.where(DataProject.project_type == project_type)
        if featured is not None:
            statement = statement.where(DataProject.featured.is_(featured))

        term = (search or "").strip()
        if term:
            pattern = f"%{term}%"
            statement = statement.where(
                or_(
                    DataProject.title.ilike(pattern),
                    DataProject.short_description.ilike(pattern),
                    DataProject.description.ilike(pattern),
                    DataProject.keywords.ilike(pattern),
                    DataProject.question.ilike(pattern),
                    DataProject.category.has(DataProjectCategory.name.ilike(pattern)),
                    DataProject.tools.any(DataTool.name.ilike(pattern)),
                )
            )

        total = self.db.scalar(
            select(func.count()).select_from(statement.order_by(None).subquery())
        )
        items = self.db.scalars(
            statement.order_by(
                DataProject.sort_order.asc(),
                DataProject.published_at.desc(),
                DataProject.title.asc(),
            )
            .limit(limit)
            .offset(offset)
        ).all()
        return list(items), int(total or 0)

    def get_by_slug(self, slug: str) -> DataProject | None:
        return self.db.scalar(self._base_statement().where(DataProject.slug == slug))

    def get_by_id(self, project_id: uuid.UUID) -> DataProject | None:
        """Admin and preview lookup; includes every status."""

        return self.db.scalar(
            select(DataProject)
            .where(DataProject.id == project_id)
            .options(*self._load_options())
        )

    def categories(self) -> list[DataProjectCategory]:
        return list(
            self.db.scalars(
                select(DataProjectCategory)
                .where(
                    DataProjectCategory.projects.any(
                        DataProject.status == "published"
                    )
                )
                .order_by(DataProjectCategory.sort_order, DataProjectCategory.name)
            ).all()
        )

    def tools(self) -> list[DataTool]:
        return list(
            self.db.scalars(
                select(DataTool)
                .where(DataTool.projects.any(DataProject.status == "published"))
                .order_by(DataTool.sort_order, DataTool.name)
            ).all()
        )
