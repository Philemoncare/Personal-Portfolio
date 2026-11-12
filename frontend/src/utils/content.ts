import type { ProjectSummary } from "@/types/api";

export const PLACEHOLDER_SUMMARY =
  "Details pending. This is a publishing placeholder, ready to be completed from the admin panel.";

export function projectSummaryText(project: ProjectSummary): string | null {
  return project.summary?.trim() || PLACEHOLDER_SUMMARY;
}

export function isExternalUrl(url: string | null): boolean {
  return Boolean(url && /^https?:\/\//i.test(url));
}
