import uuid

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models import CaseStudy, Project, ProjectCategory, Technology


class ProjectRepository:
    """Read-only queries for published project content."""

    def __init__(self, db: Session) -> None:
        self.db = db

    @staticmethod
    def _load_options() -> tuple:
        return (
            selectinload(Project.category),
            selectinload(Project.secondary_categories),
            selectinload(Project.technologies),
            selectinload(Project.media),
        )

    @classmethod
    def _base_statement(cls) -> Select[tuple[Project]]:
        return (
            select(Project)
            .where(Project.status == "published")
            .options(*cls._load_options())
        )

    def list(
        self,
        *,
        category: str | None = None,
        technology: str | None = None,
        project_status: str | None = None,
        mode: str | None = None,
        featured: bool | None = None,
        search: str | None = None,
        include_archived: bool = False,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[Project], int]:
        statement = self._base_statement()

        if not include_archived:
            statement = statement.where(Project.project_status != "archived")

        if category:
            statement = statement.where(
                or_(
                    Project.category.has(ProjectCategory.slug == category),
                    Project.secondary_categories.any(ProjectCategory.slug == category),
                )
            )
        if technology:
            statement = statement.where(
                Project.technologies.any(Technology.slug == technology)
            )
        if project_status:
            statement = statement.where(Project.project_status == project_status)
        if mode:
            statement = statement.where(Project.primary_mode == mode)
        if featured is not None:
            statement = statement.where(Project.featured.is_(featured))

        term = (search or "").strip()
        if term:
            pattern = f"%{term}%"
            statement = statement.where(
                or_(
                    Project.title.ilike(pattern),
                    Project.summary.ilike(pattern),
                    Project.body.ilike(pattern),
                    Project.category.has(ProjectCategory.name.ilike(pattern)),
                    Project.technologies.any(Technology.name.ilike(pattern)),
                    Project.secondary_categories.any(
                        ProjectCategory.name.ilike(pattern)
                    ),
                )
            )

        total = self.db.scalar(
            select(func.count()).select_from(statement.order_by(None).subquery())
        )
        items = self.db.scalars(
            statement.order_by(
                Project.sort_order.asc(),
                Project.published_at.desc(),
                Project.title.asc(),
            )
            .limit(limit)
            .offset(offset)
        ).all()
        return list(items), int(total or 0)

    def get_by_slug(self, slug: str) -> Project | None:
        return self.db.scalar(self._base_statement().where(Project.slug == slug))

    def get_by_id(self, project_id: uuid.UUID) -> Project | None:
        """Admin preview lookup: includes drafts and archived records."""

        return self.db.scalar(
            select(Project)
            .where(Project.id == project_id)
            .options(*self._load_options())
        )

    def published_case_study_slug(self, project_id: uuid.UUID) -> str | None:
        return self.db.scalar(
            select(CaseStudy.slug).where(
                CaseStudy.project_id == project_id,
                CaseStudy.status == "published",
            )
        )

    def related(self, project: Project, limit: int = 3) -> list[Project]:
        conditions = [Project.category_id == project.category_id]
        technology_ids = [item.id for item in project.technologies]
        if technology_ids:
            conditions.append(
                Project.technologies.any(Technology.id.in_(technology_ids))
            )

        statement = (
            self._base_statement()
            .where(Project.id != project.id, Project.project_status != "archived")
            .where(or_(*conditions))
            .order_by(Project.featured.desc(), Project.sort_order.asc())
            .limit(limit)
        )
        return list(self.db.scalars(statement).all())

    def neighbours(
        self, project: Project
    ) -> tuple[Project | None, Project | None]:
        rows = self.db.execute(
            select(Project.id, Project.title, Project.slug)
            .where(Project.status == "published", Project.project_status != "archived")
            .order_by(
                Project.sort_order.asc(),
                Project.published_at.desc(),
                Project.title.asc(),
            )
        ).all()
        ids = [row.id for row in rows]
        if project.id not in ids:
            return None, None
        index = ids.index(project.id)
        previous = rows[index - 1] if index > 0 else None
        following = rows[index + 1] if index < len(rows) - 1 else None
        return previous, following

    def categories(self) -> list[ProjectCategory]:
        return list(
            self.db.scalars(
                select(ProjectCategory)
                .where(
                    or_(
                        ProjectCategory.projects.any(Project.status == "published"),
                        ProjectCategory.secondary_projects.any(
                            Project.status == "published"
                        ),
                    )
                )
                .order_by(ProjectCategory.sort_order)
            ).all()
        )

    def technologies(self) -> list[Technology]:
        return list(
            self.db.scalars(
                select(Technology)
                .where(Technology.projects.any(Project.status == "published"))
                .order_by(Technology.sort_order, Technology.name)
            ).all()
        )


class CaseStudyRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list(
        self, *, featured: bool | None = None, limit: int = 20, offset: int = 0
    ) -> tuple[list[CaseStudy], int]:
        statement = (
            select(CaseStudy)
            .where(CaseStudy.status == "published")
            .options(selectinload(CaseStudy.project))
        )
        if featured is not None:
            statement = statement.where(CaseStudy.featured.is_(featured))

        total = self.db.scalar(
            select(func.count()).select_from(statement.order_by(None).subquery())
        )
        items = self.db.scalars(
            statement.order_by(CaseStudy.sort_order, CaseStudy.published_at.desc())
            .limit(limit)
            .offset(offset)
        ).all()
        return list(items), int(total or 0)

    def get_by_slug(self, slug: str) -> CaseStudy | None:
        return self.db.scalar(
            select(CaseStudy)
            .where(CaseStudy.slug == slug, CaseStudy.status == "published")
            .options(selectinload(CaseStudy.project))
        )
