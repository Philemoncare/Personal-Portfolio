import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useTimelineEntries } from "@/hooks/useContent";
import type { TimelineEntry } from "@/types/api";
import { formatMonthYear } from "@/utils/format";
import { TIMELINE_KIND_LABELS } from "@/utils/identity";

function groupByYear(entries: TimelineEntry[]) {
  return entries.reduce<Record<number, TimelineEntry[]>>((groups, entry) => {
    groups[entry.year] = groups[entry.year] ?? [];
    groups[entry.year].push(entry);
    return groups;
  }, {});
}

export function TimelinePreview() {
  const { data, loading, error, reload } = useTimelineEntries();
  const entries = data ?? [];
  const grouped = groupByYear(entries);
  const years = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => b - a)
    .slice(0, 2);

  return (
    <section className="border-t border-line py-20 sm:py-28" aria-labelledby="timeline-preview-heading">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div>
            <div className="flex items-center justify-between gap-3 border-t border-line pt-5">
              <Eyebrow index="06">Timeline</Eyebrow>
              <span className="type-meta text-faint">Record / 06</span>
            </div>
            <h2
              id="timeline-preview-heading"
              className="mt-6 max-w-md text-balance text-[clamp(2rem,3.6vw,3.4rem)] font-medium leading-[0.98] tracking-[-0.04em] text-paper"
            >
              Work in progress,{" "}
              <span className="display-serif text-signal">year by year.</span>
            </h2>
            <p className="mt-5 max-w-md text-pretty text-sm leading-relaxed text-paper-dim">
              A short professional chronology. The full record, including education, projects, and
              leadership, lives on the Timeline page.
            </p>
            <Link to="/timeline" className={buttonStyles("secondary", "sm", "mt-7")}>
              Full timeline
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div>
            {loading ? <LoadingState rows={3} label="Loading timeline preview" /> : null}
            {!loading && error ? <ErrorState message={error.detail} onRetry={reload} /> : null}
            {!loading && !error && entries.length === 0 ? (
              <EmptyState
                title="Timeline entries are not published yet"
                description="The chronology stays quiet until each milestone is confirmed. Education, project, and leadership records will appear here."
              />
            ) : null}

            {!loading && !error && entries.length > 0
              ? years.map((year) => (
                  <div
                    key={year}
                    className="grid gap-5 border-t border-line py-6 first:border-t-0 first:pt-0 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:gap-8"
                  >
                    <div>
                      <p className="font-mono text-3xl tracking-[-0.04em] text-paper">{year}</p>
                      <span className="mt-3 block h-px w-9 bg-signal" aria-hidden="true" />
                    </div>

                    <ol className="space-y-5 border-l border-line pl-5 sm:pl-7">
                      {grouped[year].slice(0, 4).map((entry) => (
                        <li key={entry.id} className="relative">
                          <span
                            className="absolute -left-[1.45rem] top-2 size-1.5 bg-signal sm:-left-[1.95rem]"
                            aria-hidden="true"
                          />
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="type-meta text-muted">
                              {formatMonthYear(entry.year, entry.month)} /{" "}
                              {TIMELINE_KIND_LABELS[entry.kind]}
                            </span>
                            {entry.is_placeholder ? (
                              <Badge tone="placeholder">Pending</Badge>
                            ) : null}
                          </div>
                          <h3 className="mt-1.5 text-lg font-medium tracking-tight text-paper">
                            {entry.title}
                          </h3>
                          {entry.summary || entry.description ? (
                            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
                              {entry.summary || entry.description}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  </div>
                ))
              : null}

            {!loading && !error && entries.length > 0 ? (
              <p className="mt-6 border-t border-line pt-4 font-mono text-[0.56rem] uppercase tracking-[0.14em] text-faint">
                Showing the most recent published years / {String(entries.length).padStart(2, "0")} records
              </p>
            ) : null}
          </div>
        </div>
      </Container>
    </section>
  );
}
