import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useNowItems } from "@/hooks/useContent";
import { cn } from "@/utils/cn";
import { relativeTime } from "@/utils/format";
import { NOW_CATEGORY_LABELS } from "@/utils/identity";

export function CurrentlyBuilding() {
  const { data, loading, error, reload } = useNowItems();
  const items = data ?? [];
  const published = items.filter((item) => !item.is_placeholder);
  const withheld = items.length - published.length;

  return (
    <section
      className="border-t border-line py-20 sm:py-28"
      aria-labelledby="currently-building-heading"
    >
      <Container>
        <SectionHeader
          index="03"
          eyebrow="Currently building"
          title={
            <span id="currently-building-heading">
              A live status{" "}
              <span className="display-serif text-signal">board.</span>
            </span>
          }
          description="The current build, the learning track, and the open questions behind it. Updated directly from the Now record."
          action={
            <Link to="/now" className={buttonStyles("secondary", "sm")}>
              Read the Now page
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          }
        />

        <div className="mt-10">
          {loading ? <LoadingState rows={3} label="Loading current build status" /> : null}
          {!loading && error ? <ErrorState message={error.detail} onRetry={reload} /> : null}
          {!loading && !error && published.length === 0 ? (
            <EmptyState
              title="No current updates are published"
              description="The status board is intentionally quiet rather than speculative. Updates appear once they are published from the Now page."
              action={
                <Link to="/contact" className={buttonStyles("secondary", "sm")}>
                  Ask what is in progress
                </Link>
              }
            />
          ) : null}

          {!loading && !error && published.length > 0 ? (
            <div className="border-y border-line">
              <div className="hidden grid-cols-[3rem_11rem_minmax(0,1fr)_9rem] gap-6 py-3 sm:grid">
                <span className="type-meta text-faint">Index</span>
                <span className="type-meta text-faint">Status</span>
                <span className="type-meta text-faint">Current work</span>
                <span className="type-meta text-right text-faint">Updated</span>
              </div>

              {published.slice(0, 6).map((item, index) => {
                const active = item.status === "active";
                return (
                  <div
                    key={item.id}
                    className="group grid gap-3 border-t border-line py-5 transition-colors hover:bg-surface/50 sm:grid-cols-[3rem_11rem_minmax(0,1fr)_9rem] sm:items-baseline sm:gap-6 sm:px-2"
                  >
                    <span className="type-meta text-signal">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <span className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "size-1.5 shrink-0",
                          active ? "animate-pulse bg-signal" : "bg-faint",
                        )}
                        aria-hidden="true"
                      />
                      <span className="type-meta text-paper-dim">
                        {NOW_CATEGORY_LABELS[item.category]}
                      </span>
                    </span>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-medium tracking-tight text-paper transition-colors group-hover:text-signal-soft">
                          {item.title}
                        </h3>
                      </div>
                      {item.description ? (
                        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">
                          {item.description}
                        </p>
                      ) : null}
                    </div>

                    <span className="type-meta text-muted sm:text-right">
                      {relativeTime(item.updated_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        <p className="mt-5 font-mono text-[0.56rem] uppercase tracking-[0.14em] text-faint">
          Status is updated from the Now record / no percentage estimates
          {withheld > 0
            ? ` / ${withheld} update${withheld === 1 ? "" : "s"} withheld until verified`
            : ""}
        </p>
      </Container>
    </section>
  );
}
