import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

import { PortfolioImage } from "@/components/media/PortfolioImage";

import type { DataProjectSummary } from "@/types/api";
import { cn } from "@/utils/cn";
import {
  DATA_PROJECT_STATUS_LABELS,
  DATA_PROJECT_TYPE_LABELS,
} from "@/utils/data";

function DataProjectVisual({
  project,
  index,
  imageLoading,
}: {
  project: DataProjectSummary;
  index: number;
  imageLoading: "lazy" | "eager";
}) {
  if (project.cover_image_url) {
    return (
      <div className="relative aspect-[16/9] overflow-hidden bg-background">
        <PortfolioImage
          src={project.cover_image_url}
          alt={`${project.title} analysis cover`}
          aspect="auto"
          priority={imageLoading === "eager"}
          sizes="(max-width: 768px) 100vw, 50vw"
          imageClassName="transition-transform duration-700 ease-out group-hover:scale-[1.02]"
        />
        <span
          className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-line-strong"
          aria-hidden="true"
        />
      </div>
    );
  }

  return (
    <div className="technical-grid-fine relative flex aspect-[16/9] flex-col justify-between overflow-hidden border-b border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <span className="font-mono text-[0.56rem] uppercase tracking-[0.16em] text-signal">
          Data Lab / {String(index).padStart(2, "0")}
        </span>
        <span className="font-mono text-[0.52rem] uppercase tracking-[0.12em] text-faint">
          {project.year ?? "Undated"}
        </span>
      </div>
      <div className="flex items-end gap-1.5" aria-hidden="true">
        {[38, 64, 47, 82, 58, 71, 46, 90, 63, 76].map((height, barIndex) => (
          <span
            key={barIndex}
            className={cn(
              "flex-1",
              barIndex === 7 ? "bg-signal" : "bg-paper/20",
            )}
            style={{ height: `${height * 0.6}px` }}
          />
        ))}
      </div>
      <span className="max-w-[18rem] font-mono text-[0.54rem] uppercase leading-relaxed tracking-[0.12em] text-muted">
        {DATA_PROJECT_TYPE_LABELS[project.project_type]}
      </span>
    </div>
  );
}

export function DataProjectCard({
  project,
  index,
  imageLoading = "lazy",
}: {
  project: DataProjectSummary;
  index: number;
  imageLoading?: "lazy" | "eager";
}) {
  return (
    <Link
      to={`/data/${project.slug}`}
      className="group flex flex-col overflow-hidden border border-line bg-surface transition-colors duration-300 hover:border-line-strong hover:bg-surface-raised"
    >
      <DataProjectVisual project={project} index={index} imageLoading={imageLoading} />

      <div className="flex flex-1 flex-col justify-between gap-6 p-5 sm:p-6">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="type-meta text-signal">{String(index).padStart(2, "0")}</span>
            <div className="flex flex-wrap items-center gap-2">
              {project.is_demo ? (
                <span className="border border-signal/40 bg-signal/5 px-2 py-1 font-mono text-[0.5rem] uppercase tracking-[0.14em] text-signal-soft">
                  Demo data
                </span>
              ) : null}
              <span className="font-mono text-[0.52rem] uppercase tracking-[0.12em] text-muted">
                {DATA_PROJECT_STATUS_LABELS[project.status]}
              </span>
            </div>
          </div>

          <h3 className="mt-5 text-[clamp(1.6rem,3vw,2.25rem)] font-medium leading-[1.02] tracking-[-0.035em] text-paper transition-colors duration-300 group-hover:text-signal-soft">
            {project.title}
          </h3>

          {project.short_description ? (
            <p className="mt-3 line-clamp-3 max-w-xl text-sm leading-relaxed text-muted">
              {project.short_description}
            </p>
          ) : null}
        </div>

        <div className="space-y-4 border-t border-line pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="type-meta text-paper-dim">{project.category.name}</span>
            <div className="flex items-center gap-3">
              {project.dataset_type ? (
                <span className="type-meta text-faint">{project.dataset_type}</span>
              ) : null}
              {project.year ? <span className="type-meta text-faint">{project.year}</span> : null}
            </div>
          </div>

          {project.tools.length > 0 ? (
            <ul className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {project.tools.slice(0, 4).map((tool) => (
                <li
                  key={tool.id}
                  className="font-mono text-[0.54rem] uppercase tracking-[0.12em] text-muted"
                >
                  {tool.name}
                </li>
              ))}
              {project.tools.length > 4 ? (
                <li className="font-mono text-[0.54rem] uppercase tracking-[0.12em] text-faint">
                  +{project.tools.length - 4}
                </li>
              ) : null}
            </ul>
          ) : (
            <span className="type-meta text-faint">Tooling being documented</span>
          )}

          <div className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-paper transition-colors group-hover:text-signal">
              Explore Analysis
              <ArrowUpRight
                className="size-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
            {project.is_placeholder ? (
              <span className="font-mono text-[0.5rem] uppercase tracking-[0.12em] text-signal/80">
                Analysis pending
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}
