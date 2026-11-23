import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

import { PageIntro } from "@/components/layout/PageIntro";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useApiResource } from "@/hooks/useApiResource";
import { usePageContent, usePageSeo } from "@/app/ContentProvider";
import type { LeadershipEntry } from "@/types/api";
import { formatRange } from "@/utils/format";

export default function LeadershipPage() {
  const entries = useApiResource<LeadershipEntry[]>("/api/v1/leadership");

  usePageSeo("leadership", {
    title: "Leadership | Philemon Melabah",
    description:
      "Leadership roles and community work, with the responsibility, contribution and result for each.",
    path: "/leadership",
  });

  const page = usePageContent("leadership");

  const items = entries.data ?? [];

  return (
    <>
      <PageIntro
        eyebrow={page?.eyebrow || "Leadership"}
        title={
          page?.title ? (
            page.title
          ) : (
            <>
              Communities, programmes{" "}
              <span className="display-serif text-signal">and technical leadership.</span>
            </>
          )
        }
        description={
          page?.description ||
          "Roles in technology communities, academic work and programmes. Each entry covers the responsibility, what I did and the result."
        }
        aside={
          <div className="border-t border-line pt-4 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
            <div className="flex items-center justify-between gap-6">
              <span>Entries</span>
              <span className="text-paper">
                {entries.loading ? "..." : String(items.length).padStart(2, "0")}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-6">
              <span>Includes</span>
              <span className="text-paper">Role, contribution, result</span>
            </div>
          </div>
        }
      />

      <Container className="py-12 sm:py-16">
        {entries.loading ? <LoadingState rows={3} label="Loading leadership" /> : null}
        {!entries.loading && entries.error ? (
          <ErrorState message="We couldn't load the leadership entries. Please try again in a moment." onRetry={entries.reload} />
        ) : null}
        {!entries.loading && !entries.error && items.length === 0 ? (
          <EmptyState
            title="No leadership entries yet"
            description="Roles and community work will appear here once they are added."
            action={
              <Link to="/contact" className={buttonStyles("secondary", "sm")}>
                Get in touch
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
            }
          />
        ) : null}

        {!entries.loading && !entries.error && items.length > 0 ? (
          <ol>
            {items.map((entry, index) => (
              <li key={entry.id} className="border-t border-line py-8 first:border-t-0 first:pt-0 sm:py-10">
                <div className="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-14">
                  <div>
                    <span className="font-mono text-[0.58rem] tracking-[0.18em] text-signal">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <p className="mt-4 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
                      {entry.organization}
                    </p>
                    <p className="mt-2 text-sm text-paper-dim">
                      {formatRange(entry.started_on, entry.ended_on)}
                    </p>
                    {entry.is_placeholder ? (
                      <div className="mt-4">
                        <Badge tone="placeholder">Not finished</Badge>
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <h2 className="text-2xl font-medium tracking-tight text-paper sm:text-3xl">
                        {entry.slug ? (
                          <Link to={`/leadership/${entry.slug}`} className="hover:text-signal-soft">
                            {entry.title}
                          </Link>
                        ) : (
                          entry.title
                        )}
                      </h2>
                      <div className="flex flex-wrap items-center gap-4">
                        {entry.slug ? (
                          <Link
                            to={`/leadership/${entry.slug}`}
                            className="inline-flex items-center gap-1.5 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-paper hover:text-signal"
                          >
                            Read more
                            <ArrowUpRight className="size-3" aria-hidden="true" />
                          </Link>
                        ) : null}
                        {entry.url ? (
                          <a
                            href={entry.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center gap-1.5 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted hover:text-paper"
                          >
                            Visit website
                            <ArrowUpRight className="size-3" aria-hidden="true" />
                          </a>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-5 grid gap-6 sm:grid-cols-2">
                      {entry.description ? (
                        <div>
                          <p className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-muted">
                            Responsibility
                          </p>
                          <p className="mt-2 text-sm leading-relaxed text-paper-dim">
                            {entry.description}
                          </p>
                        </div>
                      ) : null}
                      {entry.contribution ? (
                        <div>
                          <p className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-muted">
                            Contribution
                          </p>
                          <p className="mt-2 text-sm leading-relaxed text-paper-dim">
                            {entry.contribution}
                          </p>
                        </div>
                      ) : null}
                    </div>

                    {entry.outcome ? (
                      <div className="mt-6 border-l border-signal pl-4">
                        <p className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-signal">
                          Outcome
                        </p>
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-paper-dim">
                          {entry.outcome}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        ) : null}
      </Container>
    </>
  );
}
