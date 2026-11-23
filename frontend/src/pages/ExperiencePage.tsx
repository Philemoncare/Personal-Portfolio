import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

import { PageIntro } from "@/components/layout/PageIntro";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { PageSkeleton } from "@/components/ui/skeletons";
import { useApiQuery } from "@/hooks/useApiQuery";
import { usePageContent, usePageSeo } from "@/app/ContentProvider";
import { experienceService } from "@/services/experience.service";
import { formatRange } from "@/utils/format";

export default function ExperiencePage() {
  const experience = useApiQuery((signal) => experienceService.getEntries(signal), []);

  usePageSeo("experience", {
    title: "Experience | Philemon Melabah",
    description:
      "Roles, organisations and dates, with more detail where there is more to say.",
    path: "/experience",
  });

  const page = usePageContent("experience");

  if (experience.loading && !experience.data) {
    return <PageSkeleton label="Loading experience" />;
  }

  const entries = experience.data ?? [];

  return (
    <>
      <PageIntro
        eyebrow={page?.eyebrow || "Experience"}
        title={
          page?.title ? (
            page.title
          ) : (
            <>
              Where I have{" "}
              <span className="display-serif text-signal">worked.</span>
            </>
          )
        }
        description={
          page?.description ||
          "Roles are listed with the organisation, title and dates. Where there is more to say, the entry links to a longer page."
        }
        aside={
          <div className="border-t border-line pt-4 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
            <div className="flex items-center justify-between gap-6">
              <span>Roles</span>
              <span className="text-paper">
                {experience.loading ? "..." : String(entries.length).padStart(2, "0")}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-6">
              <span>Includes</span>
              <span className="text-right text-paper">Organisation, dates, work</span>
            </div>
          </div>
        }
      />

      <Container className="py-12 sm:py-16">
        {!experience.loading && experience.error ? (
          <ErrorState
            message="We couldn't load the experience. Please try again in a moment."
            onRetry={experience.reload}
          />
        ) : null}

        {!experience.loading && !experience.error && entries.length === 0 ? (
          <EmptyState
            title="No experience yet"
            description="Roles will appear here once they are added."
            action={
              <Link to="/resume" className={buttonStyles("secondary", "sm")}>
                View resume
              </Link>
            }
          />
        ) : null}

        {!experience.loading && !experience.error && entries.length > 0 ? (
          <ol>
            {entries.map((entry, index) => (
              <li
                key={entry.id}
                className="border-t border-line py-8 first:border-t-0 first:pt-0 sm:py-10"
              >
                <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-14">
                  <div>
                    <span className="font-mono text-[0.56rem] tracking-[0.18em] text-signal">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <p className="mt-4 font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted">
                      {formatRange(entry.started_on, entry.ended_on, entry.is_current)}
                    </p>
                    {entry.location ? (
                      <p className="mt-1 text-xs text-faint">{entry.location}</p>
                    ) : null}
                    {entry.is_current ? (
                      <div className="mt-3">
                        <Badge tone="signal">Current</Badge>
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-2xl font-medium tracking-tight text-paper sm:text-3xl">
                          {entry.title}
                        </h2>
                        <p className="mt-1 text-sm text-signal-soft">{entry.organization}</p>
                      </div>
                      {entry.slug ? (
                        <Link
                          to={`/experience/${entry.slug}`}
                          className={buttonStyles("secondary", "sm")}
                        >
                          Read more
                          <ArrowUpRight className="size-3.5" aria-hidden="true" />
                        </Link>
                      ) : null}
                    </div>
                    {entry.description ? (
                      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
                        {entry.description}
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        ) : null}

        <div className="mt-14 flex flex-col gap-5 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-sm leading-relaxed text-muted">
            The resume brings this experience together with projects, leadership, skills and
            certificates.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link to="/resume" className={buttonStyles("secondary", "sm")}>
              Resume
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
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
