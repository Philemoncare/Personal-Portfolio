import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

import { PageIntro } from "@/components/layout/PageIntro";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { PageSkeleton } from "@/components/ui/skeletons";
import { useNowItems } from "@/hooks/useContent";
import { usePageContent, usePageSeo } from "@/app/ContentProvider";
import type { ContentLink, NowCategory, NowItem, NowStatus } from "@/types/api";
import { cn } from "@/utils/cn";
import { formatDate } from "@/utils/format";
import {
  NOW_CATEGORY_LABELS,
  NOW_CATEGORY_ORDER,
  NOW_STATUS_LABELS,
} from "@/utils/identity";

const STATUS_TONES: Record<NowStatus, string> = {
  active: "border-signal/50 bg-signal/8 text-signal-soft",
  ongoing: "border-line-strong text-paper-dim",
  paused: "border-warning/40 text-warning",
  completed: "border-line text-faint",
};

function StatusPill({ status }: { status: NowStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[0.54rem] uppercase leading-none tracking-[0.14em]",
        STATUS_TONES[status],
      )}
    >
      {status === "active" ? (
        <span className="size-1 animate-pulse bg-signal" aria-hidden="true" />
      ) : null}
      {NOW_STATUS_LABELS[status]}
    </span>
  );
}

function RelatedLinks({ item }: { item: NowItem }) {
  const links: ContentLink[] = [
    item.related_project,
    item.related_build_lab,
    item.related_leadership,
  ].filter((link): link is ContentLink => link !== null);

  if (links.length === 0 && !item.external_url) return null;

  return (
    <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
      {links.map((link) => (
        <Link
          key={`${link.kind}-${link.href}`}
          to={link.href}
          className="inline-flex items-center gap-1.5 font-mono text-[0.56rem] uppercase tracking-[0.14em] text-signal-soft underline decoration-line underline-offset-4 hover:text-paper"
        >
          {link.label ?? link.title}
          <span aria-hidden="true">→</span>
        </Link>
      ))}
      {item.external_url ? (
        <a
          href={item.external_url}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1.5 font-mono text-[0.56rem] uppercase tracking-[0.14em] text-paper-dim underline decoration-line underline-offset-4 hover:text-paper"
        >
          External reference
          <span aria-hidden="true">↗</span>
        </a>
      ) : null}
    </div>
  );
}

function NowCard({ item, index }: { item: NowItem; index: number }) {
  return (
    <article className="flex min-h-56 flex-col justify-between bg-ink-900 p-6 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <StatusPill status={item.status} />
        <div className="flex items-center gap-2">
          {item.is_placeholder ? <Badge tone="placeholder">Placeholder</Badge> : null}
          <span className="font-mono text-[0.54rem] tabular-nums text-faint">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-2xl font-medium tracking-tight text-paper">{item.title}</h3>
        {item.description ? (
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-paper-dim">
            {item.description}
          </p>
        ) : null}
        <RelatedLinks item={item} />
        <p className="mt-5 font-mono text-[0.54rem] uppercase tracking-[0.12em] text-faint">
          Updated {formatDate(item.updated_at, { withDay: true })}
        </p>
      </div>
    </article>
  );
}

