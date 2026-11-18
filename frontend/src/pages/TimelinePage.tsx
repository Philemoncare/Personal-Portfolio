import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

import { PageIntro } from "@/components/layout/PageIntro";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ErrorState } from "@/components/ui/states";
import { PageSkeleton } from "@/components/ui/skeletons";
import { Timeline } from "@/features/timeline/Timeline";
import { useTimelineEntries } from "@/hooks/useContent";
import { usePageContent, usePageSeo } from "@/app/ContentProvider";

export default function TimelinePage() {
  const timeline = useTimelineEntries();
  const page = usePageContent("timeline");

  usePageSeo("timeline", {
    title: "Timeline | A professional chronology",
    description:
      "An editorial chronology of education, projects, technical work, leadership, and milestones — linked to the records behind each entry.",
    path: "/timeline",
  });

  const entries = timeline.data ?? [];
  const years = Array.from(
    new Set(
      entries.map((entry) =>
        entry.start_date
          ? new Date(`${entry.start_date}T00:00:00Z`).getUTCFullYear()
          : entry.year,
      ),
    ),
  ).sort((a, b) => b - a);
  const kinds = new Set(entries.map((entry) => entry.kind));

  if (timeline.loading && !timeline.data) {
    return <PageSkeleton label="Loading timeline" />;
  }

  return (
    <>
      <PageIntro
        eyebrow={page?.eyebrow || "Timeline"}
        title={
          page?.title ? (
            page.title
          ) : (
            <>
              A record, not a{" "}
              <span className="display-serif text-signal">resume.</span>
            </>
          )
        }
        description={
          page?.description ||
          "Milestones grouped by the year they belong to. Entries link to the projects, experience, and leadership records behind them rather than repeating the same content in two places."
        }
        aside={
          <div className="border-t border-line pt-4 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
            <div className="flex items-center justify-between gap-6">
              <span>Published entries</span>
              <span className="text-paper">
                {timeline.loading ? "—" : String(entries.length).padStart(2, "0")}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-6">
              <span>Years covered</span>
              <span className="text-paper">
                {timeline.loading ? "—" : String(years.length).padStart(2, "0")}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-6">
              <span>Entry types</span>
              <span className="text-paper">
                {timeline.loading ? "—" : String(kinds.size).padStart(2, "0")}
              </span>
            </div>
          </div>
        }
      />

      <Container className="py-12 sm:py-16">
        {!timeline.loading && timeline.error ? (
          <ErrorState
            message="The timeline could not be loaded. The API may be unavailable — try again in a moment."
            onRetry={timeline.reload}
          />
        ) : null}

        {!timeline.loading && !timeline.error ? (
          <Timeline
            entries={entries}
            emptyTitle="No timeline entries are published yet"
            emptyDescription="Milestones appear here once they are confirmed and published from the admin panel. Nothing is backfilled or invented."
          />
        ) : null}

        <div className="mt-16 flex flex-col gap-5 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-sm leading-relaxed text-muted">
            The professional record, current focus, and full profile live on their own pages. The
            timeline connects them by date.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link to="/experience" className={buttonStyles("secondary", "sm")}>
              Experience record
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
            <Link to="/about" className={buttonStyles("ghost", "sm")}>
              About the profile
            </Link>
          </div>
        </div>
      </Container>
    </>
  );
}
