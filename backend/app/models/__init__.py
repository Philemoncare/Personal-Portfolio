"""Import every model so Alembic and relationship resolution see them."""

from app.models.data import (
    DataInsight,
    DataProject,
    DataProjectCategory,
    DataResource,
    DataTool,
    DataVisualization,
    data_project_tools,
)
from app.models.content import (
    Article,
    Certificate,
    ExperienceEntry,
    LeadershipEntry,
    NowItem,
    Skill,
    SkillGroup,
    TimelineEntry,
)
from app.models.project import (
    CaseStudy,
    Project,
    ProjectCategory,
    ProjectMedia,
    Technology,
    project_technologies,
)
from app.models.settings import ContactMessage, SiteSettings
from app.models.user import AdminSession, AdminUser

__all__ = [
    "AdminSession",
    "AdminUser",
    "Article",
    "CaseStudy",
    "Certificate",
    "ContactMessage",
    "DataInsight",
    "DataProject",
    "DataProjectCategory",
    "DataResource",
    "DataTool",
    "DataVisualization",
    "ExperienceEntry",
    "LeadershipEntry",
    "NowItem",
    "Project",
    "ProjectCategory",
    "ProjectMedia",
    "SiteSettings",
    "Skill",
    "SkillGroup",
    "Technology",
    "TimelineEntry",
    "data_project_tools",
    "project_technologies",
]
