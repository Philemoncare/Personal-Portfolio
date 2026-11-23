import { ArrowUpRight, BarChart3, Eye, FileText, Globe, Inbox, Layers, Mail, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiResource } from "@/hooks/useApiResource";
import { analyticsService } from "@/services/analytics.service";
import type { AdminOverview } from "@/types/api";
import { relativeTime } from "@/utils/format";

const WORKSPACES = [
  { name: "Data Lab", to: "/admin/data", note: "Data projects and analysis" },
  { name: "Experience", to: "/admin/experience", note: "Roles and organizations" },
  { name: "Leadership", to: "/admin/leadership", note: "Community work" },
  { name: "Articles", to: "/admin/articles", note: "Written articles" },
  { name: "Timeline", to: "/admin/timeline", note: "Key dates" },
  { name: "Now", to: "/admin/now", note: "Current focus" },
  { name: "Pages & SEO", to: "/admin/pages", note: "Page titles and search info" },
  { name: "Settings", to: "/admin/settings", note: "Branding and footer" },
];

export default function AdminDashboardPage() {
  const overview = useApiResource<AdminOverview>("/api/v1/admin/overview");
  const analytics = useApiQuery((signal) => analyticsService.overview("30d", signal), []);
  const data = overview.data;

  return (
    <>
      <div className="flex flex-col gap-5 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-signal">
            Dashboard
          </p>
          <h1 className="mt-3 text-3xl font-medium tracking-tight text-paper sm:text-4xl">
            Dashboard
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            A summary of your content. Create, edit and publish projects, case studies and
            other pages from here.
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
                ? "Your session has expired. Sign in again."
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

          {/* Website Traffic Overview */}
          <section className="mt-8 border border-line bg-surface/50 p-5 sm:p-6" aria-labelledby="traffic-heading">
            <div className="flex items-center justify-between gap-4 border-b border-line pb-4">
              <div>
                <h2 id="traffic-heading" className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-signal">
                  Website Traffic Overview
                </h2>
                <p className="mt-1 text-xs text-muted">
                  Real visitor activity across your public website (Last 30 Days).
                </p>
              </div>
              <Link
                to="/admin/analytics"
                className="inline-flex items-center gap-1.5 font-mono text-[0.56rem] uppercase tracking-[0.14em] text-muted hover:text-paper"
              >
                Full Analytics Report
                <ArrowUpRight className="size-3" aria-hidden="true" />
              </Link>
            </div>

            {analytics.loading ? (
              <div className="mt-4">
                <LoadingState rows={1} label="Loading traffic stats" />
              </div>
            ) : analytics.data ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
                <div className="border border-line bg-ink-950 p-3.5">
                  <p className="font-mono text-[0.54rem] uppercase tracking-[0.14em] text-muted">Visitors Today</p>
                  <p className="mt-2 text-2xl font-semibold text-paper">{analytics.data.visitors_today.toLocaleString()}</p>
                </div>
                <div className="border border-line bg-ink-950 p-3.5">
                  <p className="font-mono text-[0.54rem] uppercase tracking-[0.14em] text-muted">This Week</p>
                  <p className="mt-2 text-2xl font-semibold text-paper">{analytics.data.visitors_this_week.toLocaleString()}</p>
                </div>
                <div className="border border-line bg-ink-950 p-3.5">
                  <p className="font-mono text-[0.54rem] uppercase tracking-[0.14em] text-muted">This Month</p>
                  <p className="mt-2 text-2xl font-semibold text-paper">{analytics.data.visitors_this_month.toLocaleString()}</p>
                </div>
                <div className="border border-line bg-ink-950 p-3.5">
                  <p className="font-mono text-[0.54rem] uppercase tracking-[0.14em] text-muted">Total Visitors</p>
                  <p className="mt-2 text-2xl font-semibold text-paper">{analytics.data.total_visitors.toLocaleString()}</p>
                </div>
                <div className="border border-line bg-ink-950 p-3.5">
                  <p className="font-mono text-[0.54rem] uppercase tracking-[0.14em] text-muted">Page Views</p>
                  <p className="mt-2 text-2xl font-semibold text-accent">{analytics.data.page_views.toLocaleString()}</p>
                </div>
                <div className="border border-line bg-ink-950 p-3.5">
                  <p className="font-mono text-[0.54rem] uppercase tracking-[0.14em] text-muted">Active Now</p>
                  <p className="mt-2 text-2xl font-semibold text-signal">{analytics.data.active_now.toLocaleString()}</p>
                </div>
              </div>
            ) : null}
          </section>

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
                  View work page
                  <ArrowUpRight className="size-3" aria-hidden="true" />
                </Link>
              </div>

              {data.recent_projects.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    title="No projects yet"
                    description="Add your first project to see it here."
                    action={
                      <Link to="/admin/projects/new" className={buttonStyles("secondary", "sm")}>
                        Add project
                      </Link>
                    }
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
                  Content summary
                </h2>
              </div>
              <dl className="divide-y divide-line">
                {Object.entries(data.project_counts).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between gap-4 px-5 py-3.5">
                    <dt className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted">
                      {status.replace(/_/g, " ")}
                    </dt>
                    <dd className="text-sm tabular-nums text-paper font-medium">{count}</dd>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <dt className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted">
                    Leadership
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
                    Now updates
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
              <Badge tone="outline">Inbox</Badge>
            </div>

            {data.recent_messages.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="No messages yet"
                  description="Messages sent from your contact form will appear here."
                  action={
                    <Link to="/contact" className={buttonStyles("secondary", "sm")}>
                      Open contact form
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
                Projects
              </p>
              <p className="mt-1.5 text-lg font-medium text-paper">Manage projects</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                Add, edit and publish the projects shown on your website.
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
              <p className="mt-1.5 text-lg font-medium text-paper">Write a case study</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                Explain how a project was planned, built and tested. Publish only what is ready.
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
                  Manage content
                </h2>
                <p className="mt-1.5 text-xs text-muted">
                  Edit the content that appears on your website.
                </p>
              </div>
              <span className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-faint">
                {WORKSPACES.length} sections
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {WORKSPACES.map((module) => (
                <Link
                  key={module.name}
                  to={module.to}
                  className="group flex items-center justify-between gap-3 border border-line bg-surface px-4 py-3 transition-colors hover:border-paper"
                >
                  <span className="min-w-0">
                    <span className="block text-xs text-paper">{module.name}</span>
                    <span className="mt-0.5 block truncate font-mono text-[0.5rem] uppercase tracking-[0.1em] text-faint">
                      {module.note}
                    </span>
                  </span>
                  <ArrowUpRight
                    className="size-3.5 shrink-0 text-muted transition-colors group-hover:text-paper"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}
