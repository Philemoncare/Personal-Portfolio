import {
  Archive,
  ArrowUpRight,
  Eye,
  FileSearch,
  GitBranch,
  GitFork,
  Globe2,
  Lock,
  RefreshCw,
  Search,
  Star,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { buttonStyles } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useApiQuery } from "@/hooks/useApiQuery";
import { githubService, type RepositoryQuery } from "@/services/github.service";
import type { GitHubRepository } from "@/types/api";
import { cn } from "@/utils/cn";
import { formatDate, relativeTime } from "@/utils/format";

type View =
  | "all"
  | "public"
  | "private"
  | "archived"
  | "active"
  | "forks"
  | "originals";

const VIEWS: Array<{ value: View; label: string }> = [
  { value: "all", label: "All" },
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
  { value: "archived", label: "Archived" },
  { value: "active", label: "Active" },
  { value: "forks", label: "Forks" },
  { value: "originals", label: "Originals" },
];

function filtersFor(view: View): Pick<RepositoryQuery, "visibility" | "archived" | "fork"> {
  switch (view) {
    case "public":
      return { visibility: "public" };
    case "private":
      return { visibility: "private" };
    case "archived":
      return { archived: "true" };
    case "active":
      return { archived: "false" };
    case "forks":
      return { fork: "true" };
    case "originals":
      return { fork: "false" };
    default:
      return {};
  }
}

function StatusPill({ label, tone = "default" }: { label: string; tone?: "default" | "good" | "warn" }) {
  if (!label) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center border px-1.5 py-0.5 font-mono text-[0.48rem] uppercase tracking-[0.12em]",
        tone === "good" && "border-signal/40 bg-signal/10 text-signal",
        tone === "warn" && "border-warning/40 bg-warning/10 text-warning",
        tone === "default" && "border-line text-muted",
      )}
    >
      {label}
    </span>
  );
}

function repositoryStatus(repo: GitHubRepository): { label: string; tone: "default" | "good" | "warn" } {
  if (!repo.linked_project_id) return { label: "Not imported", tone: "default" };
  if (repo.import_state === "published") return { label: "Published", tone: "good" };
  if (repo.import_state === "archived") return { label: "Archived", tone: "warn" };
  return { label: "Draft", tone: "warn" };
}

function syncStatus(repo: GitHubRepository): { label: string; tone: "good" | "warn" } | null {
  if (!repo.linked_project_id) return null;
  if (repo.sync_available) return { label: "Sync available", tone: "warn" };
  if (repo.last_synced_at) return { label: "Synced", tone: "good" };
  return null;
}

function Metric({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Star;
  value: number;
  label: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 font-mono text-[0.58rem] tabular-nums text-muted"
      title={`${value} ${label}`}
    >
      <Icon className="size-3" aria-hidden="true" />
      {value.toLocaleString()}
      <span className="sr-only">{label}</span>
    </span>
  );
}

