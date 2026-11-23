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
import { experienceService } from "@/services/experience.service";
import { formatRange } from "@/utils/format";

export default function ExperienceDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const experience = useApiQuery(
    (signal) =>
      slug
        ? experienceService.getBySlug(slug, signal)
        : Promise.reject(new Error("Missing experience slug")),
    [slug],
  );

  const entry = experience.data;

  useSeo({
    title: entry
      ? `${entry.title} at ${entry.organization} | Experience`
      : "Experience | Philemon Melabah",
    description: entry?.description ?? "A role by Philemon Melabah.",
    path: slug ? `/experience/${slug}` : undefined,
  });

  if (experience.loading) {
    return (
      <Container className="py-16">
        <DetailSkeleton label="Loading role" />
      </Container>
    );
  }

  if (experience.error) {
    return (
      <>
        <PageIntro eyebrow="Experience / Role" title="Role" />
        <Container className="py-14">
          {experience.error.status === 404 ? (
            <EmptyState
              title="Role not found"
              description="This role does not exist or is no longer public."
              action={
                <Link to="/experience" className={buttonStyles("secondary", "sm")}>
                  Back to Experience
                </Link>
              }
            />
          ) : (
            <ErrorState
              message="We couldn't load this role. Please try again in a moment."
              onRetry={experience.reload}
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
        eyebrow="Experience / Role"
        title={
          <>
            {entry.title}.{" "}
            <span className="display-serif text-signal">{entry.organization}</span>
          </>
        }
        description={entry.description ?? "A role from my experience."}
        aside={
          <div className="border-t border-line pt-4 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
            <div className="flex items-center justify-between gap-6">
              <span>Period</span>
              <span className="text-right text-paper">
                {formatRange(entry.started_on, entry.ended_on, entry.is_current)}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-6">
              <span>Location</span>
              <span className="text-right text-paper">{entry.location || "Not listed"}</span>
            </div>
          </div>
        }
      />

      <Container className="py-12 sm:py-16">
        <Link
          to="/experience"
          className="inline-flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted transition-colors hover:text-paper"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to Experience
        </Link>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_18rem] lg:gap-16">
          <div>
            <h2 className="text-2xl font-medium tracking-tight text-paper">The role</h2>
            <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-paper-dim">
              {entry.description ||
                "No longer description has been added yet. The organisation, title and dates are listed below."}
            </p>

            <div className="mt-8 border border-line bg-ink-800/40 p-5">
              <p className="font-mono text-[0.56rem] uppercase tracking-[0.16em] text-muted">
                Related work
              </p>
              <p className="mt-2 text-sm leading-relaxed text-paper-dim">
                Projects and leadership work from this period are listed on their own pages.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/work" className={buttonStyles("secondary", "sm")}>
                  All projects
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </Link>
                <Link to="/timeline" className={buttonStyles("ghost", "sm")}>
                  Timeline
                </Link>
              </div>
            </div>
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
                  Organisation
                </dt>
                <dd className="mt-1 text-sm text-paper">{entry.organization}</dd>
              </div>
              <div className="px-5 py-4">
                <dt className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-muted">
                  Status
                </dt>
                <dd className="mt-2">
                  <Badge tone={entry.is_current ? "signal" : "muted"}>
                    {entry.is_current ? "Current" : "Previous"}
                  </Badge>
                </dd>
              </div>
            </dl>
          </aside>
        </div>
      </Container>
    </>
  );
}
