"""Shared constants for constrained text columns."""

CONTENT_STATUSES = ("draft", "published", "archived")
DATA_PROJECT_STATUSES = ("draft", "published", "archived", "experiment")
DATA_PROJECT_TYPES = (
    "eda",
    "sql",
    "excel",
    "dashboard",
    "bi",
    "statistical",
    "cleaning",
    "research",
    "visualization",
)
DATA_CHART_TYPES = (
    "bar",
    "line",
    "area",
    "pie",
    "donut",
    "scatter",
    "histogram",
    "heatmap",
    "table",
    "kpi",
)
DATA_RESOURCE_TYPES = (
    "dataset",
    "notebook",
    "sql",
    "excel",
    "pdf",
    "dashboard",
    "github",
    "external",
)
DATA_PROJECT_TYPE_LABELS = {
    "eda": "Exploratory Data Analysis",
    "sql": "SQL Analysis",
    "excel": "Excel Analysis",
    "dashboard": "Dashboard",
    "bi": "Business Intelligence",
    "statistical": "Statistical Analysis",
    "cleaning": "Data Cleaning",
    "research": "Research",
    "visualization": "Visualization",
}
WORK_MODES = ("build", "data", "lead", "explore")
MESSAGE_STATUSES = ("new", "read", "replied", "archived", "spam")
PROJECT_MEDIA_TYPES = ("image", "diagram", "video")
TIMELINE_KINDS = (
    "education",
    "project",
    "experience",
    "leadership",
    "certification",
    "community",
    "technical",
    "milestone",
    "other",
)
TIMELINE_KIND_LABELS = {
    "education": "Education",
    "project": "Project",
    "experience": "Experience",
    "leadership": "Leadership",
    "certification": "Certification",
    "community": "Community",
    "technical": "Technical",
    "milestone": "Milestone",
    "other": "Other",
}
NOW_CATEGORIES = (
    "building",
    "learning",
    "exploring",
    "leading",
    "reading",
    "experimenting",
    "other",
)
NOW_CATEGORY_LABELS = {
    "building": "Building",
    "learning": "Learning",
    "exploring": "Exploring",
    "leading": "Leading",
    "reading": "Reading",
    "experimenting": "Experimenting",
    "other": "Other",
}
NOW_STATUSES = ("active", "ongoing", "paused", "completed")
CONTACT_INQUIRY_TYPES = (
    "project_collaboration",
    "data_analytics",
    "development",
    "technology_community",
    "speaking_workshops",
    "general",
)
CONTACT_INQUIRY_LABELS = {
    "project_collaboration": "Project collaboration",
    "data_analytics": "Data / analytics",
    "development": "Development",
    "technology_community": "Technology / community",
    "speaking_workshops": "Speaking / workshops",
    "general": "General inquiry",
}
RESUME_STATUSES = CONTENT_STATUSES
PROJECT_STAGES = ("in_progress", "active", "completed", "archived", "experiment")
CASE_STUDY_SECTIONS = (
    "overview",
    "problem",
    "context",
    "goals",
    "idea",
    "research",
    "planning",
    "design",
    "solution",
    "role",
    "architecture",
    "technology",
    "key_features",
    "technical_decisions",
    "challenges",
    "implementation",
    "testing",
    "results",
    "lessons",
    "future_improvements",
)
CASE_STUDY_RESULT_TYPES = (
    "text",
    "metric",
    "achievement",
    "technical",
    "qualitative",
)
DEPLOYMENT_STATUSES = (
    "not_deployed",
    "deploying",
    "live",
    "failed",
    "offline",
)
DEPLOYMENT_STATUS_LABELS = {
    "not_deployed": "Not deployed",
    "deploying": "Deploying",
    "live": "Live",
    "failed": "Deployment failed",
    "offline": "Offline",
}
DEPLOYMENT_PROVIDERS = (
    "vercel",
    "netlify",
    "render",
    "railway",
    "fly_io",
    "github_pages",
    "cloudflare_pages",
    "aws",
    "gcp",
    "azure",
    "other",
)
SOCIAL_PLATFORMS = (
    "github",
    "linkedin",
    "x",
    "instagram",
    "youtube",
    "behance",
    "dribbble",
    "whatsapp",
    "email",
    "phone",
    "website",
    "other",
)
SOCIAL_PLATFORM_LABELS = {
    "github": "GitHub",
    "linkedin": "LinkedIn",
    "x": "X",
    "instagram": "Instagram",
    "youtube": "YouTube",
    "behance": "Behance",
    "dribbble": "Dribbble",
    "whatsapp": "WhatsApp",
    "email": "Email",
    "phone": "Phone",
    "website": "Website",
    "other": "Other",
}
PAGE_KEYS = (
    "home",
    "work",
    "data-lab",
    "build-lab",
    "leadership",
    "experience",
    "about",
    "now",
    "timeline",
    "resume",
    "contact",
)
PAGE_KEY_LABELS = {
    "home": "Home",
    "work": "Work",
    "data-lab": "Data Lab",
    "build-lab": "Build Lab",
    "leadership": "Leadership",
    "experience": "Experience",
    "about": "About",
    "now": "Now",
    "timeline": "Timeline",
    "resume": "Resume",
    "contact": "Contact",
}
PAGE_KEY_PATHS = {
    "home": "/",
    "work": "/work",
    "data-lab": "/data-lab",
    "build-lab": "/build-lab",
    "leadership": "/leadership",
    "experience": "/experience",
    "about": "/about",
    "now": "/now",
    "timeline": "/timeline",
    "resume": "/resume",
    "contact": "/contact",
}
MEDIA_FOLDERS = (
    "brand",
    "profile",
    "projects",
    "data-lab",
    "build-lab",
    "leadership",
    "experience",
    "social",
    "blog",
    "documents",
    "ui",
    "misc",
)
