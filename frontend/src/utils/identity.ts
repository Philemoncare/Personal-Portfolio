import type {
  ContactInquiryType,
  NowCategory,
  NowStatus,
  TimelineKind,
} from "@/types/api";

export const NOW_CATEGORY_LABELS: Record<NowCategory, string> = {
  building: "Building",
  learning: "Learning",
  exploring: "Exploring",
  leading: "Leading",
  reading: "Reading",
  experimenting: "Experimenting",
  other: "Other",
};

export const NOW_CATEGORY_ORDER: NowCategory[] = [
  "building",
  "learning",
  "exploring",
  "leading",
  "reading",
  "experimenting",
  "other",
];

export const NOW_STATUS_LABELS: Record<NowStatus, string> = {
  active: "Active",
  ongoing: "Ongoing",
  paused: "Paused",
  completed: "Completed",
};

export const TIMELINE_KIND_LABELS: Record<TimelineKind, string> = {
  education: "Education",
  project: "Project",
  experience: "Experience",
  leadership: "Leadership",
  certification: "Certification",
  community: "Community",
  technical: "Technical",
  milestone: "Milestone",
  other: "Other",
};

export const TIMELINE_KIND_ORDER: TimelineKind[] = [
  "education",
  "project",
  "experience",
  "leadership",
  "certification",
  "community",
  "technical",
  "milestone",
  "other",
];

export const INQUIRY_TYPE_LABELS: Record<ContactInquiryType, string> = {
  project_collaboration: "Project collaboration",
  data_analytics: "Data and analytics",
  development: "Development",
  technology_community: "Technology and community",
  speaking_workshops: "Speaking and workshops",
  general: "General inquiry",
};

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function timelineDateLabel(entry: {
  start_date: string | null;
  year: number;
  month: number | null;
  is_placeholder: boolean;
}): string {
  if (entry.is_placeholder || !entry.start_date) {
    // Placeholder rows only carry a grouping year; do not invent a month or day.
    return String(entry.year);
  }
  const date = new Date(`${entry.start_date}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return String(entry.year);
  const month = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ][date.getUTCMonth()];
  return `${month} ${date.getUTCFullYear()}`;
}
