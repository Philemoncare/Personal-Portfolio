import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileSearch,
  Folder,
  FolderOpen,
  GitBranch,
  Image as ImageIcon,
  Info,
  LoaderCircle,
  Lock,
  RefreshCw,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { AdminPanel, Checkbox, Field, Select, TextArea, TextInput } from "@/components/admin/form";
import { buttonStyles } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { useApiQuery } from "@/hooks/useApiQuery";
import { ApiError, apiPath } from "@/services/api";
import { adminProjectsService } from "@/services/adminProjects.service";
import { githubService } from "@/services/github.service";
import type {
  AdminReference,
  GitHubImportRequest,
  GitHubRepository,
  GitHubTreeEntry,
  ProjectStage,
  RepositoryInspection,
  WorkMode,
} from "@/types/api";
import { cn } from "@/utils/cn";
import { formatDate, relativeTime } from "@/utils/format";
import { PROJECT_STAGE_LABELS } from "@/utils/projects";

const MAX_PREVIEW_CHARS = 12_000;

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-[0.52rem] uppercase tracking-[0.14em] text-muted">{label}</dt>
      <dd className="mt-1 text-sm tabular-nums text-paper">{value}</dd>
    </div>
  );
}

function RepositoryOverview({ repository }: { repository: GitHubRepository }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-medium text-paper">{repository.full_name}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-paper-dim">
            {repository.description || "No description on GitHub."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-[0.52rem] uppercase tracking-[0.12em]">
            <span className="inline-flex items-center gap-1 border border-line px-2 py-1 text-muted">
              {repository.private ? <Lock className="size-3" aria-hidden="true" /> : <GitBranch className="size-3" aria-hidden="true" />}
              {repository.visibility}
            </span>
            {repository.archived ? (
              <span className="border border-warning/40 bg-warning/10 px-2 py-1 text-warning">Archived</span>
            ) : null}
            {repository.fork ? (
              <span className="border border-warning/40 bg-warning/10 px-2 py-1 text-warning">Fork</span>
            ) : null}
            {repository.linked_project_id ? (
              <span className="border border-signal/40 bg-signal/10 px-2 py-1 text-signal">
                {repository.import_state === "published" ? "Published project" : "Linked project"}
              </span>
            ) : (
              <span className="border border-line px-2 py-1 text-muted">Not imported</span>
            )}
          </div>
          {repository.fork ? (
            <p className="mt-3 max-w-2xl border border-warning/40 bg-warning/10 px-3 py-2 text-xs leading-relaxed text-paper-dim">
              This is a fork. Credit the original repository and do not present forked work as
              your own.
            </p>
          ) : null}
          {repository.private ? (
            <p className="mt-3 max-w-2xl border border-line bg-ink-800/40 px-3 py-2 text-xs leading-relaxed text-paper-dim">
              Private repository. The draft starts without a public source link. Check imported
              screenshots and README text before publishing.
            </p>
          ) : null}
        </div>
        <a
          href={repository.html_url}
          target="_blank"
          rel="noreferrer"
          className={buttonStyles("secondary", "sm")}
        >
          <GitBranch className="size-3.5" aria-hidden="true" />
          Open on GitHub
          <ArrowUpRight className="size-3" aria-hidden="true" />
        </a>
      </div>

      <dl className="grid gap-4 border-t border-line pt-4 sm:grid-cols-3 lg:grid-cols-4">
        <Stat label="Default branch" value={repository.default_branch} />
        <Stat label="Main language" value={repository.language || "Not specified"} />
        <Stat label="Stars" value={repository.stargazers_count.toLocaleString()} />
        <Stat label="Forks" value={repository.forks_count.toLocaleString()} />
        <Stat label="Watchers" value={repository.watchers_count.toLocaleString()} />
        <Stat label="Open issues" value={repository.open_issues_count.toLocaleString()} />
        <Stat label="Licence" value={repository.license || "Not specified"} />
        <Stat label="Repository size" value={`${repository.size_kb.toLocaleString()} KB`} />
        <Stat label="Created" value={repository.created_at ? formatDate(repository.created_at) : "Not available"} />
        <Stat label="Updated" value={repository.updated_at ? formatDate(repository.updated_at) : "Not available"} />
        <Stat label="Last pushed" value={repository.pushed_at ? formatDate(repository.pushed_at) : "Not available"} />
        <Stat
          label="Homepage"
          value={
            repository.homepage ? (
              <a href={repository.homepage} target="_blank" rel="noreferrer" className="text-signal hover:underline">
                {repository.homepage.replace(/^https?:\/\//, "")}
              </a>
            ) : (
              "Not added"
            )
          }
        />
      </dl>

      {repository.topics.length > 0 ? (
        <div>
          <p className="font-mono text-[0.52rem] uppercase tracking-[0.14em] text-muted">Topics</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {repository.topics.map((topic) => (
              <span key={topic} className="border border-line px-2 py-1 font-mono text-[0.56rem] text-paper-dim">
                {topic}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StructureTree({
  repositoryId,
  entries,
}: {
  repositoryId: string;
  entries: GitHubTreeEntry[];
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [children, setChildren] = useState<Record<string, GitHubTreeEntry[]>>({});
  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  const [errorPath, setErrorPath] = useState<string | null>(null);

  const toggle = async (entry: GitHubTreeEntry) => {
    if (entry.type !== "dir") return;
    setErrorPath(null);
    if (open[entry.path]) {
      setOpen((current) => ({ ...current, [entry.path]: false }));
      return;
    }
    setOpen((current) => ({ ...current, [entry.path]: true }));
    if (children[entry.path]) return;
    setLoadingPath(entry.path);
    try {
      const listing = await githubService.getContents(repositoryId, entry.path);
      setChildren((current) => ({ ...current, [entry.path]: listing.entries }));
    } catch (caught) {
      setErrorPath(caught instanceof Error ? caught.message : "We couldn't open this folder.");
    } finally {
      setLoadingPath(null);
    }
  };

  const renderNode = (entry: GitHubTreeEntry, depth: number) => {
    const isDir = entry.type === "dir";
    const isOpen = open[entry.path];
    return (
      <li key={entry.path}>
        <div
          className="flex items-center gap-2 py-1"
          style={{ paddingLeft: `${depth * 1.25}rem` }}
        >
          {isDir ? (
            <button
              type="button"
              onClick={() => void toggle(entry)}
              className="flex min-w-0 items-center gap-2 text-left text-sm text-paper-dim hover:text-paper"
              aria-expanded={Boolean(isOpen)}
            >
              {isOpen ? (
                <FolderOpen className="size-3.5 shrink-0 text-signal" aria-hidden="true" />
              ) : (
                <Folder className="size-3.5 shrink-0 text-muted" aria-hidden="true" />
              )}
              <span className="truncate">{entry.name}</span>
              {isOpen ? (
                <ChevronDown className="size-3 shrink-0 text-faint" aria-hidden="true" />
              ) : (
                <ChevronRight className="size-3 shrink-0 text-faint" aria-hidden="true" />
              )}
            </button>
          ) : (
            <span className="flex min-w-0 items-center gap-2 text-sm text-muted">
              <span className="size-3.5 shrink-0" />
              <span className="truncate">{entry.name}</span>
              {entry.size != null ? (
                <span className="shrink-0 font-mono text-[0.54rem] text-faint">{entry.size} B</span>
              ) : null}
            </span>
          )}
          {loadingPath === entry.path ? (
            <LoaderCircle className="size-3 animate-spin text-muted" aria-hidden="true" />
          ) : null}
        </div>
        {errorPath === entry.path ? (
          <p className="py-1 pl-6 text-xs text-error">{errorPath}</p>
        ) : null}
        {isOpen && children[entry.path]?.length ? (
          <ul>{children[entry.path].map((child) => renderNode(child, depth + 1))}</ul>
        ) : null}
      </li>
    );
  };

  if (entries.length === 0) {
    return <p className="text-sm text-muted">The repository root is empty or unavailable.</p>;
  }

  return (
    <ul className="max-h-[26rem] overflow-auto border border-line bg-ink-950/50 p-3">
      {entries.map((entry) => renderNode(entry, 0))}
    </ul>
  );
}

function ReadmePreview({ inspection }: { inspection: RepositoryInspection }) {
  const readme = inspection.readme;
  if (!readme.available || !readme.content) {
    return (
      <div className="border border-line bg-ink-800/40 p-4 text-sm leading-relaxed text-paper-dim">
        <p className="flex items-center gap-2 text-warning">
          <AlertTriangle className="size-4" aria-hidden="true" />
          README unavailable.
        </p>
        <p className="mt-2">
          No safe README content was found, or the file was withheld because it may contain a
          secret. Sections stay marked as{" "}
          <span className="text-paper">"Not documented in the repository".</span>
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[0.58rem] uppercase tracking-[0.12em] text-muted">
          {readme.path || "README"}
        </span>
        {readme.html_url ? (
          <a
            href={readme.html_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-mono text-[0.54rem] uppercase tracking-[0.12em] text-signal hover:underline"
          >
            View on GitHub
            <ArrowUpRight className="size-3" aria-hidden="true" />
          </a>
        ) : null}
      </div>
      <pre className="max-h-[26rem] overflow-auto whitespace-pre-wrap break-words border border-line bg-ink-950/60 p-4 font-mono text-[0.72rem] leading-relaxed text-paper-dim">
        {readme.content.slice(0, MAX_PREVIEW_CHARS)}
        {readme.content.length > MAX_PREVIEW_CHARS ? "\n\n... preview shortened" : ""}
      </pre>
      {readme.truncated ? (
        <p className="text-xs text-warning">GitHub says this README is shortened.</p>
      ) : null}
    </div>
  );
}

function TechnologyList({
  inspection,
  selected,
  onToggle,
}: {
  inspection: RepositoryInspection;
  selected: Set<string>;
  onToggle: (name: string) => void;
}) {
  if (inspection.technologies.length === 0) {
    return <p className="text-sm text-muted">No technologies were detected in this repository.</p>;
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {inspection.technologies.map((tech) => (
        <li key={tech.name} className="border border-line p-3">
          <Checkbox
            label={
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-paper">{tech.name}</span>
                <span
                  className={cn(
                    "font-mono text-[0.48rem] uppercase tracking-[0.12em]",
                    tech.confidence === "high" && "text-signal",
                    tech.confidence === "medium" && "text-warning",
                    tech.confidence === "low" && "text-muted",
                  )}
                >
                  {tech.confidence === "high"
                    ? "High"
                    : tech.confidence === "medium"
                      ? "Medium"
                      : "Low"}{" "}
                  confidence
                </span>
              </span>
            }
            checked={selected.has(tech.name)}
            onChange={() => onToggle(tech.name)}
            hint={tech.evidence.join(" · ")}
          />
        </li>
      ))}
    </ul>
  );
}

function ArchitectureList({ inspection }: { inspection: RepositoryInspection }) {
  if (inspection.architecture.length === 0) {
    return <p className="text-sm text-muted">No architecture details were found in the inspected files.</p>;
  }
  return (
    <dl className="space-y-3">
      {inspection.architecture.map((layer) => (
        <div key={layer.layer} className="border border-line p-3">
          <dt className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-paper">{layer.layer}</dt>
          <dd className="mt-2 flex flex-wrap gap-1.5">
            {layer.technologies.map((tech) => (
              <span key={tech} className="border border-line px-2 py-0.5 font-mono text-[0.56rem] text-paper-dim">
                {tech}
              </span>
            ))}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ImagePicker({
  inspection,
  roles,
  onRole,
}: {
  inspection: RepositoryInspection;
  roles: Record<string, "cover" | "gallery" | "ignore">;
  onRole: (path: string, role: "cover" | "gallery" | "ignore") => void;
}) {
  if (inspection.images.items.length === 0) {
    return (
      <p className="text-sm text-muted">
        No usable images were found in the README or asset folders. External images and badges
        are not imported.
      </p>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {inspection.images.items.map((image) => {
        const role = roles[image.path] ?? "ignore";
        return (
          <figure key={image.path} className="border border-line">
            <div className="flex h-40 items-center justify-center overflow-hidden bg-ink-950">
              <img
                src={apiPath(image.preview_url)}
                alt={image.name}
                className="max-h-40 w-full object-contain"
                loading="lazy"
              />
            </div>
            <figcaption className="space-y-2 border-t border-line p-3">
              <p className="truncate font-mono text-[0.58rem] text-paper-dim" title={image.path}>
                {image.path}
              </p>
              {!image.markdown ? (
                <p className="font-mono text-[0.5rem] uppercase tracking-[0.1em] text-faint">
                  From repository assets
                </p>
              ) : null}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => onRole(image.path, "cover")}
                  className={cn(
                    "border px-2 py-1 font-mono text-[0.5rem] uppercase tracking-[0.1em]",
                    role === "cover"
                      ? "border-signal bg-signal/10 text-signal"
                      : "border-line text-muted hover:border-paper hover:text-paper",
                  )}
                >
                  <CheckCircle2 className="mr-1 inline size-3" aria-hidden="true" />
                  Use as cover
                </button>
                <button
                  type="button"
                  onClick={() => onRole(image.path, "gallery")}
                  className={cn(
                    "border px-2 py-1 font-mono text-[0.5rem] uppercase tracking-[0.1em]",
                    role === "gallery"
                      ? "border-signal bg-signal/10 text-signal"
                      : "border-line text-muted hover:border-paper hover:text-paper",
                  )}
                >
                  <ImageIcon className="mr-1 inline size-3" aria-hidden="true" />
                  Add to gallery
                </button>
                <button
                  type="button"
                  onClick={() => onRole(image.path, "ignore")}
                  className={cn(
                    "border px-2 py-1 font-mono text-[0.5rem] uppercase tracking-[0.1em]",
                    role === "ignore"
                      ? "border-line-strong text-muted"
                      : "border-line text-muted hover:border-error hover:text-error",
                  )}
                >
                  <X className="mr-1 inline size-3" aria-hidden="true" />
                  Ignore
                </button>
              </div>
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}

function LinkedProjectBanner({ repository }: { repository: GitHubRepository }) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!repository.linked_project_id) return null;

  const sync = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await githubService.syncProject(repository.linked_project_id!);
      setNotice(result.message);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn't update this project. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-signal/30 bg-signal/5 p-4">
      <p className="flex flex-wrap items-center gap-2 text-sm text-paper-dim">
        <Info className="size-4 text-signal" aria-hidden="true" />
        This repository is already linked to:
        <span className="text-paper">{repository.linked_project_title || "a project"}</span>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          to={`/admin/projects/${repository.linked_project_id}`}
          className={buttonStyles("primary", "sm")}
        >
          Open project
        </Link>
        <button
          type="button"
          onClick={() => void sync()}
          disabled={busy}
          className={buttonStyles("outline", "sm")}
        >
          {busy ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-3.5" aria-hidden="true" />}
          Sync from GitHub
        </button>
      </div>
      {notice ? <p className="mt-3 text-xs text-signal">{notice}</p> : null}
      {error ? <p className="mt-3 text-xs text-error">{error}</p> : null}
      <p className="mt-2 text-xs text-muted">
        Duplicate imports are blocked. Open the linked project or update its GitHub details.
      </p>
    </div>
  );
}

export default function AdminGitHubRepositoryPage() {
  const { repositoryId = "" } = useParams<{ repositoryId: string }>();
  const navigate = useNavigate();
  const inspection = useApiQuery((signal) => githubService.getInspection(repositoryId, signal), [repositoryId]);
  const reference = useApiQuery<AdminReference>((signal) => adminProjectsService.reference(signal), []);

  const [initialised, setInitialised] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [primaryMode, setPrimaryMode] = useState<WorkMode>("build");
  const [projectStatus, setProjectStatus] = useState<ProjectStage>("in_progress");
  const [featured, setFeatured] = useState(false);
  const [generatePreview, setGeneratePreview] = useState(true);
  const [createCaseStudy, setCreateCaseStudy] = useState(false);
  const [useReadmeSections, setUseReadmeSections] = useState<Set<string>>(new Set());
  const [selectedTechnologies, setSelectedTechnologies] = useState<Set<string>>(new Set());
  const [liveUrl, setLiveUrl] = useState("");
  const [documentationUrl, setDocumentationUrl] = useState("");
  const [imageRoles, setImageRoles] = useState<Record<string, "cover" | "gallery" | "ignore">>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!inspection.data || !reference.data || initialised) return;
    const data = inspection.data;
    const repository = data.repository;
    const suggestion = data.category_suggestions[0];
    const matchedCategory =
      reference.data.categories.find(
        (category) =>
          (suggestion && (category.slug === suggestion.slug || category.name === suggestion.name)) ||
          false,
      ) ?? reference.data.categories[0];

    setTitle(repository.name.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()));
    const overview = data.readme_sections.find((section) => section.key === "overview" && section.documented);
    setSummary(repository.description || overview?.content.slice(0, 280) || "");
    setCategoryId(matchedCategory?.id ?? "");
    setLiveUrl(data.live_url_candidates[0]?.url ?? "");
    setDocumentationUrl(data.documentation_url ?? "");
    setUseReadmeSections(
      new Set(
        data.readme_sections
          .filter((section) => section.documented && section.key !== "license" && section.key !== "screenshots")
          .map((section) => section.key),
      ),
    );
    setSelectedTechnologies(new Set(data.technologies.map((tech) => tech.name)));
    setInitialised(true);
  }, [inspection.data, reference.data, initialised]);

  const composedBody = useMemo(() => {
    if (!inspection.data) return "";
    return inspection.data.readme_sections
      .filter((section) => useReadmeSections.has(section.key) && section.documented)
      .map((section) => `## ${section.label}\n\n${section.content}`)
      .join("\n\n");
  }, [inspection.data, useReadmeSections]);

  const coverImage = Object.entries(imageRoles).find(([, role]) => role === "cover")?.[0] ?? null;
  const galleryImages = Object.entries(imageRoles)
    .filter(([, role]) => role === "gallery")
    .map(([path]) => path);

  const setImageRole = (path: string, role: "cover" | "gallery" | "ignore") => {
    setImageRoles((current) => {
      const next: Record<string, "cover" | "gallery" | "ignore"> = { ...current };
      if (role === "cover") {
        for (const key of Object.keys(next)) {
          if (next[key] === "cover") next[key] = "ignore";
        }
      }
      next[path] = role;
      return next;
    });
  };

  const toggleTechnology = (name: string) => {
    setSelectedTechnologies((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleSection = (key: string) => {
    setUseReadmeSections((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const importDraft = async () => {
    if (!inspection.data) return;
    setError(null);
    if (!categoryId) {
      setError("Choose a category before creating the draft.");
      return;
    }
    const payload: GitHubImportRequest = {
      category_id: categoryId,
      title: title.trim() || null,
      summary: summary.trim() || null,
      body: composedBody.trim() || null,
      use_readme: true,
      case_study: createCaseStudy,
      live_url: liveUrl.trim() || null,
      documentation_url: documentationUrl.trim() || null,
      technology_names: [...selectedTechnologies],
      cover_image_path: coverImage,
      gallery_image_paths: galleryImages,
      featured,
      primary_mode: primaryMode,
      project_status: projectStatus,
      import_images: true,
      generate_preview: generatePreview,
    };
    setBusy(true);
    try {
      const result = await githubService.importRepository(repositoryId, payload);
      navigate(`/admin/projects/${result.project_id}`, {
        state: {
          notice: `${result.message} GitHub images imported: ${result.images_imported}.`,
        },
      });
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409) {
        // The repository was linked in another tab/session. Refresh the
        // inspection so the page stops offering a duplicate import.
        inspection.reload();
      }
      setError(caught instanceof Error ? caught.message : "We couldn't create the draft. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (inspection.loading) {
    return <LoadingState rows={5} label="Loading repository" />;
  }
  if (inspection.error) {
    return (
      <ErrorState
        message="We couldn't load this repository. Please try again."
        onRetry={inspection.reload}
      />
    );
  }
  if (!inspection.data) return null;

  const data = inspection.data;
  const repository = data.repository;
  const alreadyLinked = Boolean(repository.linked_project_id);

  return (
    <>
      <div className="flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            to="/admin/github"
            className="inline-flex items-center gap-1.5 font-mono text-[0.56rem] uppercase tracking-[0.16em] text-muted hover:text-paper"
          >
            <ArrowLeft className="size-3" aria-hidden="true" />
            All repositories
          </Link>
          <h1 className="mt-3 text-3xl font-medium tracking-tight text-paper sm:text-4xl">
            {repository.name}
          </h1>
          <p className="mt-2 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted">
            {repository.full_name} · checked {relativeTime(data.fetched_at)}
          </p>
        </div>
        <button type="button" onClick={inspection.reload} className={buttonStyles("outline", "md")}>
          <RefreshCw className="size-3.5" aria-hidden="true" />
          Check again
        </button>
      </div>

      <div className="mt-6 space-y-6">
        <LinkedProjectBanner repository={repository} />

        {data.limitations.length > 0 ? (
          <div className="border border-warning/40 bg-warning/10 p-4">
            <p className="flex items-center gap-2 font-mono text-[0.56rem] uppercase tracking-[0.14em] text-warning">
              <AlertTriangle className="size-3.5" aria-hidden="true" />
              Limitations
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-paper-dim">
              {data.limitations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <AdminPanel title="Repository details" description="Details from GitHub. Missing values are left blank.">
          <RepositoryOverview repository={repository} />
        </AdminPanel>

        <div className="grid gap-6 lg:grid-cols-2">
          <AdminPanel title="Folder structure" description="Open a folder to see one level at a time.">
            <StructureTree repositoryId={repository.id} entries={data.structure.entries} />
          </AdminPanel>

          <AdminPanel
            title="Files read"
            description="Only a fixed list of documentation and setup files is read."
          >
            {data.inspected_files.length > 0 ? (
              <ul className="space-y-1 font-mono text-[0.62rem] text-paper-dim">
                {data.inspected_files.map((path) => (
                  <li key={path} className="flex items-center gap-2">
                    <Check className="size-3 text-signal" aria-hidden="true" />
                    {path}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No allowed files were available.</p>
            )}
            {data.skipped_files.length > 0 ? (
              <div className="mt-4 border-t border-line pt-3">
                <p className="font-mono text-[0.52rem] uppercase tracking-[0.14em] text-muted">Skipped</p>
                <ul className="mt-2 space-y-1 text-xs text-muted">
                  {data.skipped_files.slice(0, 12).map((item) => (
                    <li key={`${item.path}-${item.reason}`} className="flex gap-2">
                      <span className="font-mono text-[0.62rem] text-paper-dim">{item.path}</span>
                      <span>{item.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </AdminPanel>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <AdminPanel title="README preview" description="Shown as plain text. README images and badges are removed.">
            <ReadmePreview inspection={data} />
          </AdminPanel>

          <AdminPanel
            title="Use README information"
            description="Choose which documented sections go into the draft. You can edit everything after import."
          >
            <ul className="space-y-2">
              {data.readme_sections.map((section) => (
                <li key={section.key} className="border border-line p-3">
                  <Checkbox
                    label={section.label}
                    checked={useReadmeSections.has(section.key)}
                    onChange={() => toggleSection(section.key)}
                    disabled={!section.documented}
                    hint={
                      section.documented
                        ? section.content.replace(/\s+/g, " ").slice(0, 160)
                        : "Not documented in the repository."
                    }
                  />
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-muted">
              Selected sections are added to the project text. Missing facts are left out rather
              than invented.
            </p>
          </AdminPanel>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <AdminPanel title="Technologies found" description="Choose the technologies to add. Each one shows where it was found.">
            <TechnologyList inspection={data} selected={selectedTechnologies} onToggle={toggleTechnology} />
          </AdminPanel>

          <AdminPanel title="Architecture" description="These are only suggestions. The final category is your choice.">
            <ArchitectureList inspection={data} />
            <div className="mt-5 border-t border-line pt-4">
              <p className="font-mono text-[0.52rem] uppercase tracking-[0.14em] text-muted">Category suggestions</p>
              <ul className="mt-2 space-y-2">
                {data.category_suggestions.map((suggestion) => {
                  const category = reference.data?.categories.find(
                    (item) => item.slug === suggestion.slug || item.name === suggestion.name,
                  );
                  return (
                    <li key={suggestion.slug} className="flex flex-wrap items-center justify-between gap-2 border border-line p-3">
                      <div>
                        <p className="text-sm text-paper">{suggestion.name}</p>
                        <p className="mt-1 text-xs text-muted">{suggestion.reason}</p>
                      </div>
                      {category ? (
                        <button
                          type="button"
                          onClick={() => setCategoryId(category.id)}
                          className={buttonStyles(categoryId === category.id ? "primary" : "outline", "sm")}
                        >
                          {categoryId === category.id ? "Selected" : "Use category"}
                        </button>
                      ) : (
                        <span className="font-mono text-[0.52rem] uppercase tracking-[0.12em] text-faint">
                          Not in category list
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </AdminPanel>
        </div>

        <AdminPanel title="Live website and documentation" description="Only the GitHub homepage or links in the README are suggested.">
          <div className="space-y-4">
            {data.live_url_candidates.length === 0 ? (
              <p className="border border-line bg-ink-800/40 px-4 py-3 text-sm text-paper-dim">
                No live website found. Add one if the project is hosted elsewhere.
              </p>
            ) : (
              <ul className="space-y-2">
                {data.live_url_candidates.map((candidate) => (
                  <li key={candidate.url}>
                    <label className="flex cursor-pointer items-start gap-3 border border-line p-3 text-sm">
                      <input
                        type="radio"
                        name="live-url-candidate"
                        checked={liveUrl === candidate.url}
                        onChange={() => setLiveUrl(candidate.url)}
                        className="mt-1 size-4 accent-signal"
                      />
                      <span className="min-w-0">
                        <span className="block break-all text-paper-dim">{candidate.url}</span>
                        <span className="mt-1 block font-mono text-[0.52rem] uppercase tracking-[0.12em] text-muted">
                          {candidate.source} ·{" "}
                          {candidate.confidence === "high"
                            ? "High"
                            : candidate.confidence === "medium"
                              ? "Medium"
                              : "Low"}{" "}
                          confidence
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Live website" htmlFor="github-live-url" hint="Leave blank if there is no live website.">
                <TextInput
                  id="github-live-url"
                  type="url"
                  value={liveUrl}
                  onChange={(event) => setLiveUrl(event.target.value)}
                  placeholder="https://example.com"
                />
              </Field>
              <Field label="Documentation" htmlFor="github-docs-url">
                <TextInput
                  id="github-docs-url"
                  type="url"
                  value={documentationUrl}
                  onChange={(event) => setDocumentationUrl(event.target.value)}
                  placeholder="https://example.com"
                />
              </Field>
            </div>
          </div>
        </AdminPanel>

        <AdminPanel title="README images" description="Choose what each image is used for. Imported images are copied to the Media Library with their repository path recorded.">
          <ImagePicker inspection={data} roles={imageRoles} onRole={setImageRole} />
          {data.images.ignored.length > 0 ? (
            <div className="mt-4 border-t border-line pt-3">
              <p className="font-mono text-[0.52rem] uppercase tracking-[0.14em] text-muted">Ignored references</p>
              <ul className="mt-2 space-y-1 text-xs text-muted">
                {data.images.ignored.slice(0, 8).map((item) => (
                  <li key={item.reference} className="break-all">
                    <span className="text-paper-dim">{item.reference}</span>: {item.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </AdminPanel>

        {!alreadyLinked ? (
          <AdminPanel
            title="Create draft project"
            description="Importing never publishes. Review the draft in the project editor before making it public."
          >
            <div className="mb-5 border border-line bg-ink-800/30 p-4">
              <p className="font-mono text-[0.54rem] uppercase tracking-[0.14em] text-muted">
                Draft preview
              </p>
              <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <dt className="font-mono text-[0.5rem] uppercase tracking-[0.12em] text-faint">Title</dt>
                  <dd className="mt-1 text-paper-dim">{title || "Untitled"}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[0.5rem] uppercase tracking-[0.12em] text-faint">Category</dt>
                  <dd className="mt-1 text-paper-dim">
                    {reference.data?.categories.find((category) => category.id === categoryId)?.name ??
                      "Not selected"}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[0.5rem] uppercase tracking-[0.12em] text-faint">Technologies</dt>
                  <dd className="mt-1 text-paper-dim">{selectedTechnologies.size} selected</dd>
                </div>
                <div>
                  <dt className="font-mono text-[0.5rem] uppercase tracking-[0.12em] text-faint">README sections</dt>
                  <dd className="mt-1 text-paper-dim">
                    {useReadmeSections.size} chosen
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[0.5rem] uppercase tracking-[0.12em] text-faint">Repository</dt>
                  <dd className="mt-1 truncate text-paper-dim" title={data.repository.full_name}>
                    {data.repository.full_name}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[0.5rem] uppercase tracking-[0.12em] text-faint">Live website</dt>
                  <dd className="mt-1 truncate text-paper-dim" title={liveUrl}>
                    {liveUrl || "No live website found."}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[0.5rem] uppercase tracking-[0.12em] text-faint">Images</dt>
                  <dd className="mt-1 text-paper-dim">
                    {coverImage ? "1 cover" : "No cover"} · {galleryImages.length} gallery
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[0.5rem] uppercase tracking-[0.12em] text-faint">
                    Architecture found
                  </dt>
                  <dd className="mt-1 text-paper-dim">
                    {data.architecture.length > 0
                      ? data.architecture.map((layer) => layer.layer).join(", ")
                      : "No architecture details found."}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[0.5rem] uppercase tracking-[0.12em] text-faint">Visibility</dt>
                  <dd className="mt-1 text-paper-dim">
                    {data.repository.private
                      ? "Draft (hidden until you make it visible)"
                      : "Draft (never published automatically)"}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <Field label="Project title" htmlFor="github-title" required>
                <TextInput id="github-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} />
              </Field>
              <Field label="Category" htmlFor="github-category" required hint="Suggestions are only a guide. Choose the final category.">
                <Select
                  id="github-category"
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  options={[
                    { value: "", label: "Select a category" },
                    ...(reference.data?.categories ?? []).map((category) => ({
                      value: category.id,
                      label: category.name,
                    })),
                  ]}
                />
              </Field>
              <Field label="Summary" htmlFor="github-summary" className="lg:col-span-2">
                <TextArea
                  id="github-summary"
                  rows={3}
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                  placeholder="Short project summary"
                />
              </Field>
              <Field label="Main focus" htmlFor="github-mode">
                <Select
                  id="github-mode"
                  value={primaryMode}
                  onChange={(event) => setPrimaryMode(event.target.value as WorkMode)}
                  options={(reference.data?.modes ?? []).map((mode) => ({ value: mode.value, label: mode.label }))}
                />
              </Field>
              <Field label="Project stage" htmlFor="github-stage">
                <Select
                  id="github-stage"
                  value={projectStatus}
                  onChange={(event) => setProjectStatus(event.target.value as ProjectStage)}
                  options={(Object.keys(PROJECT_STAGE_LABELS) as ProjectStage[]).map((stage) => ({
                    value: stage,
                    label: PROJECT_STAGE_LABELS[stage],
                  }))}
                />
              </Field>
              <div className="flex flex-col gap-3 lg:col-span-2">
                <Checkbox
                  label="Create a draft case study"
                  checked={createCaseStudy}
                  onChange={setCreateCaseStudy}
                  hint="Uses documented README sections only. Results stay marked 'Not documented in the repository'."
                />
                <Checkbox
                  label="Feature on the homepage once published"
                  checked={featured}
                  onChange={setFeatured}
                />
                <Checkbox
                  label="Take a homepage preview from the live website"
                  checked={generatePreview}
                  onChange={setGeneratePreview}
                  hint="Only runs when a live website was found. The project stays a draft."
                />
                <p className="text-xs leading-relaxed text-muted">
                  {coverImage ? `Cover: ${coverImage}. ` : "No cover image selected. "}
                  {galleryImages.length > 0
                    ? `${galleryImages.length} gallery image(s) selected.`
                    : "No gallery images selected."}
                </p>
              </div>
            </div>

            {error ? (
              <p role="alert" className="mt-4 border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
                {error}
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <button type="button" onClick={() => void importDraft()} disabled={busy} className={buttonStyles("primary", "md")}>
                {busy ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : <FileSearch className="size-3.5" aria-hidden="true" />}
                Create draft project
              </button>
              <Link to="/admin/github" className={buttonStyles("ghost", "md")}>
                Cancel
              </Link>
              <span className="font-mono text-[0.52rem] uppercase tracking-[0.12em] text-faint">
                Draft only · nothing is published
              </span>
            </div>
          </AdminPanel>
        ) : null}

        <AdminPanel title="Recent commits" description="Only commit summaries are shown.">
          {data.activity.commits_available && data.activity.recent_commits.length > 0 ? (
            <ul className="divide-y divide-line">
              {data.activity.recent_commits.map((commit) => (
                <li key={commit.sha} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-paper-dim">{commit.message || "No commit message"}</p>
                    <p className="mt-1 font-mono text-[0.54rem] uppercase tracking-[0.12em] text-muted">
                      {commit.author || "Unknown author"} · {commit.sha.slice(0, 7)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-[0.54rem] uppercase tracking-[0.12em] text-faint">
                    <span>{commit.authored_at ? relativeTime(commit.authored_at) : "Unknown date"}</span>
                    {commit.html_url ? (
                      <a href={commit.html_url} target="_blank" rel="noreferrer" className="text-signal hover:underline">
                        View
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">
              Commit history is not available for this repository.
            </p>
          )}
        </AdminPanel>
      </div>
    </>
  );
}
