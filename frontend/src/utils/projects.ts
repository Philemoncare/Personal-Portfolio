import type { ProjectStage, Technology } from "@/types/api";

export const PROJECT_STAGE_LABELS: Record<ProjectStage, string> = {
  in_progress: "In progress",
  active: "Active",
  completed: "Completed",
  archived: "Archived",
  experiment: "Experiment",
};

export const PROJECT_STAGE_DOTS: Record<ProjectStage, string> = {
  in_progress: "bg-warning",
  active: "bg-success",
  completed: "bg-paper-dim",
  archived: "bg-faint",
  experiment: "bg-signal",
};

export const PROJECT_STAGE_ORDER: ProjectStage[] = [
  "active",
  "in_progress",
  "completed",
  "experiment",
  "archived",
];

const GROUP_ORDER = ["Frontend", "Backend", "Database", "Infrastructure", "Tools"] as const;
type GroupName = (typeof GROUP_ORDER)[number];

const KNOWN_GROUPS: Record<string, GroupName> = {
  react: "Frontend",
  nextjs: "Frontend",
  vue: "Frontend",
  svelte: "Frontend",
  angular: "Frontend",
  typescript: "Frontend",
  javascript: "Frontend",
  html: "Frontend",
  css: "Frontend",
  "tailwind-css": "Frontend",
  vite: "Frontend",
  python: "Backend",
  fastapi: "Backend",
  django: "Backend",
  flask: "Backend",
  nodejs: "Backend",
  express: "Backend",
  java: "Backend",
  php: "Backend",
  laravel: "Backend",
  go: "Backend",
  rust: "Backend",
  postgresql: "Database",
  mysql: "Database",
  sqlite: "Database",
  mongodb: "Database",
  sql: "Database",
  redis: "Database",
  supabase: "Database",
  firebase: "Database",
  aws: "Infrastructure",
  docker: "Infrastructure",
  kubernetes: "Infrastructure",
  nginx: "Infrastructure",
  vercel: "Infrastructure",
  netlify: "Infrastructure",
  terraform: "Infrastructure",
};

const KIND_GROUPS: Record<string, GroupName> = {
  language: "Backend",
  framework: "Backend",
  database: "Database",
  cloud: "Infrastructure",
  tool: "Tools",
};

export interface TechnologyGroup {
  label: GroupName | "Technologies";
  items: Technology[];
}

/**
 * Groups project technologies for the project detail stack panel. Known tools
 * are mapped explicitly; anything else falls back to its stored `kind`.
 */
export function groupTechnologies(technologies: Technology[]): TechnologyGroup[] {
  const groups = new Map<GroupName | "Technologies", Technology[]>();
  for (const technology of technologies) {
    const group =
      KNOWN_GROUPS[technology.slug] ??
      KIND_GROUPS[technology.kind] ??
      ("Technologies" as const);
    const bucket = groups.get(group) ?? [];
    bucket.push(technology);
    groups.set(group, bucket);
  }

  const ordered: TechnologyGroup[] = [];
  for (const label of GROUP_ORDER) {
    const items = groups.get(label);
    if (items?.length) ordered.push({ label, items });
  }
  const other = groups.get("Technologies");
  if (other?.length) ordered.push({ label: "Technologies", items: other });
  return ordered;
}

export function statusLabel(status: ProjectStage): string {
  return PROJECT_STAGE_LABELS[status] ?? status;
}