function RepositoryRow({ repo }: { repo: GitHubRepository }) {
  const status = repositoryStatus(repo);
  const sync = syncStatus(repo);
  return (
    <li className="grid gap-4 px-4 py-5 xl:grid-cols-[minmax(0,1fr)_12rem_11rem_10rem_11rem] xl:items-start">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/admin/github/${repo.id}`}
            className="truncate text-sm font-medium text-paper hover:text-signal-soft"
          >
            {repo.full_name}
          </Link>
          {repo.archived ? <StatusPill label="Archived" tone="warn" /> : null}
          {repo.fork ? <StatusPill label="Fork" /> : null}
          <StatusPill label={status.label} tone={status.tone} />
          {sync ? <StatusPill label={sync.label} tone={sync.tone} /> : null}
        </div>
        <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-paper-dim">
          {repo.description || "No description provided on GitHub."}
        </p>
        {repo.fork ? (
          <p className="mt-1.5 text-[0.68rem] leading-relaxed text-warning">
            Fork of another repository. Attribute the original work before publishing.
          </p>
        ) : null}
        {repo.topics.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {repo.topics.slice(0, 5).map((topic) => (
              <span key={topic} className="border border-line px-1.5 py-0.5 font-mono text-[0.52rem] text-muted">
                {topic}
              </span>
            ))}
            {repo.topics.length > 5 ? (
              <span className="font-mono text-[0.52rem] text-faint">+{repo.topics.length - 5}</span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="space-y-1 text-xs text-muted">
        <p className="flex items-center gap-1.5 text-paper-dim">
          {repo.private ? (
            <Lock className="size-3" aria-hidden="true" />
          ) : (
            <Globe2 className="size-3" aria-hidden="true" />
          )}
          {repo.visibility}
        </p>
        <p className="truncate">Owner: {repo.owner}</p>
        <p className="flex items-center gap-1.5">
          <GitBranch className="size-3" aria-hidden="true" />
          {repo.default_branch}
        </p>
        <p>License: {repo.license || "Not specified"}</p>
      </div>

      <div className="space-y-1.5 text-xs">
        <p className="text-paper-dim">{repo.language || "No primary language"}</p>
        <div className="flex flex-wrap gap-3">
          <Metric icon={Star} value={repo.stargazers_count} label="stars" />
          <Metric icon={GitFork} value={repo.forks_count} label="forks" />
          <Metric icon={Eye} value={repo.watchers_count} label="watchers" />
        </div>
        <p className="font-mono text-[0.54rem] text-faint">
          Updated {repo.updated_at ? relativeTime(repo.updated_at) : "unknown"}
        </p>
      </div>

      <div className="space-y-1 font-mono text-[0.54rem] uppercase tracking-[0.1em] text-faint">
        <p>Created {repo.created_at ? formatDate(repo.created_at) : "unknown"}</p>
        <p>Pushed {repo.pushed_at ? formatDate(repo.pushed_at) : "unknown"}</p>
        {repo.homepage ? (
          <a
            href={repo.homepage}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 normal-case tracking-normal text-signal hover:underline"
          >
            Homepage
            <ArrowUpRight className="size-3" aria-hidden="true" />
          </a>
        ) : (
          <p className="normal-case tracking-normal">No homepage</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 xl:justify-end">
        <Link
          to={`/admin/github/${repo.id}`}
          className={buttonStyles(repo.linked_project_id ? "outline" : "primary", "sm")}
        >
          <FileSearch className="size-3.5" aria-hidden="true" />
          {repo.linked_project_id ? "Inspect" : "Inspect & import"}
        </Link>
        {repo.linked_project_id ? (
          <Link
            to={`/admin/projects/${repo.linked_project_id}`}
            className={buttonStyles("ghost", "sm")}
          >
            Open project
          </Link>
        ) : null}
        <a
          href={repo.html_url}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open ${repo.full_name} on GitHub`}
          className="inline-flex size-9 items-center justify-center border border-line text-muted transition-colors hover:border-paper hover:text-paper"
        >
          <GitBranch className="size-3.5" aria-hidden="true" />
        </a>
      </div>
    </li>
  );
}

type SortKey = "updated" | "name" | "stars" | "created";

function sortRepositories(items: GitHubRepository[], key: SortKey): GitHubRepository[] {
  const time = (value: string | null) => (value ? new Date(value).getTime() : 0);
  return [...items].sort((a, b) => {
    if (key === "name") return a.full_name.localeCompare(b.full_name);
    if (key === "stars") return b.stargazers_count - a.stargazers_count;
    if (key === "created") return time(b.created_at) - time(a.created_at);
    return time(b.updated_at) - time(a.updated_at);
  });
}

