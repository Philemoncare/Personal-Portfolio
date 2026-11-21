import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { hasHomepagePreview } from "@/components/work/HomepagePreview";
import { projectAssetId } from "@/components/work/project-assets";
import { ProjectVisual } from "@/components/work/project-visual";
import type { ProjectSummary } from "@/types/api";
import { cn } from "@/utils/cn";
import { projectSummaryText } from "@/utils/content";

const MODE_LABELS: Record<ProjectSummary["primary_mode"], string> = {
  build: "Full-stack",
  data: "Data",
  lead: "Leadership",
  explore: "Exploration",
};

function ProjectMeta({ project }: { project: ProjectSummary }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="type-meta text-muted">{project.category.name}</span>
      <span className="size-1 bg-signal" aria-hidden="true" />
      <span className="type-meta text-muted">{MODE_LABELS[project.primary_mode]}</span>
      {project.is_placeholder ? <Badge tone="placeholder">Details pending</Badge> : null}
    </div>
  );
}

export function FeaturedProject({
  project,
  index,
  reverse = false,
}: {
  project: ProjectSummary;
  index: number;
  reverse?: boolean;
}) {
  const href = `/work/${project.slug}`;
  const summary = projectSummaryText(project);

  return (
    <Link
      to={href}
      className="group grid gap-8 lg:grid-cols-2 lg:items-stretch lg:gap-12"
    >
      <div
        className={cn(
          "flex flex-col justify-between",
          reverse ? "lg:order-2" : "lg:order-1",
        )}
      >
        <div>
          <div className="flex items-center justify-between gap-4 border-b border-line pb-3">
            <span className="type-meta text-signal">{String(index).padStart(2, "0")}</span>
            <span className="type-meta text-faint">Selected work</span>
          </div>

          <h3 className="mt-8 text-balance text-[clamp(2.7rem,5.4vw,5.25rem)] font-medium leading-[0.92] tracking-[-0.05em] text-paper transition-colors duration-300 group-hover:text-signal-soft">
            {project.title}
          </h3>

          {summary ? (
            <p className="mt-5 max-w-lg text-pretty text-sm leading-relaxed text-paper-dim sm:text-base">
              {summary}
            </p>
          ) : null}

          <div className="mt-6">
            <ProjectMeta project={project} />
          </div>
        </div>

        <div className="mt-8 flex items-end justify-between gap-5 border-t border-line pt-4">
          <span className="inline-flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-paper transition-colors group-hover:text-signal">
            View project
            <ArrowUpRight
              className="size-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </span>
          <span className="type-meta text-faint">Record {String(index).padStart(2, "0")}</span>
        </div>
      </div>

      <div className={cn(reverse ? "lg:order-1" : "lg:order-2")}>
        <ProjectVisual
          title={project.title}
          index={index}
          imageUrl={
            hasHomepagePreview(project)
              ? project.preview_image
              : project.cover_image_url
          }
          imageAlt={
            hasHomepagePreview(project)
              ? `Captured homepage of ${project.title}`
              : `${project.title} project visual`
          }
          assetId={projectAssetId(project.slug)}
          aspect="landscape"
          className="h-full"
        />
      </div>

      <span className="sr-only">Open {project.title}</span>
    </Link>
  );
}

export function EditorialProjectRow({
  project,
  index,
}: {
  project: ProjectSummary;
  index: number;
}) {
  const summary = projectSummaryText(project);

  return (
    <Link
      to={`/work/${project.slug}`}
      className="group grid gap-4 border-t border-line py-6 transition-colors hover:border-line-strong sm:grid-cols-[3rem_minmax(0,1fr)_13rem] sm:gap-8 sm:py-7"
    >
      <span className="type-meta pt-1 text-signal">{String(index).padStart(2, "0")}</span>

      <div className="min-w-0">
        <h3 className="text-[clamp(1.8rem,3vw,2.6rem)] font-medium leading-none tracking-[-0.04em] text-paper transition-colors duration-300 group-hover:text-signal-soft">
          {project.title}
        </h3>
        {summary ? (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{summary}</p>
        ) : null}
      </div>

      <div className="flex items-start justify-between gap-4 sm:flex-col sm:items-end sm:justify-between">
        <ProjectMeta project={project} />
        <span className="inline-flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-muted transition-colors group-hover:text-signal">
          Open
          <ArrowUpRight
            className="size-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </span>
      </div>
    </Link>
  );
}
