import { ArrowUpRight, FileText, Inbox, Layers, Mail } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useApiResource } from "@/hooks/useApiResource";
import type { AdminOverview } from "@/types/api";
import { relativeTime } from "@/utils/format";

const PLANNED_MODULES = [
  { name: "Data Lab", phase: "Phase 3" },
  { name: "Build Lab", phase: "Phase 3" },
  { name: "Experience", phase: "Phase 3" },
  { name: "Leadership", phase: "Phase 3" },
  { name: "Skills", phase: "Phase 3" },
  { name: "Certificates", phase: "Phase 3" },
  { name: "Articles", phase: "Later" },
  { name: "Timeline", phase: "Phase 3" },
  { name: "Now", phase: "Phase 3" },
  { name: "Site settings", phase: "Phase 3" },
];

export default function AdminDashboardPage() {
  const overview = useApiResource<AdminOverview>("/api/v1/admin/overview");
  const data = overview.data;

  return (
    <>
      <div className="flex flex-col gap-5 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-signal">
            Content Overview
          </p>
          <h1 className="mt-3 text-3xl font-medium tracking-tight text-paper sm:text-4xl">
            Control Center
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            Live database state and content control surface. Projects and case studies can be
            created, edited, published, and archived from here.
          </p>
        </div>
        {data?.admin.email ? (
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted">
            Signed in as <span className="text-paper">{data.admin.email}</span>
          </p>
        ) : null}
      </div>

      {overview.loading ? (
        <div className="mt-8">
          <LoadingState rows={4} label="Loading dashboard" />
        </div>
      ) : null}

      {!overview.loading && overview.error ? (
        <div className="mt-8">
          <ErrorState
            message={
              overview.error.status === 401
                ? "The administrator session has expired. Sign out and sign in again."
                : overview.error.detail
            }
            onRetry={overview.reload}
          />
        </div>
      ) : null}

      {!overview.loading && !overview.error && data ? (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Published projects", value: data.published_projects, icon: Layers },
              { label: "Case studies", value: data.case_studies, icon: FileText },
              { label: "Unread messages", value: data.unread_messages, icon: Mail },
              { label: "Total messages", value: data.total_messages, icon: Inbox },
            ].map((stat) => (
              <div key={stat.label} className="border border-line bg-surface p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-[0.56rem] uppercase tracking-[0.16em] text-muted">
                    {stat.label}
                  </p>
                  <stat.icon className="size-4 text-signal" aria-hidden="true" />
                </div>
                <p className="mt-5 text-3xl font-medium tabular-nums tracking-tight text-paper sm:text-4xl">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <section className="border border-line bg-surface/50" aria-labelledby="recent-projects-heading">
              <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
                <h2
                  id="recent-projects-heading"
                  className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted"
                >
                  Recent projects
                </h2>
                <Link
                  to="/work"
                  className="inline-flex items-center gap-1.5 font-mono text-[0.56rem] uppercase tracking-[0.14em] text-muted hover:text-paper"
                >
                  Public index
                  <ArrowUpRight className="size-3" aria-hidden="true" />
                </Link>
              </div>

              {data.recent_projects.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    title="No projects in the database"
                    description="Run the seed command or create projects once the editor is available."
                  />
                </div>
              ) : (
                <ul className="divide-y divide-line">
                  {data.recent_projects.map((project) => (
                    <li key={project.id} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-surface-raised/40 transition-colors">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium text-paper">
                            <Link
                              to={`/admin/projects/${project.id}`}
                              className="hover:text-signal"
                            >
                              {project.title}
                            </Link>
                          </p>
                          {project.is_placeholder ? (
                            <Badge tone="placeholder">Placeholder</Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 truncate font-mono text-[0.55rem] uppercase tracking-[0.12em] text-muted">
                          /{project.slug} · updated {relativeTime(project.updated_at)}
                        </p>
                      </div>
                      <Badge tone={project.status === "published" ? "signal" : "muted"}>
                        {project.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="border border-line bg-surface/50" aria-labelledby="status-heading">
              <div className="border-b border-line px-5 py-4">
                <h2
                  id="status-heading"
                  className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted"
                >
                  Content status
                </h2>
              </div>
              <dl className="divide-y divide-line">
                {Object.entries(data.project_counts).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between gap-4 px-5 py-3.5">
                    <dt className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted">
                      {status}
                    </dt>
                    <dd className="text-sm tabular-nums text-paper font-medium">{count}</dd>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <dt className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted">
                    Leadership entries
                  </dt>
                  <dd className="text-sm tabular-nums text-paper font-medium">{data.leadership_entries}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <dt className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted">
                    Case studies
                  </dt>
                  <dd className="text-sm tabular-nums text-paper font-medium">{data.case_studies}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <dt className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted">
                    Now items
                  </dt>
                  <dd className="text-sm tabular-nums text-paper font-medium">{data.now_items}</dd>
                </div>
              </dl>
            </section>
          </div>

          <section className="mt-8 border border-line bg-surface/50" aria-labelledby="messages-heading">
            <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
              <h2
                id="messages-heading"
                className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted"
              >
                Recent messages
              </h2>
              <Badge tone="outline">Inbox storage live</Badge>
            </div>

            {data.recent_messages.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="No messages yet"
                  description="Contact submissions are stored in the database and will appear here. The public form is already functional."
                  action={
                    <Link to="/contact" className={buttonStyles("secondary", "sm")}>
                      Open public contact form
                      <ArrowUpRight className="size-3.5" aria-hidden="true" />
                    </Link>
                  }
                />
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {data.recent_messages.map((message) => (
                  <li key={message.id} className="px-5 py-4 hover:bg-surface-raised/40 transition-colors">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-paper">{message.subject}</p>
                        <p className="mt-1 text-xs text-muted">
                          {message.name} · {message.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={message.status === "new" ? "signal" : "muted"}>
                          {message.status}
                        </Badge>
                        <span className="font-mono text-[0.55rem] uppercase tracking-[0.12em] text-faint">
                          {relativeTime(message.created_at)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-8 grid gap-4 sm:grid-cols-2" aria-label="Work management">
            <Link
              to="/admin/projects"
              className="group border border-line bg-surface p-5 transition-colors hover:border-line-strong hover:bg-surface-raised"
            >
              <div className="flex items-center justify-between gap-3">
                <Layers className="size-4 text-signal" aria-hidden="true" />
                <ArrowUpRight className="size-3.5 text-muted transition-colors group-hover:text-paper" aria-hidden="true" />
              </div>
              <p className="mt-5 font-mono text-[0.56rem] uppercase tracking-[0.16em] text-muted">
                Work system
              </p>
              <p className="mt-1.5 text-lg font-medium text-paper">Manage projects</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                Create, edit, preview, publish, archive, duplicate, and reorder project
                records.
              </p>
            </Link>
            <Link
              to="/admin/case-studies"
              className="group border border-line bg-surface p-5 transition-colors hover:border-line-strong hover:bg-surface-raised"
            >
              <div className="flex items-center justify-between gap-3">
                <FileText className="size-4 text-signal" aria-hidden="true" />
                <ArrowUpRight className="size-3.5 text-muted transition-colors group-hover:text-paper" aria-hidden="true" />
              </div>
              <p className="mt-5 font-mono text-[0.56rem] uppercase tracking-[0.16em] text-muted">
                Case studies
              </p>
              <p className="mt-1.5 text-lg font-medium text-paper">Write the engineering story</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                Edit every section, hide what is not ready, and publish only real content.
              </p>
            </Link>
          </section>

          <section className="mt-8" aria-labelledby="modules-heading">
            <div className="flex items-end justify-between gap-4 border-b border-line pb-4">
              <div>
                <h2
                  id="modules-heading"
                  className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted"
                >
                  Next modules
                </h2>
                <p className="mt-1.5 text-xs text-muted">
                  These editors are planned for expansion.
                </p>
              </div>
              <span className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-faint">
                {PLANNED_MODULES.length} planned
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {PLANNED_MODULES.map((module) => (
                <div key={module.name} className="flex items-center justify-between gap-3 border border-line bg-surface px-4 py-3">
                  <span className="text-xs text-paper-dim">{module.name}</span>
                  <span className="font-mono text-[0.52rem] uppercase tracking-[0.12em] text-faint">
                    {module.phase}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}
