import { useState } from "react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/ui/reveal";
import { EmptyState } from "@/components/ui/states";
import type { ContentLink, TimelineEntry, TimelineKind } from "@/types/api";
import { cn } from "@/utils/cn";
import { TIMELINE_KIND_LABELS, timelineDateLabel } from "@/utils/identity";

function RelatedLink({ link }: { link: ContentLink }) {
  return (
    <Link
      to={link.href}
      className="inline-flex items-center gap-1.5 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-signal-soft underline decoration-line underline-offset-4 hover:text-paper"
    >
      {link.label ?? link.title}
      <span aria-hidden="true">→</span>
    </Link>
  );
}

export function Timeline({
  entries,
  showFilters = true,
  emptyTitle = "No milestones published yet",
  emptyDescription = "Timeline entries appear here once they are added and published from the admin panel.",
}: {
  entries: TimelineEntry[];
  showFilters?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const [filter, setFilter] = useState<"all" | TimelineKind>("all");

  if (entries.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const presentKinds = Array.from(
    new Set(entries.map((entry) => entry.kind)),
  ).sort(
    (a, b) =>
      Object.keys(TIMELINE_KIND_LABELS).indexOf(a) -
      Object.keys(TIMELINE_KIND_LABELS).indexOf(b),
  );

  const visible =
    filter === "all" ? entries : entries.filter((entry) => entry.kind === filter);

  const groups = visible.reduce<Record<number, TimelineEntry[]>>((result, entry) => {
    const year = entry.start_date
      ? new Date(`${entry.start_date}T00:00:00Z`).getUTCFullYear()
      : entry.year;
    result[year] = result[year] ?? [];
    result[year].push(entry);
    return result;
  }, {});
  const years = Object.keys(groups)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <div>
      {showFilters && presentKinds.length > 1 ? (
        <div
          className="mb-10 flex flex-wrap gap-2"
          role="group"
          aria-label="Filter timeline by type"
        >
          <button
            type="button"
            onClick={() => setFilter("all")}
            aria-pressed={filter === "all"}
            className={cn(
              "border px-3 py-2 font-mono text-[0.58rem] uppercase tracking-[0.14em] transition-colors",
              filter === "all"
                ? "border-paper bg-paper text-ink-950"
                : "border-line text-paper-dim hover:border-line-strong",
            )}
          >
            All
          </button>
          {presentKinds.map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => setFilter(kind)}
              aria-pressed={filter === kind}
              className={cn(
                "border px-3 py-2 font-mono text-[0.58rem] uppercase tracking-[0.14em] transition-colors",
                filter === kind
                  ? "border-paper bg-paper text-ink-950"
                  : "border-line text-paper-dim hover:border-line-strong",
              )}
            >
              {TIMELINE_KIND_LABELS[kind]}
            </button>
          ))}
        </div>
      ) : null}

      <div className="space-y-14">
        {years.map((year) => (
          <section key={year} aria-labelledby={`timeline-year-${year}`}>
            <h2
              id={`timeline-year-${year}`}
              className="font-mono text-xs uppercase tracking-[0.2em] text-signal"
            >
              {year}
            </h2>
            <ol className="mt-6 space-y-0 border-t border-line">
              {groups[year].map((entry) => (
                <li
                  key={entry.id}
                  id={entry.slug ?? undefined}
                  className="scroll-mt-24 border-b border-line"
                >
                  <Reveal>
                    <div className="grid gap-3 py-6 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-8">
                      <div className="space-y-2">
                        <p className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-muted">
                          {timelineDateLabel(entry)}
                        </p>
                        <Badge tone="muted">{TIMELINE_KIND_LABELS[entry.kind]}</Badge>
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-medium tracking-tight text-paper">
                            {entry.title}
                          </h3>
                          {entry.is_placeholder ? (
                            <Badge tone="placeholder">Placeholder</Badge>
                          ) : null}
                        </div>
                        {entry.organization ? (
                          <p className="mt-1 text-sm text-paper-dim">{entry.organization}</p>
                        ) : null}
                        {entry.summary || entry.description ? (
                          <p className="mt-3 max-w-2xl text-pretty text-sm leading-relaxed text-muted">
                            {entry.summary || entry.description}
                          </p>
                        ) : null}
                        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                          {entry.related_project ? (
                            <RelatedLink link={entry.related_project} />
                          ) : null}
                          {entry.related_experience ? (
                            <RelatedLink link={entry.related_experience} />
                          ) : null}
                          {entry.related_leadership ? (
                            <RelatedLink link={entry.related_leadership} />
                          ) : null}
                          {entry.external_url ? (
                            <a
                              href={entry.external_url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="inline-flex items-center gap-1.5 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-paper-dim underline decoration-line underline-offset-4 hover:text-paper"
                            >
                              External reference
                              <span aria-hidden="true">↗</span>
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="Nothing in this type yet"
          description="Choose another type or return to the full timeline."
        />
      ) : null}
    </div>
  );
}
