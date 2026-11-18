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
from app.models.identity import Resume, SiteProfile
from app.models.media import ArkeselWebhookEvent, MediaAsset
from app.models.project import (
    CaseStudy,
    Project,
    ProjectCategory,
    ProjectMedia,
    Technology,
    project_technologies,
)
from app.models.settings import ContactMessage, SiteSettings
from app.models.site import PageContent, SocialLink
from app.models.user import ActivityLog, AdminUser, AuthSession, OtpVerification, SmsLog

__all__ = [
    "ActivityLog",
    "AdminUser",
    "ArkeselWebhookEvent",
    "Article",
    "AuthSession",
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
    "MediaAsset",
    "NowItem",
    "OtpVerification",
    "PageContent",
    "Project",
    "ProjectCategory",
    "ProjectMedia",
    "Resume",
    "SiteProfile",
    "SiteSettings",
    "Skill",
    "SkillGroup",
    "SmsLog",
    "SocialLink",
    "Technology",
    "TimelineEntry",
    "data_project_tools",
    "project_technologies",
]
