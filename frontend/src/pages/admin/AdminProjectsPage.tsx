import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Copy,
  Eye,
  GitBranch,
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
import { adminProjectsService } from "@/services/adminProjects.service";
import { githubService } from "@/services/github.service";
import type { AdminProject, PublishStatus } from "@/types/api";
import { cn } from "@/utils/cn";
import { relativeTime } from "@/utils/format";
import { PROJECT_STAGE_LABELS } from "@/utils/projects";

const STATUS_TABS: Array<{ value: "" | PublishStatus; label: string }> = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

function projectSource(project: AdminProject): string {
  if (project.github_repository_id) return "GitHub";
  if (project.repository_url || project.external_url || project.external_project_url) {
    return "External";
  }
  return "Manual";
}

export default function AdminProjectsPage() {
  const projects = useApiQuery(
    (signal) => adminProjectsService.listProjects({}, signal),
    [],
  );
  const github = useApiQuery((signal) => githubService.status(signal), []);
  const [statusFilter, setStatusFilter] = useState<"" | PublishStatus>("");
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
        project.category.name.toLowerCase().includes(term)
      );
    });
  }, [all, search, statusFilter]);

  const reorderEnabled = !statusFilter && !search.trim();

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

  const changeStatus = (project: AdminProject, status: PublishStatus) => {
    if (status === "archived" && project.status !== "archived") {
      const confirmed = window.confirm(
        `Archive "${project.title}"? It will be hidden from your website until you publish it again.`,
      );
      if (!confirmed) return;
    }
    void run(
      `${project.id}:${status}`,
      () => adminProjectsService.setProjectStatus(project.id, status),
      `"${project.title}" ${
        status === "draft" ? "saved as a draft." : status === "published" ? "published." : "archived."
      }`,
    );
  };

  const duplicate = (project: AdminProject) => {
    void run(
      `${project.id}:duplicate`,
      () => adminProjectsService.duplicateProject(project.id),
      `Created a draft copy of ${project.title}.`,
    );
  };

  const remove = (project: AdminProject) => {
    const confirmed = window.confirm(
      `Delete "${project.title}"? This cannot be undone.`,
    );
    if (!confirmed) return;
    void run(
      `${project.id}:delete`,
      () => adminProjectsService.deleteProject(project.id),
      `"${project.title}" was deleted.`,
    );
  };

  const move = (project: AdminProject, direction: -1 | 1) => {
    const ordered = [...all].sort((a, b) => a.sort_order - b.sort_order);
    const index = ordered.findIndex((item) => item.id === project.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    const swapped = [...ordered];
    [swapped[index], swapped[target]] = [swapped[target], swapped[index]];
    void run(
      `${project.id}:reorder`,
      () => adminProjectsService.reorderProjects(swapped.map((item) => item.id)),
      "Project order saved.",
    );
  };

  return (
    <>
      <div className="flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-signal">
            Work
          </p>
          <h1 className="mt-3 text-3xl font-medium tracking-tight text-paper sm:text-4xl">
            Projects
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            Add, edit and publish the projects shown on your website. You can also archive
            projects and change the order they appear in.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/projects/new" className={buttonStyles("secondary", "md")}>
            <Plus className="size-4" aria-hidden="true" />
            Add project
          </Link>
          <Link to="/admin/github" className={buttonStyles("primary", "md")}>
            <GitBranch className="size-4" aria-hidden="true" />
            Import from GitHub
          </Link>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 border border-line bg-ink-800/40 px-4 py-3 text-xs text-paper-dim">
        <GitBranch className="size-4 text-signal" aria-hidden="true" />
        <span>
          {github.loading
            ? "Checking GitHub..."
            : github.data?.connected
              ? `GitHub connected as @${github.data.connection?.username ?? "unknown"}${
                  github.data.connection?.repository_count != null
                    ? ` · ${github.data.connection.repository_count.toLocaleString()} repositories`
                    : ""
                }. Imported projects start as drafts, and syncing never overwrites content you have edited.`
              : github.data?.configured
                ? "GitHub is not connected. Connect an account to import repositories. You can still add projects manually."
                : "GitHub is not set up on this server. You can still add projects manually."}
        </span>
        <Link
          to="/admin/integrations/github"
          className="ml-auto inline-flex items-center gap-1 font-mono text-[0.54rem] uppercase tracking-[0.12em] text-signal hover:underline"
        >
          {github.data?.connected ? "Manage connection" : "GitHub settings"}
          <ArrowUpRight className="size-3" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter projects by publish status">
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
            placeholder="Search projects"
            aria-label="Search projects"
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
        {projects.loading ? <LoadingState rows={4} label="Loading projects" /> : null}
        {!projects.loading && projects.error ? (
          <ErrorState
            message="We couldn't load your projects. Please try again."
            onRetry={projects.reload}
          />
        ) : null}
        {!projects.loading && !projects.error && all.length === 0 ? (
          <EmptyState
            title="No projects yet"
            description="Add your first project. It stays private until you publish it."
            action={
              <Link to="/admin/projects/new" className={buttonStyles("secondary", "sm")}>
                <Plus className="size-3.5" aria-hidden="true" />
                Add project
              </Link>
            }
          />
        ) : null}
        {!projects.loading && !projects.error && all.length > 0 && items.length === 0 ? (
          <EmptyState
            title="No projects match this view"
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
            <div className="hidden grid-cols-[2.5rem_minmax(0,1fr)_7rem_9rem_7rem_8rem_6rem_11rem] gap-4 border-b border-line bg-ink-800/50 px-4 py-3 font-mono text-[0.54rem] uppercase tracking-[0.14em] text-muted xl:grid">
              <span>Order</span>
              <span>Project</span>
              <span>Source</span>
              <span>Category</span>
              <span>Stage</span>
              <span>Status</span>
              <span>Updated</span>
              <span className="text-right">Actions</span>
            </div>
            <ul className="divide-y divide-line">
              {items.map((project) => (
                <li
                  key={project.id}
                  className="grid gap-3 px-4 py-4 xl:grid-cols-[2.5rem_minmax(0,1fr)_7rem_9rem_7rem_8rem_6rem_11rem] xl:items-center xl:gap-4"
                >
                  <div className="flex items-center gap-2 font-mono text-[0.58rem] text-faint">
                    <span className="tabular-nums">{String(project.sort_order).padStart(3, "0")}</span>
                    {reorderEnabled ? (
                      <span className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => move(project, -1)}
                          disabled={busy !== null}
                          aria-label={`Move ${project.title} up`}
                          className="text-muted hover:text-paper disabled:opacity-30"
                        >
                          <ArrowUp className="size-3" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => move(project, 1)}
                          disabled={busy !== null}
                          aria-label={`Move ${project.title} down`}
                          className="text-muted hover:text-paper disabled:opacity-30"
                        >
                          <ArrowDown className="size-3" aria-hidden="true" />
                        </button>
                      </span>
                    ) : null}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/admin/projects/${project.id}`}
                        className="truncate text-sm font-medium text-paper hover:text-signal-soft"
                      >
                        {project.title}
                      </Link>
                      {project.featured ? (
                        <span className="font-mono text-[0.5rem] uppercase tracking-[0.14em] text-signal">
                          Featured
                        </span>
                      ) : null}
                      {project.github_repository_id ? (
                        <span
                          className="inline-flex items-center gap-1 font-mono text-[0.5rem] uppercase tracking-[0.14em] text-signal-soft"
                          title={project.github_owner ? `Linked to ${project.github_owner}/${project.github_repository_name}` : "Linked to GitHub"}
                        >
                          <GitBranch className="size-3" aria-hidden="true" />
                          GitHub
                        </span>
                      ) : null}
                      {project.is_placeholder ? (
                        <span className="font-mono text-[0.5rem] uppercase tracking-[0.14em] text-warning">
                          Placeholder
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate font-mono text-[0.54rem] uppercase tracking-[0.12em] text-muted">
                      /{project.slug} · updated {relativeTime(project.updated_at)}
                    </p>
                  </div>

                  <span className="font-mono text-[0.54rem] uppercase tracking-[0.12em] text-muted">
                    {projectSource(project)}
                  </span>
                  <span className="text-xs text-paper-dim">{project.category.name}</span>
                  <span className="font-mono text-[0.54rem] uppercase tracking-[0.12em] text-muted">
                    {PROJECT_STAGE_LABELS[project.project_status]}
                  </span>
                  <StatusBadge status={project.status} />
                  <span
                    className="font-mono text-[0.54rem] uppercase tracking-[0.12em] text-muted"
                    title={project.updated_at}
                  >
                    {relativeTime(project.updated_at)}
                  </span>

                  <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
                    <Link
                      to={`/admin/projects/${project.id}`}
                      className="inline-flex size-8 items-center justify-center border border-line text-muted transition-colors hover:border-paper hover:text-paper"
                      aria-label={`Edit ${project.title}`}
                    >
                      <Pencil className="size-3.5" aria-hidden="true" />
                    </Link>
                    <a
                      href={`/admin/projects/${project.id}/preview`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex size-8 items-center justify-center border border-line text-muted transition-colors hover:border-paper hover:text-paper"
                      aria-label={`Preview ${project.title}`}
                      title={
                        project.status === "published"
                          ? "Open the public page"
                          : "Preview this project before publishing"
                      }
                    >
                      <Eye className="size-3.5" aria-hidden="true" />
                    </a>
                    <button
                      type="button"
                      onClick={() => duplicate(project)}
                      disabled={busy !== null}
                      className="inline-flex size-8 items-center justify-center border border-line text-muted transition-colors hover:border-paper hover:text-paper disabled:opacity-40"
                      aria-label={`Duplicate ${project.title}`}
                    >
                      <Copy className="size-3.5" aria-hidden="true" />
                    </button>
                    {project.status !== "published" ? (
                      <button
                        type="button"
                        onClick={() => changeStatus(project, "published")}
                        disabled={busy !== null}
                        className="inline-flex h-8 items-center border border-line px-2 font-mono text-[0.5rem] uppercase tracking-[0.1em] text-paper-dim transition-colors hover:border-paper hover:text-paper disabled:opacity-40"
                      >
                        Publish
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => changeStatus(project, "draft")}
                        disabled={busy !== null}
                        className="inline-flex h-8 items-center border border-line px-2 font-mono text-[0.5rem] uppercase tracking-[0.1em] text-paper-dim transition-colors hover:border-paper hover:text-paper disabled:opacity-40"
                      >
                        Unpublish
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
          Showing {items.length} of {all.length} projects
        </span>
        <Link to="/work" className="inline-flex items-center gap-1.5 hover:text-paper">
          View work page
          <ArrowUpRight className="size-3" aria-hidden="true" />
        </Link>
      </p>
    </>
  );
}
