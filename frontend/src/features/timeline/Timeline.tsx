import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import type { TimelineEntry, TimelineKind } from "@/types/api";
import { cn } from "@/utils/cn";
import { formatMonthYear } from "@/utils/format";

const KIND_LABELS: Record<TimelineKind, string> = {
  education: "Education",
  project: "Projects",
  leadership: "Leadership",
  cloud: "AWS",
  development: "Development",
  milestone: "Milestones",
};

const FILTERS: Array<{ value: "all" | TimelineKind; label: string }> = [
  { value: "all", label: "Everything" },
  { value: "education", label: "Education" },
  { value: "project", label: "Projects" },
  { value: "leadership", label: "Leadership" },
  { value: "cloud", label: "AWS" },
  { value: "development", label: "Development" },
  { value: "milestone", label: "Milestones" },
];

export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  const [filter, setFilter] = useState<"all" | TimelineKind>("all");

  if (entries.length === 0) {
    return (
      <EmptyState
        title="Timeline entries are not published yet"
        description="Education, projects, and leadership milestones will be added from the admin panel. The timeline stays empty until those records are confirmed."
      />
    );
  }

  const availableKinds = Array.from(new Set(entries.map((entry) => entry.kind)));
  const visibleFilters = FILTERS.filter(
    (item) => item.value === "all" || availableKinds.includes(item.value),
  );
  const visible = entries.filter((entry) => filter === "all" || entry.kind === filter);

  const grouped = visible.reduce<Record<number, TimelineEntry[]>>((groups, entry) => {
    groups[entry.year] = groups[entry.year] ?? [];
    groups[entry.year].push(entry);
    return groups;
  }, {});
  const years = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <div>
      <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
        {visibleFilters.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            aria-pressed={filter === item.value}
            className={cn(
              "shrink-0 border px-3 py-2 font-mono text-[0.6rem] uppercase tracking-[0.14em] transition-colors",
              filter === item.value
                ? "border-paper bg-paper text-ink-950"
                : "border-line text-paper-dim hover:border-line-strong",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-10 space-y-12">
        {years.map((year) => (
          <div key={year} className="grid gap-6 md:grid-cols-[8rem_minmax(0,1fr)] md:gap-10">
            <div>
              <p className="font-mono text-3xl tracking-[-0.04em] text-paper">{year}</p>
              <span className="mt-4 block h-px w-10 bg-signal" aria-hidden="true" />
            </div>

            <ol className="space-y-6 border-l border-line pl-6 sm:pl-8">
              {grouped[year].map((entry) => (
                <li key={entry.id} className="relative">
                  <span
                    className="absolute -left-[1.78rem] top-1.5 size-2 bg-signal sm:-left-[2.28rem]"
                    aria-hidden="true"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-muted">
                      {formatMonthYear(entry.year, entry.month)} / {KIND_LABELS[entry.kind]}
                    </span>
                    {entry.is_placeholder ? <Badge tone="placeholder">Placeholder</Badge> : null}
                  </div>
                  <h4 className="mt-2 text-lg font-medium tracking-tight text-paper">
                    {entry.title}
                  </h4>
                  {entry.description ? (
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
                      {entry.description}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}
