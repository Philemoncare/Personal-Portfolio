import { ArrowUpRight, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { StatusBadge } from "@/components/admin/form";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useApiQuery } from "@/hooks/useApiQuery";
import { adminProjectsService } from "@/services/adminProjects.service";
import type { AdminCaseStudy, AdminProject } from "@/types/api";
import { relativeTime } from "@/utils/format";

export default function AdminCaseStudiesPage() {
  const studies = useApiQuery(
    (signal) => adminProjectsService.listCaseStudies(signal),
    [],
  );
  const projects = useApiQuery(
    (signal) => adminProjectsService.listProjects({}, signal),
    [],
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const projectTitles = useMemo(() => {
    const map = new Map<string, AdminProject>();
    for (const project of projects.data ?? []) map.set(project.id, project);
    return map;
  }, [projects.data]);

  const remove = async (study: AdminCaseStudy) => {
    const confirmed = window.confirm(
      `Delete "${study.title}" permanently? The project itself is not deleted.`,
    );
    if (!confirmed) return;
    setBusy(`${study.id}:delete`);
    setNotice(null);
    try {
      await adminProjectsService.deleteCaseStudy(study.id);
      studies.reload();
      setNotice(`"${study.title}" was deleted.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The case study could not be deleted.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-signal">
            Work system
          </p>
          <h1 className="mt-3 text-3xl font-medium tracking-tight text-paper sm:text-4xl">
            Case studies
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            The long-form engineering record behind a project. Each section renders only when
            it contains real content, and you can hide individual sections without deleting
            them.
          </p>
        </div>
        <Link to="/admin/case-studies/new" className={buttonStyles("primary", "md")}>
          <Plus className="size-4" aria-hidden="true" />
          New case study
        </Link>
      </div>

      {notice ? (
        <p role="status" className="mt-4 border border-line bg-ink-800/60 px-4 py-3 text-sm text-paper-dim">
          {notice}
        </p>
      ) : null}

      <div className="mt-6">
        {studies.loading ? <LoadingState rows={4} label="Loading case studies" /> : null}
        {!studies.loading && studies.error ? (
          <ErrorState message="The case-study list could not be loaded." onRetry={studies.reload} />
        ) : null}
        {!studies.loading && !studies.error && (studies.data?.length ?? 0) === 0 ? (
          <EmptyState
            title="No case studies yet"
            description="A case study turns a project into an engineering narrative: problem, context, decisions, implementation, and what changed."
            action={
              <Link to="/admin/case-studies/new" className={buttonStyles("secondary", "sm")}>
                <Plus className="size-3.5" aria-hidden="true" />
                Write the first case study
              </Link>
            }
          />
        ) : null}

        {(studies.data?.length ?? 0) > 0 ? (
          <div className="border border-line">
            <div className="hidden grid-cols-[minmax(0,1fr)_11rem_7rem_8rem_9rem] gap-4 border-b border-line bg-ink-800/50 px-4 py-3 font-mono text-[0.54rem] uppercase tracking-[0.14em] text-muted lg:grid">
              <span>Case study</span>
              <span>Project</span>
              <span>Status</span>
              <span>Updated</span>
              <span className="text-right">Actions</span>
            </div>
            <ul className="divide-y divide-line">
              {studies.data?.map((study) => {
                const project = study.project_id
                  ? projectTitles.get(study.project_id)
                  : undefined;
                return (
                  <li
                    key={study.id}
                    className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_11rem_7rem_8rem_9rem] lg:items-center lg:gap-4"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/admin/case-studies/${study.id}`}
                          className="truncate text-sm font-medium text-paper hover:text-signal-soft"
                        >
                          {study.title}
                        </Link>
                        {study.featured ? (
                          <span className="font-mono text-[0.5rem] uppercase tracking-[0.14em] text-signal">
                            Featured
                          </span>
                        ) : null}
                        {study.is_placeholder ? (
                          <span className="font-mono text-[0.5rem] uppercase tracking-[0.14em] text-warning">
                            Placeholder
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 truncate font-mono text-[0.54rem] uppercase tracking-[0.12em] text-muted">
                        /case-studies/{study.slug}
                      </p>
                    </div>

                    <span className="truncate text-xs text-paper-dim">
                      {project ? project.title : "Not linked"}
                    </span>
                    <StatusBadge status={study.status} />
                    <span className="font-mono text-[0.54rem] uppercase tracking-[0.12em] text-muted">
                      {relativeTime(study.updated_at)}
                    </span>

                    <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
                      <Link
                        to={`/admin/case-studies/${study.id}`}
                        className="inline-flex size-8 items-center justify-center border border-line text-muted transition-colors hover:border-paper hover:text-paper"
                        aria-label={`Edit ${study.title}`}
                      >
                        <Pencil className="size-3.5" aria-hidden="true" />
                      </Link>
                      {study.status === "published" ? (
                        <a
                          href={`/case-studies/${study.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex size-8 items-center justify-center border border-line text-muted transition-colors hover:border-paper hover:text-paper"
                          aria-label={`Preview ${study.title}`}
                        >
                          <Eye className="size-3.5" aria-hidden="true" />
                        </a>
                      ) : (
                        <span
                          className="inline-flex size-8 items-center justify-center border border-line/60 text-faint"
                          title="Publish the case study to open its public page"
                        >
                          <Eye className="size-3.5" aria-hidden="true" />
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => remove(study)}
                        disabled={busy !== null}
                        className="inline-flex size-8 items-center justify-center border border-line text-muted transition-colors hover:border-signal hover:text-signal disabled:opacity-40"
                        aria-label={`Delete ${study.title}`}
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>

      <p className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 font-mono text-[0.54rem] uppercase tracking-[0.12em] text-faint">
        <span>{studies.data?.length ?? 0} case studies in the database</span>
        <Link to="/work" className="inline-flex items-center gap-1.5 hover:text-paper">
          Public work index
          <ArrowUpRight className="size-3" aria-hidden="true" />
        </Link>
      </p>
    </>
  );
}
