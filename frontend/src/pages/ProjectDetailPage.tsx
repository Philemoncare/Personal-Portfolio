import { ArrowLeft } from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";

import { PageIntro } from "@/components/layout/PageIntro";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { ProjectDetailContent } from "@/components/work/ProjectDetailContent";
import { useApiResource } from "@/hooks/useApiResource";
import { useSeo } from "@/hooks/useSeo";
import type { ProjectDetail } from "@/types/api";

export default function ProjectDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const isBuildLab = location.pathname.startsWith("/build-lab");
  const basePath = isBuildLab ? "/build-lab" : "/work";
  const project = useApiResource<ProjectDetail>(
    slug ? `/api/v1/projects/${encodeURIComponent(slug)}` : null,
  );

  const data = project.data;

  useSeo({
    title: data
      ? data.seo_title || `${data.title} — ${data.category.name} | Philemon Melabah`
      : "Project — Philemon Melabah",
    description:
      data?.seo_description ??
      data?.summary ??
      "Project record from Philemon Melabah's portfolio.",
    path: slug ? `${basePath}/${slug}` : undefined,
    image: data?.og_image ?? data?.cover_image_url ?? null,
    imageAlt: data ? `${data.title} project cover` : null,
  });

  if (data) {
    return (
      <ProjectDetailContent
        data={data}
        basePath={basePath}
        backTo={basePath}
        backLabel={isBuildLab ? "Back to Build Lab" : "Back to work"}
      />
    );
  }

  return (
    <>
      <PageIntro
        eyebrow={isBuildLab ? "Build Lab / Project" : "Work / Project"}
        title={project.loading ? "Loading project…" : "Project"}
      />

      <Container className="py-10 sm:py-14">
        <Link
          to={basePath}
          className="inline-flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted transition-colors hover:text-paper"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          {isBuildLab ? "Back to Build Lab" : "Back to work"}
        </Link>

        {project.loading ? (
          <div className="mt-10">
            <LoadingState rows={5} label="Loading project" />
          </div>
        ) : null}

        {!project.loading && project.error ? (
          <div className="mt-10">
            {project.error.status === 404 ? (
              <EmptyState
                title="Project not found"
                description="The project you're looking for doesn't exist, or it is no longer publicly available."
                action={
                  <Link to={basePath} className={buttonStyles("secondary", "sm")}>
                    {isBuildLab ? "Back to Build Lab" : "Back to work"}
                  </Link>
                }
              />
            ) : (
              <ErrorState
                message="This project could not be loaded. The API may be unavailable — try again in a moment."
                onRetry={project.reload}
              />
            )}
          </div>
        ) : null}
      </Container>
    </>
  );
}
