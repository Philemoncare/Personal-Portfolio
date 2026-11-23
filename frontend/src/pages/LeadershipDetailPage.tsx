import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { PageIntro } from "@/components/layout/PageIntro";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { DetailSkeleton } from "@/components/ui/skeletons";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useSeo } from "@/hooks/useSeo";
import { leadershipDetailService } from "@/services/experience.service";
import { formatRange } from "@/utils/format";

export default function LeadershipDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const leadership = useApiQuery(
    (signal) =>
      slug
        ? leadershipDetailService.getBySlug(slug, signal)
        : Promise.reject(new Error("Missing leadership slug")),
    [slug],
  );

  const entry = leadership.data;

  useSeo({
    title: entry ? `${entry.title} | ${entry.organization}` : "Leadership detail",
    description:
      entry?.outcome ??
      entry?.description ??
      "A leadership role by Philemon Melabah.",
    path: slug ? `/leadership/${slug}` : undefined,
  });

  if (leadership.loading) {
    return (
      <Container className="py-16">
        <DetailSkeleton label="Loading role" />
      </Container>
    );
  }

  if (leadership.error) {
    return (
      <>
        <PageIntro eyebrow="Leadership / Role" title="Role" />
        <Container className="py-14">
          {leadership.error.status === 404 ? (
            <EmptyState
              title="Role not found"
              description="This role does not exist or is no longer public."
              action={
                <Link to="/leadership" className={buttonStyles("secondary", "sm")}>
                  Back to Leadership
                </Link>
              }
            />
          ) : (
            <ErrorState
              message="We couldn't load this role. Please try again in a moment."
              onRetry={leadership.reload}
            />
          )}
        </Container>
      </>
    );
  }

  if (!entry) return null;

  return (
    <>
      <PageIntro
        eyebrow="Leadership / Role"
        title={
          <>
            {entry.title}.{" "}
            <span className="display-serif text-signal">{entry.organization}</span>
          </>
        }
        description={
          entry.description ??
          "The responsibility, contribution and result for this role."
        }
        aside={
          <div className="border-t border-line pt-4 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
            <div className="flex items-center justify-between gap-6">
              <span>Period</span>
              <span className="text-right text-paper">
                {formatRange(entry.started_on, entry.ended_on)}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-6">
              <span>Organisation</span>
              <span className="text-right text-paper">{entry.organization}</span>
            </div>
          </div>
        }
      />

      <Container className="py-12 sm:py-16">
        <Link
          to="/leadership"
          className="inline-flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted transition-colors hover:text-paper"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to Leadership
        </Link>

        {entry.is_placeholder ? (
          <div className="mt-8 flex items-start gap-3 border border-signal/25 bg-signal/5 p-4">
            <Badge tone="placeholder">Not finished</Badge>
            <p className="text-xs leading-relaxed text-paper-dim">
              Some details for this role are still being confirmed.
            </p>
          </div>
        ) : null}

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_18rem] lg:gap-16">
          <div className="space-y-9">
            <section aria-labelledby="responsibility-heading">
              <h2
                id="responsibility-heading"
                className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted"
              >
                Responsibility
              </h2>
              <p className="mt-3 max-w-2xl text-pretty text-base leading-relaxed text-paper-dim">
                {entry.description ||
                  "Not added yet."}
              </p>
            </section>

            <section aria-labelledby="contribution-heading">
              <h2
                id="contribution-heading"
                className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted"
              >
                Contribution
              </h2>
              <p className="mt-3 max-w-2xl text-pretty text-base leading-relaxed text-paper-dim">
                {entry.contribution ||
                  "Not added yet."}
              </p>
            </section>

            <section aria-labelledby="outcome-heading">
              <h2
                id="outcome-heading"
                className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-signal"
              >
                Outcome
              </h2>
              <p className="mt-3 max-w-2xl border-l border-signal pl-4 text-pretty text-base leading-relaxed text-paper-dim">
                {entry.outcome || "Not added yet."}
              </p>
            </section>
          </div>

          <aside className="h-fit border border-line bg-ink-800/40">
            <div className="border-b border-line px-5 py-3">
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted">
                Details
              </p>
            </div>
            <dl className="divide-y divide-line">
              <div className="px-5 py-4">
                <dt className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-muted">
                  Period
                </dt>
                <dd className="mt-1 text-sm text-paper">
                  {formatRange(entry.started_on, entry.ended_on)}
                </dd>
              </div>
              {entry.url ? (
                <div className="px-5 py-4">
                  <dt className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-muted">
                    Organisation website
                  </dt>
                  <dd className="mt-1">
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1.5 text-sm text-paper underline decoration-line underline-offset-4 hover:text-signal"
                    >
                      Open website
                      <ArrowUpRight className="size-3.5" aria-hidden="true" />
                    </a>
                  </dd>
                </div>
              ) : null}
            </dl>
          </aside>
        </div>

        <div className="mt-14 flex flex-col gap-5 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-sm leading-relaxed text-muted">
            All published roles are listed on the Leadership page. The timeline places this work
            in date order.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link to="/leadership" className={buttonStyles("secondary", "sm")}>
              All roles
            </Link>
            <Link to="/timeline" className={buttonStyles("ghost", "sm")}>
              Timeline
            </Link>
          </div>
        </div>
      </Container>
    </>
  );
}
