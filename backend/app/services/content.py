from app.models import CaseStudy, Project
from app.repositories.projects import CaseStudyRepository, ProjectRepository
from app.schemas.project import (
    CaseStudyDetail,
    CaseStudySummary,
    ProjectDetail,
    ProjectLink,
    ProjectSummary,
)


class ContentService:
    def __init__(
        self,
        project_repo: ProjectRepository,
        case_study_repo: CaseStudyRepository,
    ) -> None:
        self.projects = project_repo
        self.case_studies = case_study_repo

    def _project_detail(self, project: Project) -> ProjectDetail:
        detail = ProjectDetail.model_validate(project)
        detail.case_study_slug = self.projects.published_case_study_slug(project.id)
        detail.related = [
            ProjectSummary.model_validate(item)
            for item in self.projects.related(project)
        ]
        previous, following = self.projects.neighbours(project)
        detail.previous = (
            ProjectLink(title=previous.title, slug=previous.slug) if previous else None
        )
        detail.next = (
            ProjectLink(title=following.title, slug=following.slug)
            if following
            else None
        )
        return detail

    def project(self, slug: str) -> ProjectDetail | None:
        project = self.projects.get_by_slug(slug)
        if project is None:
            return None
        return self._project_detail(project)

    def preview_project(self, project_id) -> ProjectDetail | None:
        """Authenticated admin preview. Bypasses the published-only filter."""

        project = self.projects.get_by_id(project_id)
        if project is None:
            return None
        return self._project_detail(project)

    def case_study(self, slug: str) -> CaseStudyDetail | None:
        study = self.case_studies.get_by_slug(slug)
        if study is None:
            return None
        detail = CaseStudyDetail.model_validate(study)
        detail.project_slug = study.project.slug if study.project else None
        detail.hidden_sections = list(study.hidden_sections or [])
        return detail


def case_study_summary(study: CaseStudy) -> CaseStudySummary:
    summary = CaseStudySummary.model_validate(study)
    summary.project_slug = study.project.slug if study.project else None
    return summary
