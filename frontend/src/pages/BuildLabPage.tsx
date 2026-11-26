import { Link } from "react-router-dom";

import { PageIntro } from "@/components/layout/PageIntro";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { ProjectCard } from "@/components/work/project-card";
import { useApiResource } from "@/hooks/useApiResource";
import { usePageContent, usePageSeo } from "@/app/ContentProvider";
import type { ListResponse, ProjectSummary } from "@/types/api";

const CATEGORIES = ["Web", "APIs", "Cloud", "Automation", "Experiments", "Open Source"];

export default function BuildLabPage() {
  const projects = useApiResource<ListResponse<ProjectSummary>>(
    "/api/v1/projects?category=experiments&limit=50",
  );

  usePageSeo("build-lab", {
    title: "Build Lab | Philemon Melabah",
    description:
      "Smaller builds, prototypes, automations and technical experiments.",
    path: "/build-lab",
  });

  const page = usePageContent("build-lab");

  const items = projects.data?.items ?? [];

  return (
    <>
      <PageIntro
        eyebrow={page?.eyebrow || "Build Lab"}
        title={
          page?.title ? (
            page.title
          ) : (
            <>
              Smaller builds{" "}
              <span className="display-serif text-signal">and experiments.</span>
            </>
          )
        }
        description={
          page?.description ||
          "Prototypes, automations and technical experiments. The aim is to learn something useful and leave behind something that works."
        }
        aside={
          <div className="border-t border-line pt-4 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
            <div className="flex items-center justify-between gap-6">
              <span>Projects</span>
              <span className="text-paper">
                {projects.loading ? "..." : String(projects.data?.total ?? 0).padStart(2, "0")}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-6">
              <span>Areas</span>
              <span className="text-paper">{String(CATEGORIES.length).padStart(2, "0")}</span>
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
            Areas
          </span>
        </div>

        <div className="mt-10">
          {projects.loading ? <LoadingState rows={3} label="Loading projects" /> : null}
          {!projects.loading && projects.error ? (
            <ErrorState message="We couldn't load the Build Lab projects. Please try again in a moment." onRetry={projects.reload} />
          ) : null}
          {!projects.loading && !projects.error && items.length === 0 ? (
            <EmptyState
              title="No Build Lab projects yet"
              description="Smaller builds and experiments will appear here once they are published."
              action={
                <Link to="/work" className={buttonStyles("secondary", "sm")}>
                  Browse projects
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
