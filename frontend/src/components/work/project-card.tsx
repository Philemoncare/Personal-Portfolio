import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

import { PortfolioImage } from "@/components/media/PortfolioImage";
import { HomepagePreview, hasHomepagePreview } from "@/components/work/HomepagePreview";
import { ProjectStatus } from "@/components/work/project-status";
import { projectAssetId } from "@/components/work/project-assets";
import { ProjectVisual } from "@/components/work/project-visual";
import type { ProjectSummary } from "@/types/api";
import { cn } from "@/utils/cn";
import { projectSummaryText } from "@/utils/content";

function TechnologyList({
  project,
  limit = 4,
}: {
  project: ProjectSummary;
  limit?: number;
}) {
  if (project.technologies.length === 0) {
    return <span className="type-meta text-faint">No technologies listed</span>;
  }
  const visible = project.technologies.slice(0, limit);
  const remainder = project.technologies.length - visible.length;
  return (
    <ul className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {visible.map((technology) => (
        <li
          key={technology.id}
          className="font-mono text-[0.55rem] uppercase tracking-[0.12em] text-muted"
        >
          {technology.name}
        </li>
      ))}
      {remainder > 0 ? (
        <li className="font-mono text-[0.55rem] uppercase tracking-[0.12em] text-faint">
          +{remainder}
        </li>
      ) : null}
    </ul>
  );
}

export function ProjectCard({
  project,
  index,
  className,
}: {
  project: ProjectSummary;
  index: number;
  className?: string;
}) {
  const summary = projectSummaryText(project);
  const cover = project.cover_image_url;
  const hasPreview = hasHomepagePreview(project);

  return (
    <Link
      to={`/work/${project.slug}`}
      className={cn(
        "group flex flex-col overflow-hidden border border-line bg-surface transition-colors duration-300 hover:border-line-strong hover:bg-surface-raised",
        className,
      )}
    >
      <div className="relative overflow-hidden">
        {hasPreview ? (
          <HomepagePreview
            project={project}
            interactive={false}
            className="border-0 border-b border-line"
          />
        ) : cover ? (
          <div className="relative aspect-[16/10] overflow-hidden bg-background">
            <PortfolioImage
              src={cover}
              alt={`${project.title} project cover`}
              aspect="auto"
              sizes="(max-width: 768px) 100vw, 50vw"
              imageClassName="transition-transform duration-700 ease-out group-hover:scale-[1.02]"
            />
            <span
              className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-line-strong"
              aria-hidden="true"
            />
          </div>
        ) : (
          <ProjectVisual
            title={project.title}
            index={index}
            assetId={projectAssetId(project.slug)}
            aspect="landscape"
            className="border-0 border-b border-line"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between gap-6 p-5 sm:p-6">
        <div>
          <div className="flex items-center justify-between gap-4">
            <span className="type-meta text-signal">{String(index).padStart(2, "0")}</span>
            <ProjectStatus status={project.project_status} />
          </div>

          <h3 className="mt-5 text-[clamp(1.6rem,3vw,2.25rem)] font-medium leading-[1.02] tracking-[-0.035em] text-paper transition-colors duration-300 group-hover:text-signal-soft">
            {project.title}
          </h3>

          {summary ? (
            <p className="mt-3 line-clamp-3 max-w-xl text-sm leading-relaxed text-muted">
              {summary}
            </p>
          ) : null}
        </div>

        <div className="space-y-4 border-t border-line pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="type-meta text-paper-dim">{project.category.name}</span>
            {project.year ? <span className="type-meta text-faint">{project.year}</span> : null}
          </div>
          <TechnologyList project={project} />
          <div className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-paper transition-colors group-hover:text-signal">
              View project
              <ArrowUpRight
                className="size-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
            {project.is_placeholder ? (
              <span className="font-mono text-[0.52rem] uppercase tracking-[0.14em] text-signal/80">
                Not finished
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}

export function ProjectRow({
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
      className="group grid gap-4 border-t border-line py-6 transition-colors hover:border-line-strong sm:grid-cols-[3.5rem_minmax(0,1fr)_14rem] sm:items-start sm:gap-8 sm:py-8"
    >
      <span className="type-meta pt-1 text-signal">{String(index).padStart(2, "0")}</span>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h3 className="text-[clamp(1.7rem,3vw,2.4rem)] font-medium leading-none tracking-[-0.04em] text-paper transition-colors duration-300 group-hover:text-signal-soft">
            {project.title}
          </h3>
          <ProjectStatus status={project.project_status} />
        </div>
        {summary ? (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{summary}</p>
        ) : null}
        <div className="mt-4">
          <TechnologyList project={project} limit={5} />
        </div>
      </div>

      <div className="flex items-start justify-between gap-4 sm:flex-col sm:items-end sm:gap-4">
        <span className="type-meta text-paper-dim">{project.category.name}</span>
        <span className="inline-flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-muted transition-colors group-hover:text-signal">
          Open project
          <ArrowUpRight
            className="size-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </span>
      </div>
    </Link>
  );
}