function RepositoryBrowser() {
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [view, setView] = useState<View>("all");
  const [language, setLanguage] = useState("");
  const [sort, setSort] = useState<SortKey>("updated");
  const [limit, setLimit] = useState(30);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    setLimit(30);
  }, [term, view, language, sort]);

  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const query = useApiQuery(
    (signal) =>
      githubService.listRepositories(
        {
          search: term,
          ...filtersFor(view),
          per_page: 100,
          refresh: nonce > 0,
        },
        signal,
      ),
    [term, view, nonce],
  );

  const repositories = query.data?.items ?? [];
  const languages = useMemo(
    () =>
      Array.from(new Set(repositories.map((repo) => repo.language).filter(Boolean) as string[])).sort(
        (a, b) => a.localeCompare(b),
      ),
    [repositories],
  );
  const visible = useMemo(() => {
    const filtered = language
      ? repositories.filter((repo) => (repo.language || "").toLowerCase() === language.toLowerCase())
      : repositories;
    return sortRepositories(filtered, sort);
  }, [repositories, language, sort]);
  const shown = visible.slice(0, limit);

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter repositories">
          {VIEWS.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={view === item.value}
              onClick={() => setView(item.value)}
              className={cn(
                "border px-3 py-2 font-mono text-[0.58rem] uppercase tracking-[0.14em] transition-colors",
                view === item.value
                  ? "border-paper bg-paper text-ink-950"
                  : "border-line text-paper-dim hover:border-line-strong",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="sr-only" htmlFor="github-sort">
            Sort repositories
          </label>
          <select
            id="github-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            className="h-10 border border-line bg-background px-3 font-mono text-[0.62rem] uppercase tracking-[0.08em] text-paper focus:border-line-strong focus:outline-none"
          >
            <option value="updated">Recently updated</option>
            <option value="created">Newest</option>
            <option value="stars">Most stars</option>
            <option value="name">Name A–Z</option>
          </select>
          <label className="sr-only" htmlFor="github-language">
            Filter by language
          </label>
          <select
            id="github-language"
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            className="h-10 border border-line bg-background px-3 font-mono text-[0.62rem] uppercase tracking-[0.08em] text-paper focus:border-line-strong focus:outline-none"
          >
            <option value="">All languages</option>
            {languages.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <div className="relative w-full sm:w-72">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, description, topics, language…"
              aria-label="Search repositories"
              className="h-10 w-full border border-line bg-background pl-9 pr-3 text-sm text-paper placeholder:text-faint focus:border-line-strong focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setNonce((value) => value + 1)}
            className={buttonStyles("outline", "md")}
            title="Refresh repository metadata from GitHub"
          >
            <RefreshCw className={cn("size-3.5", query.loading && "animate-spin")} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      {query.loading ? <LoadingState rows={4} label="Loading GitHub repositories" className="mt-6" /> : null}
      {!query.loading && query.error ? (
        <div className="mt-6">
          <ErrorState message={query.error.message} onRetry={query.reload} />
        </div>
      ) : null}
      {!query.loading && !query.error && repositories.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No repositories found"
            description={
              term || view !== "all" || language
                ? "Change the search, filter, or language to see more repositories."
                : "This GitHub account has no repositories visible to the granted scopes."
            }
            action={
              term || view !== "all" || language ? (
                <button
                  type="button"
                  className={buttonStyles("secondary", "sm")}
                  onClick={() => {
                    setSearch("");
                    setView("all");
                    setLanguage("");
                  }}
                >
                  Reset filters
                </button>
              ) : undefined
            }
          />
        </div>
      ) : null}

      {visible.length > 0 ? (
        <div className="mt-6 border border-line">
          <div className="hidden grid-cols-[minmax(0,1fr)_12rem_11rem_10rem_11rem] gap-4 border-b border-line bg-ink-800/50 px-4 py-3 font-mono text-[0.54rem] uppercase tracking-[0.14em] text-muted xl:grid">
            <span>Repository</span>
            <span>Access</span>
            <span>Stats</span>
            <span>Dates</span>
            <span className="text-right">Actions</span>
          </div>
          <ul className="divide-y divide-line">
            {shown.map((repo) => (
              <RepositoryRow key={repo.id} repo={repo} />
            ))}
          </ul>
          {visible.length > shown.length ? (
            <div className="border-t border-line px-4 py-3 text-center">
              <button
                type="button"
                onClick={() => setLimit((value) => value + 30)}
                className={buttonStyles("outline", "sm")}
              >
                Load {Math.min(30, visible.length - shown.length)} more
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 font-mono text-[0.54rem] uppercase tracking-[0.12em] text-faint">
        <span>
          Showing {shown.length} of {visible.length} loaded repositories
          {query.data?.truncated ? " · result limit reached" : ""}
        </span>
        <span className="flex flex-wrap items-center gap-3">
          {query.data?.rate_limit_remaining != null ? (
            <span>Rate limit remaining: {query.data.rate_limit_remaining}</span>
          ) : null}
          <Link to="/admin/integrations/github" className="inline-flex items-center gap-1.5 hover:text-paper">
            Integration settings
            <ArrowUpRight className="size-3" aria-hidden="true" />
          </Link>
        </span>
      </div>
    </>
  );
}

export default function AdminGitHubRepositoriesPage() {
  const status = useApiQuery((signal) => githubService.status(signal), []);

  return (
    <>
      <div className="flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-signal">
            Import from GitHub
          </p>
          <h1 className="mt-3 text-3xl font-medium tracking-tight text-paper sm:text-4xl">
            Repositories
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            Metadata is listed first. README, files, and images are only fetched when you inspect a
            repository. Imports always create drafts and never publish.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/projects" className={buttonStyles("ghost", "md")}>
            Back to projects
          </Link>
          <Link to="/admin/integrations/github" className={buttonStyles("secondary", "md")}>
            <GitBranch className="size-4" aria-hidden="true" />
            GitHub connection
          </Link>
        </div>
      </div>

      {status.data?.connected ? (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border border-line bg-ink-800/40 px-4 py-3 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-muted">
          <span className="inline-flex items-center gap-2 text-paper">
            <GitBranch className="size-3.5 text-signal" aria-hidden="true" />
            Connected as @{status.data.connection?.username ?? "unknown"}
          </span>
          <span>
            Repositories:{" "}
            {status.data.connection?.repository_count === null ||
            status.data.connection?.repository_count === undefined
              ? "not counted yet"
              : status.data.connection.repository_count.toLocaleString()}
          </span>
          <span>
            Access:{" "}
            {status.data.connection?.private_repository_access
              ? "public + private"
              : "public only"}
          </span>
        </div>
      ) : null}

      <div className="mt-6">
        {status.loading ? <LoadingState rows={3} label="Checking GitHub connection" /> : null}
        {!status.loading && status.error ? (
          <ErrorState message={status.error.message} onRetry={status.reload} />
        ) : null}
        {!status.loading && status.data && !status.data.configured ? (
          <EmptyState
            title="GitHub is not configured"
            description="Add the OAuth client ID, secret, and redirect URI to the backend environment, then restart the API."
            action={
              <Link to="/admin/integrations/github" className={buttonStyles("primary", "sm")}>
                Open integration settings
              </Link>
            }
          />
        ) : null}
        {!status.loading && status.data && status.data.configured && !status.data.connected ? (
          <EmptyState
            title="Connect GitHub to browse repositories"
            description="The backend stores the OAuth token encrypted. This browser never receives it."
            action={
              <Link to="/admin/integrations/github" className={buttonStyles("primary", "sm")}>
                <GitBranch className="size-3.5" aria-hidden="true" />
                Connect GitHub
              </Link>
            }
          />
        ) : null}
        {!status.loading && status.data?.connected ? <RepositoryBrowser /> : null}
      </div>

      {status.data?.connection?.private_repository_access ? (
        <p className="mt-6 flex items-start gap-2 border border-warning/40 bg-warning/10 px-4 py-3 text-xs leading-relaxed text-paper-dim">
          <Lock className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden="true" />
          Private repositories are visible to this admin. Importing one creates a private draft;
          nothing becomes public until you explicitly publish the project.
        </p>
      ) : null}

      <div className="mt-8 flex items-center gap-2 font-mono text-[0.54rem] uppercase tracking-[0.12em] text-faint">
        <Archive className="size-3" aria-hidden="true" />
        Archived and forked repositories are labelled and can still be inspected.
      </div>
    </>
  );
}
