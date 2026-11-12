import { Link } from "react-router-dom";

import { PageIntro } from "@/components/layout/PageIntro";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { ProjectCard } from "@/components/work/project-card";
import { useApiResource } from "@/hooks/useApiResource";
import { useSeo } from "@/hooks/useSeo";
import type { ListResponse, ProjectSummary } from "@/types/api";

const CATEGORIES = ["Web", "APIs", "Cloud", "Automation", "Experiments", "Open Source"];

export default function BuildLabPage() {
  const projects = useApiResource<ListResponse<ProjectSummary>>(
    "/api/v1/projects?category=experiments&limit=50",
  );

  useSeo({
    title: "Build Lab — Phill",
    description:
      "A working lab of technical experiments, smaller builds, automations, and open-source work.",
    path: "/build-lab",
  });

  const items = projects.data?.items ?? [];

  return (
    <>
      <PageIntro
        eyebrow="Build Lab"
        title={
          <>
            Where ideas get{" "}
            <span className="display-serif text-signal">tested.</span>
          </>
        }
        description="Smaller builds, prototypes, automations, and technical experiments. This is the part of the practice where the objective is learning something concrete — and leaving a useful artefact behind."
        aside={
          <div className="border-t border-line pt-4 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
            <div className="flex items-center justify-between gap-6">
              <span>Published experiments</span>
              <span className="text-paper">
                {projects.loading ? "—" : String(projects.data?.total ?? 0).padStart(2, "0")}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-6">
              <span>Categories</span>
              <span className="text-paper">06</span>
            </div>
          </div>
        }
      />

      <Container className="py-12 sm:py-16">
        <div className="flex flex-wrap gap-2 border-b border-line pb-6">
          {CATEGORIES.map((category) => (
            <span
              key={category}
              className="border border-line px-3 py-2 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted"
            >
              {category}
            </span>
          ))}
          <span className="px-2 py-2 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-faint">
            Lab taxonomy
          </span>
        </div>

        <div className="mt-10">
          {projects.loading ? <LoadingState rows={3} label="Loading experiments" /> : null}
          {!projects.loading && projects.error ? (
            <ErrorState message={projects.error.detail} onRetry={projects.reload} />
          ) : null}
          {!projects.loading && !projects.error && items.length === 0 ? (
            <EmptyState
              title="The Build Lab is currently empty"
              description="This section is reserved for verified experiments and smaller technical projects. Add one from the admin panel and assign it to the Experiments category."
              action={
                <Link to="/work" className={buttonStyles("secondary", "sm")}>
                  View the main work index
                </Link>
              }
            />
          ) : null}
          {!projects.loading && !projects.error && items.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {items.map((project, index) => (
                <ProjectCard key={project.id} project={project} index={index + 1} />
              ))}
            </div>
          ) : null}
        </div>
      </Container>
    </>
  );
}