export default function NowPage() {
  const now = useNowItems();
  const page = usePageContent("now");

  usePageSeo("now", {
    title: "Now | Current focus",
    description:
      "A live snapshot of what is being built, learned, explored, and led. Maintained through the portfolio admin and grouped by category.",
    path: "/now",
  });

  if (now.loading && !now.data) {
    return <PageSkeleton label="Loading current focus" />;
  }

  const items = now.data ?? [];
  const grouped = NOW_CATEGORY_ORDER.map((category) => ({
    category,
    items: items.filter((item) => item.category === category),
  })).filter((group) => group.items.length > 0);

  const lastUpdated = items.reduce<string | null>((latest, item) => {
    if (!latest) return item.updated_at;
    return new Date(item.updated_at) > new Date(latest) ? item.updated_at : latest;
  }, null);
  const hasPlaceholders = items.some((item) => item.is_placeholder);

  return (
    <>
      <PageIntro
        eyebrow={page?.eyebrow || "Now / Live snapshot"}
        title={
          page?.title ? (
            page.title
          ) : (
            <>
              This is what has my{" "}
              <span className="display-serif text-signal">attention.</span>
            </>
          )
        }
        description={
          page?.description ||
          "A current record of the work in progress, grouped by what it actually is. It is updated from the admin panel rather than left to age as a static biography."
        }
        aside={
          <div className="border-t border-line pt-4 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
            <div className="flex items-center justify-between gap-6">
              <span>Last updated</span>
              <span className="text-right text-paper">
                {lastUpdated ? formatDate(lastUpdated, { withDay: true }) : "—"}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-6">
              <span>Active items</span>
              <span className="text-paper">
                {now.loading ? "—" : String(items.length).padStart(2, "0")}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-6">
              <span>Categories</span>
              <span className="text-paper">
                {now.loading ? "—" : String(grouped.length).padStart(2, "0")}
              </span>
            </div>
          </div>
        }
      />

      <Container className="py-12 sm:py-16">
        {!now.loading && now.error ? (
          <ErrorState
            message="The Now page could not be loaded. The API may be unavailable — try again in a moment."
            onRetry={now.reload}
          />
        ) : null}

        {!now.loading && !now.error && items.length === 0 ? (
          <EmptyState
            title="No current focus has been published"
            description="The Now page is intentionally quiet until real updates are added. Add the current build, learning focus, or goal from the admin panel."
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
              <div className="mb-10 border border-signal/25 bg-signal/5 p-4 sm:flex sm:items-center sm:justify-between sm:gap-6">
                <p className="text-sm leading-relaxed text-paper-dim">
                  A few entries are still being confirmed. They carry a placeholder label until the
                  real detail lands.
                </p>
                <Badge tone="placeholder" className="mt-3 shrink-0 sm:mt-0">
                  Placeholder content
                </Badge>
              </div>
            ) : null}

            <div className="space-y-16">
              {grouped.map((group) => (
                <section
                  key={group.category}
                  aria-labelledby={`now-${group.category}`}
                  className="border-t border-line pt-8"
                >
                  <h2 id={`now-${group.category}`} className="sr-only">
                    {NOW_CATEGORY_LABELS[group.category]}
                  </h2>
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <Eyebrow index={String(NOW_CATEGORY_ORDER.indexOf(group.category) + 1).padStart(2, "0")}>
                        {NOW_CATEGORY_LABELS[group.category]}
                      </Eyebrow>
                      <span className="font-mono text-[0.54rem] uppercase tracking-[0.14em] text-faint">
                        {group.items.length} {group.items.length === 1 ? "item" : "items"}
                      </span>
                    </div>
                    <span className="font-mono text-[0.54rem] uppercase tracking-[0.14em] text-faint">
                      {NOW_CATEGORY_LABELS[group.category as NowCategory]}
                    </span>
                  </div>

                  <div className="mt-6 grid gap-px border border-line bg-line md:grid-cols-2">
                    {group.items.map((item, index) => (
                      <NowCard key={item.id} item={item} index={index} />
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <p className="mt-10 border-t border-line pt-5 font-mono text-[0.54rem] uppercase tracking-[0.13em] text-faint">
              Status is maintained manually / only active, published items are shown / timestamps
              reflect the last edit, not a claimed start date
            </p>
          </>
        ) : null}

        <div className="mt-14 flex flex-col gap-5 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-sm leading-relaxed text-muted">
            Looking for the longer record? The About page holds the profile, and the Timeline page
            holds the chronology.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link to="/about" className={buttonStyles("secondary", "sm")}>
              Read the profile
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
            <Link to="/timeline" className={buttonStyles("ghost", "sm")}>
              View timeline
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </Container>
    </>
  );
}
