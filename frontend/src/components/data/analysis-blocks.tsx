import { ArrowUpRight, Database, FileText, Lock } from "lucide-react";
import type { ReactNode } from "react";

import type { DataInsight, DataProjectDetail, DataResource } from "@/types/api";
import { DATA_RESOURCE_TYPE_LABELS } from "@/utils/data";
import { isExternalUrl } from "@/utils/content";

export function Paragraphs({ text }: { text: string }) {
  return (
    <div className="prose-copy">
      {text
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
        .map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
    </div>
  );
}

export function AnalysisSection({
  id,
  index,
  title,
  eyebrow,
  children,
}: {
  id: string;
  index: number;
  title: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="scroll-mt-28 border-t border-line pt-8"
    >
      <div className="flex flex-wrap items-baseline gap-4">
        <span className="font-mono text-[0.56rem] tabular-nums text-signal">
          {String(index).padStart(2, "0")}
        </span>
        <div>
          {eyebrow ? (
            <p className="font-mono text-[0.54rem] uppercase tracking-[0.18em] text-muted">
              {eyebrow}
            </p>
          ) : null}
          <h2
            id={`${id}-heading`}
            className="mt-1 text-2xl font-medium tracking-[-0.03em] text-paper sm:text-3xl"
          >
            {title}
          </h2>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function InsightCard({ insight, index }: { insight: DataInsight; index: number }) {
  return (
    <article className="border border-line bg-ink-900/50">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[0.56rem] tabular-nums text-signal">
            {String(index).padStart(2, "0")}
          </span>
          <h3 className="text-base font-medium text-paper">
            {insight.title?.trim() || "Insight"}
          </h3>
        </div>
        <span className="font-mono text-[0.5rem] uppercase tracking-[0.14em] text-faint">
          Insight
        </span>
      </div>
      <div className="grid gap-px bg-line sm:grid-cols-3">
        <div className="bg-ink-900 p-5">
          <p className="font-mono text-[0.54rem] uppercase tracking-[0.16em] text-signal">
            Finding
          </p>
          <p className="mt-3 text-sm leading-relaxed text-paper-dim">{insight.key_insight}</p>
        </div>
        <div className="bg-ink-900 p-5">
          <p className="font-mono text-[0.54rem] uppercase tracking-[0.16em] text-muted">
            Possible explanation
          </p>
          <p className="mt-3 text-sm leading-relaxed text-paper-dim">
            {insight.possible_explanation?.trim() || "Not added."}
          </p>
        </div>
        <div className="bg-ink-900 p-5">
          <p className="font-mono text-[0.54rem] uppercase tracking-[0.16em] text-muted">
            Recommendation
          </p>
          <p className="mt-3 text-sm leading-relaxed text-paper-dim">
            {insight.recommendation?.trim() || "Not added."}
          </p>
        </div>
      </div>
    </article>
  );
}

export function DatasetPanel({ project }: { project: Omit<DataProjectDetail, "hero_visualization"> }) {
  const fields = [
    { label: "Dataset", value: project.dataset_name },
    { label: "Source", value: project.dataset_source },
    { label: "Rows", value: project.dataset_rows?.toLocaleString("en") ?? null },
    { label: "Columns", value: project.dataset_columns?.toLocaleString("en") ?? null },
    { label: "Time period", value: project.dataset_time_period },
    { label: "Data type", value: project.dataset_type },
    { label: "Licence and usage", value: project.dataset_license },
  ].filter((item) => item.value && String(item.value).trim().length > 0);

  if (fields.length === 0 && !project.dataset_description && !project.dataset_note) {
    return null;
  }

  const sourceIsLink = project.dataset_source ? isExternalUrl(project.dataset_source) : false;

  return (
    <div className="border border-line bg-ink-900/40">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-2">
          <Database className="size-3.5 text-signal" aria-hidden="true" />
          <span className="font-mono text-[0.56rem] uppercase tracking-[0.16em] text-muted">
            Dataset
          </span>
        </div>
        {!project.dataset_is_public ? (
          <span className="inline-flex items-center gap-1.5 border border-warning/40 px-2 py-1 font-mono text-[0.5rem] uppercase tracking-[0.12em] text-warning">
            <Lock className="size-3" aria-hidden="true" />
            Not public
          </span>
        ) : null}
      </div>

      {fields.length > 0 ? (
        <dl className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
          {fields.map((field) => (
            <div key={field.label} className="bg-ink-900 p-4">
              <dt className="font-mono text-[0.52rem] uppercase tracking-[0.14em] text-faint">
                {field.label}
              </dt>
              <dd className="mt-2 break-words text-sm text-paper-dim">
                {field.label === "Source" && sourceIsLink ? (
                  <a
                    href={project.dataset_source ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 underline decoration-line-strong underline-offset-4 hover:text-paper"
                  >
                    {field.value}
                    <ArrowUpRight className="size-3" aria-hidden="true" />
                  </a>
                ) : (
                  field.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {project.dataset_description ? (
        <div className="border-t border-line px-5 py-4">
          <Paragraphs text={project.dataset_description} />
        </div>
      ) : null}

      {project.dataset_note ? (
        <p className="border-t border-line px-5 py-3 text-xs leading-relaxed text-faint">
          {project.dataset_note}
        </p>
      ) : null}
    </div>
  );
}

export function ResourceList({ resources }: { resources: DataResource[] }) {
  if (resources.length === 0) return null;

  return (
    <ul className="divide-y divide-line border border-line bg-ink-900/40">
      {resources.map((resource) => {
        const label = DATA_RESOURCE_TYPE_LABELS[resource.resource_type] ?? "File";
        const external = resource.url ? isExternalUrl(resource.url) : false;
        const content = (
          <>
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-paper">{resource.title}</p>
                <p className="mt-1 font-mono text-[0.5rem] uppercase tracking-[0.12em] text-faint">
                  {label}
                </p>
                {resource.description ? (
                  <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted">
                    {resource.description}
                  </p>
                ) : null}
              </div>
            </div>
            <span className="font-mono text-[0.52rem] uppercase tracking-[0.12em] text-muted">
              {resource.url ? (
                <span className="inline-flex items-center gap-1.5">
                  Open
                  <ArrowUpRight className="size-3" aria-hidden="true" />
                </span>
              ) : (
                "Not public"
              )}
            </span>
          </>
        );

        return (
          <li key={resource.id}>
            {resource.url ? (
              <a
                href={resource.url}
                target={external ? "_blank" : undefined}
                rel={external ? "noreferrer" : undefined}
                className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-ink-800/40 sm:flex-row sm:items-start sm:justify-between"
              >
                {content}
              </a>
            ) : (
              <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                {content}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
