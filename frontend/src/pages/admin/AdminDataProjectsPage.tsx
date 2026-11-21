import {
  ArrowUpRight,
  Eye,
  FlaskConical,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { StatusBadge } from "@/components/admin/form";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useApiQuery } from "@/hooks/useApiQuery";
import { adminDataService } from "@/services/adminData.service";
import type { AdminDataProject, DataProjectStatus } from "@/types/api";
import { cn } from "@/utils/cn";
import {
  DATA_PROJECT_TYPE_LABELS,
} from "@/utils/data";
import { relativeTime } from "@/utils/format";

const STATUS_TABS: Array<{ value: "" | DataProjectStatus; label: string }> = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "experiment", label: "Experiment" },
  { value: "archived", label: "Archived" },
];

export default function AdminDataProjectsPage() {
  const projects = useApiQuery(
    (signal) => adminDataService.listProjects({}, signal),
    [],
  );
  const [statusFilter, setStatusFilter] = useState<"" | DataProjectStatus>("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const all = projects.data ?? [];

  const counts = useMemo(() => {
    const result = new Map<string, number>();
    for (const project of all) {
      result.set(project.status, (result.get(project.status) ?? 0) + 1);
    }
    return result;
  }, [all]);

  const items = useMemo(() => {
    const term = search.trim().toLowerCase();
    return all.filter((project) => {
      if (statusFilter && project.status !== statusFilter) return false;
      if (!term) return true;
      return (
        project.title.toLowerCase().includes(term) ||
        project.slug.toLowerCase().includes(term) ||
        project.category.name.toLowerCase().includes(term) ||
        project.tools.some((tool) => tool.name.toLowerCase().includes(term))
      );
    });
  }, [all, search, statusFilter]);

  const run = async (key: string, action: () => Promise<unknown>, message: string) => {
    setBusy(key);
    setNotice(null);
    try {
      await action();
      projects.reload();
      setNotice(message);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const changeStatus = (project: AdminDataProject, status: DataProjectStatus) => {
    if (status === "archived" && project.status !== "archived") {
      const confirmed = window.confirm(
        `Archive "${project.title}"? It will be hidden from the public Data Lab until you publish it again.`,
      );
      if (!confirmed) return;
    }
    void run(
      `${project.id}:${status}`,
      () => adminDataService.setStatus(project.id, status),
      `"${project.title}" ${
        status === "draft"
          ? "saved as a draft."
          : status === "published"
            ? "published."
            : status === "experiment"
              ? "marked as an experiment."
              : "archived."
      }`,
    );
  };

  const remove = (project: AdminDataProject) => {
    const confirmed = window.confirm(
      `Delete "${project.title}"? Its charts, insights and resources will be removed too. This cannot be undone.`,
    );
    if (!confirmed) return;
    void run(
      `${project.id}:delete`,
      () => adminDataService.deleteProject(project.id),
      `"${project.title}" was deleted.`,
    );
  };

  return (
    <>
      <div className="flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-signal">
            Data Lab
          </p>
          <h1 className="mt-3 text-3xl font-medium tracking-tight text-paper sm:text-4xl">
            Data projects
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            Add, edit and publish your data projects. Charts, insights and resources are saved
            with each project.
          </p>
        </div>
        <Link to="/admin/data/new" className={buttonStyles("primary", "md")}>
          <Plus className="size-4" aria-hidden="true" />
          Add data project
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Filter data projects by publish status"
        >
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value || "all"}
              type="button"
              aria-pressed={statusFilter === tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={cn(
                "border px-3 py-2 font-mono text-[0.58rem] uppercase tracking-[0.14em] transition-colors",
                statusFilter === tab.value
                  ? "border-paper bg-paper text-ink-950"
                  : "border-line text-paper-dim hover:border-line-strong",
              )}
            >
              {tab.label}
              <span className="ml-2 text-[0.52rem] opacity-70">
                {tab.value ? counts.get(tab.value) ?? 0 : all.length}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full lg:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search data projects"
            aria-label="Search data projects"
            className="h-10 w-full border border-line bg-ink-950 pl-9 pr-3 text-sm text-paper placeholder:text-faint focus:border-line-strong focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
          />
        </div>
      </div>

      {notice ? (
        <p
          role="status"
          className="mt-4 border border-line bg-ink-800/60 px-4 py-3 text-sm text-paper-dim"
        >
          {notice}
        </p>
      ) : null}

      <div className="mt-6">
        {projects.loading ? <LoadingState rows={4} label="Loading data projects" /> : null}        {!projects.loading && projects.error ? (
          <ErrorState
            message="We couldn't load your data projects. Please try again."
            onRetry={projects.reload}
          />
        ) : null}
        {!projects.loading && !projects.error && all.length === 0 ? (
          <EmptyState
            title="No data projects yet"
            description="Add your first data project. It starts as a private draft and only appears on your website once you publish it."
            action={
              <Link to="/admin/data/new" className={buttonStyles("secondary", "sm")}>
                <Plus className="size-3.5" aria-hidden="true" />
                Add data project
              </Link>
            }
          />
        ) : null}
        {!projects.loading && !projects.error && all.length > 0 && items.length === 0 ? (
          <EmptyState
            title="No data projects match this view"
            description="Try a different status or clear your search."
            action={
              <button
                type="button"
                className={buttonStyles("secondary", "sm")}
                onClick={() => {
                  setSearch("");
                  setStatusFilter("");
                }}
              >
                Clear filters
              </button>
            }
          />
        ) : null}

        {items.length > 0 ? (
          <div className="border border-line">
            <div className="hidden grid-cols-[minmax(0,1fr)_9rem_8rem_7rem_13rem] gap-4 border-b border-line bg-ink-800/50 px-4 py-3 font-mono text-[0.54rem] uppercase tracking-[0.14em] text-muted lg:grid">
              <span>Analysis</span>
              <span>Category</span>
              <span>Type</span>
              <span>Status</span>
              <span className="text-right">Actions</span>
            </div>
            <ul className="divide-y divide-line">
              {items.map((project) => (
                <li
                  key={project.id}
                  className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_9rem_8rem_7rem_13rem] lg:items-center lg:gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/admin/data/${project.id}`}
                        className="truncate text-sm font-medium text-paper hover:text-signal-soft"
                      >
                        {project.title}
                      </Link>
                      {project.featured ? (
                        <span className="font-mono text-[0.5rem] uppercase tracking-[0.14em] text-signal">
                          Featured
                        </span>
                      ) : null}
                      {project.is_demo ? (
                        <span className="font-mono text-[0.5rem] uppercase tracking-[0.14em] text-signal-soft">
                          Sample
                        </span>
                      ) : null}
                      {project.is_placeholder ? (
                        <span className="font-mono text-[0.5rem] uppercase tracking-[0.14em] text-warning">
                          Placeholder
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate font-mono text-[0.54rem] uppercase tracking-[0.12em] text-muted">
                      /{project.slug} · {project.visualizations.length} chart
                      {project.visualizations.length === 1 ? "" : "s"} · updated{" "}
                      {relativeTime(project.updated_at)}
                    </p>
                  </div>

                  <span className="text-xs text-paper-dim">{project.category.name}</span>
                  <span className="font-mono text-[0.54rem] uppercase tracking-[0.12em] text-muted">
                    {DATA_PROJECT_TYPE_LABELS[project.project_type]}
                  </span>
                  <StatusBadge status={project.status} />

                  <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
                    <Link
                      to={`/admin/data/${project.id}`}
                      className="inline-flex size-8 items-center justify-center border border-line text-muted transition-colors hover:border-paper hover:text-paper"
                      aria-label={`Edit ${project.title}`}
                    >
                      <Pencil className="size-3.5" aria-hidden="true" />
                    </Link>
                    <a
                      href={`/admin/data/${project.id}/preview`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex size-8 items-center justify-center border border-line text-muted transition-colors hover:border-paper hover:text-paper"
                      aria-label={`Preview ${project.title}`}
                      title="Preview this project before publishing"
                    >
                      <Eye className="size-3.5" aria-hidden="true" />
                    </a>
                    {project.status === "published" ? (
                      <>
                        <a
                          href={`/data/${project.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-8 items-center border border-line px-2 font-mono text-[0.5rem] uppercase tracking-[0.1em] text-paper-dim transition-colors hover:border-paper hover:text-paper"
                        >
                          View
                        </a>
                        <button
                          type="button"
                          onClick={() => changeStatus(project, "draft")}
                          disabled={busy !== null}
                          className="inline-flex h-8 items-center border border-line px-2 font-mono text-[0.5rem] uppercase tracking-[0.1em] text-paper-dim transition-colors hover:border-paper hover:text-paper disabled:opacity-40"
                        >
                          Unpublish
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => changeStatus(project, "published")}
                        disabled={busy !== null}
                        className="inline-flex h-8 items-center border border-line px-2 font-mono text-[0.5rem] uppercase tracking-[0.1em] text-paper-dim transition-colors hover:border-paper hover:text-paper disabled:opacity-40"
                      >
                        Publish
                      </button>
                    )}
                    {project.status !== "archived" ? (
                      <button
                        type="button"
                        onClick={() => changeStatus(project, "archived")}
                        disabled={busy !== null}
                        className="inline-flex h-8 items-center border border-line px-2 font-mono text-[0.5rem] uppercase tracking-[0.1em] text-muted transition-colors hover:border-warning hover:text-warning disabled:opacity-40"
                      >
                        Archive
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => changeStatus(project, "draft")}
                        disabled={busy !== null}
                        className="inline-flex h-8 items-center border border-line px-2 font-mono text-[0.5rem] uppercase tracking-[0.1em] text-muted transition-colors hover:border-paper hover:text-paper disabled:opacity-40"
                      >
                        Restore
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(project)}
                      disabled={busy !== null}
                      className="inline-flex size-8 items-center justify-center border border-line text-muted transition-colors hover:border-signal hover:text-signal disabled:opacity-40"
                      aria-label={`Delete ${project.title}`}
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <p className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 font-mono text-[0.54rem] uppercase tracking-[0.12em] text-faint">
        <span>
          {items.length} of {all.length} projects
        </span>
        <Link to="/data-lab" className="inline-flex items-center gap-1.5 hover:text-paper">
          <FlaskConical className="size-3" aria-hidden="true" />
          View Data Lab
          <ArrowUpRight className="size-3" aria-hidden="true" />
        </Link>
      </p>
    </>
  );
}
