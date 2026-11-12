import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

import { PageIntro } from "@/components/layout/PageIntro";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useApiResource } from "@/hooks/useApiResource";
import { useSeo } from "@/hooks/useSeo";
import type { NowItem } from "@/types/api";
import { formatDate } from "@/utils/format";

export default function NowPage() {
  const now = useApiResource<NowItem[]>("/api/v1/now");

  useSeo({
    title: "Now — Phill",
    description:
      "What Phill is currently building, learning, exploring, and working toward — a live snapshot maintained through the portfolio admin.",
    path: "/now",
  });

  const items = now.data ?? [];
  const lastUpdated = items.reduce<string | null>((latest, item) => {
    if (!latest) return item.updated_at;
    return new Date(item.updated_at) > new Date(latest) ? item.updated_at : latest;
  }, null);
  const hasPlaceholders = items.some((item) => item.is_placeholder);

  return (
    <>
      <PageIntro
        eyebrow="Now / Live snapshot"
        title={
          <>
            This is what has my{" "}
            <span className="display-serif text-signal">attention.</span>
          </>
        }
        description="A short, current record of the work in progress. It is updated from the admin panel rather than left to age as a static biography."
        aside={
          <div className="border-t border-line pt-4 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
            <div className="flex items-center justify-between gap-6">
              <span>Last updated</span>
              <span className="text-paper">
                {lastUpdated ? formatDate(lastUpdated, { withDay: true }) : "—"}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-6">
              <span>Active items</span>
              <span className="text-paper">
                {now.loading ? "—" : String(items.length).padStart(2, "0")}
              </span>
            </div>
          </div>
        }
      />

      <Container className="py-12 sm:py-16">
        {now.loading ? <LoadingState rows={4} label="Loading current focus" /> : null}
        {!now.loading && now.error ? (
          <ErrorState message={now.error.detail} onRetry={now.reload} />
        ) : null}
        {!now.loading && !now.error && items.length === 0 ? (
          <EmptyState
            title="No current focus has been published"
            description="The Now page is intentionally empty until real updates are added. Add the current build, learning focus, or goals from the admin panel."
            action={
              <Link to="/contact" className={buttonStyles("secondary", "sm")}>
                Get in touch
              </Link>
            }
          />
        ) : null}

        {!now.loading && !now.error && items.length > 0 ? (
          <>
            {hasPlaceholders ? (
              <div className="mb-8 border border-signal/25 bg-signal/5 p-4 sm:flex sm:items-center sm:justify-between sm:gap-6">
                <p className="text-sm leading-relaxed text-paper-dim">
                  A few entries are still being confirmed. They carry a placeholder label until the
                  real detail lands.
                </p>
                <Badge tone="placeholder" className="mt-3 shrink-0 sm:mt-0">
                  Placeholder content
                </Badge>
              </div>
            ) : null}

            <div className="grid gap-px border border-line bg-line md:grid-cols-2">
              {items.map((item, index) => (
                <article
                  key={item.id}
                  className="flex min-h-64 flex-col justify-between bg-ink-900 p-6 sm:p-8"
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-signal">
                      {item.label}
                    </p>
                    <div className="flex items-center gap-2">
                      {item.is_placeholder ? <Badge tone="placeholder">Placeholder</Badge> : null}
                      <span className="font-mono text-[0.58rem] tabular-nums text-faint">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                  </div>
                  <div className="mt-10">
                    <h2 className="text-2xl font-medium tracking-tight text-paper sm:text-3xl">
                      {item.title}
                    </h2>
                    {item.description ? (
                      <p className="mt-3 max-w-xl text-sm leading-relaxed text-paper-dim">
                        {item.description}
                      </p>
                    ) : null}
                    <p className="mt-5 font-mono text-[0.56rem] uppercase tracking-[0.14em] text-faint">
                      Updated {formatDate(item.updated_at, { withDay: true })}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : null}

        <div className="mt-14 flex flex-col gap-5 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-sm leading-relaxed text-muted">
            Looking for the longer record? The About page holds experience, technology, and the
            interactive timeline.
          </p>
          <Link to="/about" className={buttonStyles("secondary", "sm")}>
            Read the profile
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </Container>
    </>
  );
}
