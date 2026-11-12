import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { EditorialProjectRow, FeaturedProject } from "@/components/work/editorial-project";
import { useFeaturedProjects } from "@/hooks/useContent";

export function SelectedWork() {
  const { data, loading, error, reload } = useFeaturedProjects(4);
  const projects = data?.items ?? [];

  return (
    <section
      id="selected-work"
      className="scroll-mt-24 border-t border-line py-20 sm:py-28"
      aria-labelledby="selected-work-heading"
    >
      <Container>
        <SectionHeader
          index="01"
          eyebrow="Selected work"
          title={
            <span id="selected-work-heading">
              Systems built for{" "}
              <span className="display-serif text-signal">real use.</span>
            </span>
          }
          description="A short edit of the work that best represents the practice. Each record links to the project, its context, and the technical decisions behind it."
          action={
            <Link to="/work" className={buttonStyles("secondary", "sm")}>
              Full work index
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          }
        />

        <div className="mt-12">
          {loading ? <LoadingState rows={4} label="Loading selected work" /> : null}
          {!loading && error ? <ErrorState message={error.detail} onRetry={reload} /> : null}
          {!loading && !error && projects.length === 0 ? (
            <EmptyState
              title="No featured projects are published"
              description="Selected work appears here once projects are marked as featured and published from the admin panel."
              action={
                <Link to="/work" className={buttonStyles("secondary", "sm")}>
                  Browse all projects
                </Link>
              }
            />
          ) : null}

          {!loading && !error && projects.length > 0 ? (
            <div className="space-y-12 sm:space-y-16">
              <Reveal>
                <FeaturedProject project={projects[0]} index={1} />
              </Reveal>

              {projects[1] ? (
                <Reveal delay={0.05}>
                  <FeaturedProject project={projects[1]} index={2} reverse />
                </Reveal>
              ) : null}

              {projects.length > 2 ? (
                <Reveal delay={0.08}>
                  <div>
                    {projects.slice(2, 4).map((project, index) => (
                      <EditorialProjectRow
                        key={project.id}
                        project={project}
                        index={index + 3}
                      />
                    ))}
                  </div>
                </Reveal>
              ) : null}
            </div>
          ) : null}
        </div>

        <p className="mt-10 border-t border-line pt-4 font-mono text-[0.56rem] uppercase tracking-[0.14em] text-faint">
          {loading
            ? "Reading the project index"
            : `${String(projects.length).padStart(2, "0")} selected record${
                projects.length === 1 ? "" : "s"
              } / served by the content API`}
        </p>
      </Container>
    </section>
  );
}
