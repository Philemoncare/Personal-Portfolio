import { ArrowLeft, Eye } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { PageIntro } from "@/components/layout/PageIntro";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { ProjectDetailContent } from "@/components/work/ProjectDetailContent";
import { useApiResource } from "@/hooks/useApiResource";
import { useSeo } from "@/hooks/useSeo";
import type { ProjectDetail } from "@/types/api";

export default function AdminProjectPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const project = useApiResource<ProjectDetail>(
    id ? `/api/v1/admin/projects/${encodeURIComponent(id)}/preview` : null,
  );

  const data = project.data;

  useSeo({
    title: data ? `Preview: ${data.title} | Philemon Melabah` : "Project preview",
    description: null,
    noIndex: true,
  });

  const backTo = id ? `/admin/projects/${id}` : "/admin/projects";

  return (
    <div className="min-h-screen bg-ink-950">
      <div className="sticky top-0 z-50 border-b border-signal/40 bg-ink-900">
        <Container className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 border border-signal/40 bg-signal/10 px-2 py-1 font-mono text-[0.56rem] uppercase tracking-[0.14em] text-signal">
              <Eye className="size-3" aria-hidden="true" />
              Preview
            </span>
            <span className="font-mono text-[0.56rem] uppercase tracking-[0.12em] text-muted">
              Not public
            </span>
          </div>
          <Link
            to={backTo}
            className={buttonStyles("secondary", "sm")}
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Back to editor
          </Link>
        </Container>
      </div>

      {project.loading ? (
        <>
          <PageIntro eyebrow="Work / Preview" title="Loading preview..." />
          <Container className="py-10">
            <LoadingState rows={5} label="Loading project preview" />
          </Container>
        </>
      ) : null}

      {!project.loading && project.error ? (
        <>
          <PageIntro eyebrow="Work / Preview" title="Preview unavailable" />
          <Container className="py-10">
            {project.error.status === 404 ? (
              <EmptyState
                title="Project not found"
                description="This project no longer exists."
                action={
                  <Link to="/admin/projects" className={buttonStyles("secondary", "sm")}>
                    Back to projects
                  </Link>
                }
              />
            ) : (
              <ErrorState
                message="We couldn't load the preview. Please try again in a moment."
                onRetry={project.reload}
              />
            )}
          </Container>
        </>
      ) : null}

      {!project.loading && !project.error && data ? (
        <ProjectDetailContent
          data={data}
          backTo={backTo}
          backLabel="Back to editor"
          preview
        />
      ) : null}
    </div>
  );
}
