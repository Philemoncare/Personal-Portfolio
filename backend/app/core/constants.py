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
MESSAGE_STATUSES = ("new", "read", "archived")
PROJECT_MEDIA_TYPES = ("image", "diagram", "video")
TIMELINE_KINDS = ("education", "project", "leadership", "cloud", "development", "milestone")
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
