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
              Projects I have{" "}
              <span className="display-serif text-signal">built and run.</span>
            </span>
          }
          description="A small selection of projects. Each one links to what it does and how it was built."
          action={
            <Link to="/work" className={buttonStyles("secondary", "sm")}>
              All projects
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          }
        />

        <div className="mt-12">
          {loading ? <LoadingState rows={4} label="Loading selected work" /> : null}
          {!loading && error ? <ErrorState message={error.detail} onRetry={reload} /> : null}
          {!loading && !error && projects.length === 0 ? (
            <EmptyState
              title="No featured projects yet"
              description="Featured projects will appear here when they are marked as featured."
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
            ? "Loading projects"
            : `${String(projects.length).padStart(2, "0")} selected project${
                projects.length === 1 ? "" : "s"
              }`}
        </p>
      </Container>
    </section>
  );
}
