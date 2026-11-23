import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Eye,
  FileText,
  GitBranch,
  Globe,
  Image as ImageIcon,
  LoaderCircle,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  Unlink,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import { AdminPanel, Checkbox, Field, Select, StatusBadge, TextArea, TextInput } from "@/components/admin/form";
import { MediaField } from "@/components/admin/MediaField";
import { buttonStyles } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiResource } from "@/hooks/useApiResource";
import { adminProjectsService, type AdminCaseStudyInput } from "@/services/adminProjects.service";
import { githubService } from "@/services/github.service";
import { listMedia } from "@/services/auth.service";
import type {
  AdminCaseStudy,
  AdminProject,
  AdminReference,
  DeploymentStatus,
  MediaType,
  PreviewStatus,
  ProjectInput,
  ProjectPreview,
  PublishStatus,
} from "@/types/api";
import { cn } from "@/utils/cn";
import { relativeTime } from "@/utils/format";
import { PROJECT_STAGE_LABELS, PROJECT_STAGE_ORDER } from "@/utils/projects";

type SectionKey = "basic" | "media" | "deployment" | "case-study" | "seo" | "publishing";

const SECTIONS: Array<{ key: SectionKey; label: string; hint: string }> = [
  { key: "basic", label: "Overview", hint: "Name, description and category" },
  { key: "media", label: "Media", hint: "Cover image and gallery" },
  { key: "deployment", label: "Links", hint: "Links, hosting and GitHub" },
  { key: "case-study", label: "Case study", hint: "The full write-up" },
  { key: "seo", label: "Search", hint: "Search and sharing" },
  { key: "publishing", label: "Publishing", hint: "Visibility and ordering" },
];

const PREVIEW_LABELS: Record<PreviewStatus, string> = {
  not_discovered: "Not checked yet",
  awaiting_verification: "Waiting to be checked",
  verified: "Website verified",
  generated: "Preview ready",
  unavailable: "No preview yet",
  unreachable: "Website not reachable",
};

const PREVIEW_TONES: Record<PreviewStatus, string> = {
  not_discovered: "border-line bg-surface-raised text-faint",
  awaiting_verification: "border-warning/50 bg-warning/10 text-warning",
  verified: "border-signal/50 bg-signal/10 text-signal",
  generated: "border-success/50 bg-success/10 text-success",
  unavailable: "border-line bg-surface-raised text-faint",
  unreachable: "border-error/50 bg-error/10 text-error",
};

const PREVIEW_SOURCE_LABELS: Record<string, string> = {
  github_homepage: "GitHub repository",
  github_pages: "GitHub Pages",
  package_json: "Package file",
  cname: "Custom domain file",
  readme: "README file",
  manual: "Added by you",
};

function previewFromProject(project: AdminProject): ProjectPreview {
  return {
    project_id: project.id,
    live_url: project.live_url,
    preview_image: project.preview_image,
    preview_status: project.preview_status,
    preview_source: project.preview_source,
    preview_source_url: project.preview_source_url,
    preview_checked_at: project.preview_checked_at,
    preview_error: project.preview_error,
    verified:
      project.preview_status === "verified" || project.preview_status === "generated",
    final_url: project.preview_source_url,
    message: null,
  };
}

interface MediaRow {
  url: string;
  alt_text: string;
  caption: string;
  media_type: MediaType;
}

interface ProjectFormState {
  title: string;
  slug: string;
  summary: string;
  body: string;
  category_id: string;
  secondary_category_ids: string[];
  technology_ids: string[];
  extra_technologies: string;
  primary_mode: string;
  project_status: string;
  status: PublishStatus;
  featured: boolean;
  role: string;
  year: string;
  started_on: string;
  completed_on: string;
  repository_url: string;
  live_url: string;
  documentation_url: string;
  download_url: string;
  external_url: string;
  github_url: string;
  demo_url: string;
  video_url: string;
  external_project_url: string;
  deployment_provider: string;
  deployment_status: DeploymentStatus;
  deployment_url: string;
  embed_enabled: boolean;
  last_verified_at: string;
  public_visibility: boolean;
  seo_title: string;
  seo_description: string;
  og_image: string;
  cover_image: string;
  sort_order: string;
  is_placeholder: boolean;
  media: MediaRow[];
}

const emptyMedia: MediaRow = {
  url: "",
  alt_text: "",
  caption: "",
  media_type: "image",
};

function localDateTime(value: string | null): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const offset = parsed.getTimezoneOffset();
  return new Date(parsed.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function fromProject(project: AdminProject): ProjectFormState {
  return {
    title: project.title,
    slug: project.slug,
    summary: project.summary ?? "",
    body: project.body ?? "",
    category_id: project.category.id,
    secondary_category_ids: project.secondary_categories.map((item) => item.id),
    technology_ids: project.technologies.map((item) => item.id),
    extra_technologies: "",
    primary_mode: project.primary_mode,
    project_status: project.project_status,
    status: project.status,
    featured: project.featured,
    role: project.role ?? "",
    year: project.year ? String(project.year) : "",
    started_on: project.started_on ?? "",
    completed_on: project.completed_on ?? "",
    repository_url: project.repository_url ?? "",
    live_url: project.live_url ?? "",
    documentation_url: project.documentation_url ?? "",
    download_url: project.download_url ?? "",
    external_url: project.external_url ?? "",
    github_url: project.github_url ?? "",
    demo_url: project.demo_url ?? "",
    video_url: project.video_url ?? "",
    external_project_url: project.external_project_url ?? "",
    deployment_provider: project.deployment_provider ?? "",
    deployment_status: project.deployment_status,
    deployment_url: project.deployment_url ?? "",
    embed_enabled: project.embed_enabled,
    last_verified_at: localDateTime(project.last_verified_at),
    public_visibility: project.public_visibility,
    seo_title: project.seo_title ?? "",
    seo_description: project.seo_description ?? "",
    og_image: project.og_image ?? "",
    cover_image: project.cover_image ?? "",
    sort_order: String(project.sort_order),
    is_placeholder: project.is_placeholder,
    media: project.media.map((item) => ({
      url: item.url,
      alt_text: item.alt_text,
      caption: item.caption ?? "",
      media_type: item.media_type,
    })),
  };
}

function blankForm(categoryId: string): ProjectFormState {
  return {
    title: "",
    slug: "",
    summary: "",
    body: "",
    category_id: categoryId,
    secondary_category_ids: [],
    technology_ids: [],
    extra_technologies: "",
    primary_mode: "build",
    project_status: "in_progress",
    status: "draft",
    featured: false,
    role: "",
    year: String(new Date().getFullYear()),
    started_on: "",
    completed_on: "",
    repository_url: "",
    live_url: "",
    documentation_url: "",
    download_url: "",
    external_url: "",
    github_url: "",
    demo_url: "",
    video_url: "",
    external_project_url: "",
    deployment_provider: "",
    deployment_status: "not_deployed",
    deployment_url: "",
    embed_enabled: false,
    last_verified_at: "",
    public_visibility: true,
    seo_title: "",
    seo_description: "",
    og_image: "",
    cover_image: "",
    sort_order: "100",
    is_placeholder: false,
    media: [],
  };
}

function optional(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toPayload(form: ProjectFormState, status: PublishStatus): ProjectInput {
  return {
    title: form.title.trim(),
    slug: optional(form.slug),
    summary: optional(form.summary),
    body: optional(form.body),
    category_id: form.category_id,
    secondary_category_ids: form.secondary_category_ids,
    technology_ids: form.technology_ids,
    extra_technologies: form.extra_technologies
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    primary_mode: form.primary_mode as ProjectInput["primary_mode"],
    project_status: form.project_status as ProjectInput["project_status"],
    status,
    featured: form.featured,
    role: optional(form.role),
    year: form.year ? Number(form.year) : null,
    started_on: optional(form.started_on),
    completed_on: optional(form.completed_on),
    repository_url: optional(form.repository_url),
    live_url: optional(form.live_url),
    documentation_url: optional(form.documentation_url),
    download_url: optional(form.download_url),
    external_url: optional(form.external_url),
    github_url: optional(form.github_url),
    demo_url: optional(form.demo_url),
    video_url: optional(form.video_url),
    external_project_url: optional(form.external_project_url),
    deployment_provider: optional(form.deployment_provider),
    deployment_status: form.deployment_status,
    deployment_url: optional(form.deployment_url),
    embed_enabled: form.embed_enabled,
    last_verified_at: optional(form.last_verified_at),
    public_visibility: form.public_visibility,
    seo_title: optional(form.seo_title),
    seo_description: optional(form.seo_description),
    og_image: optional(form.og_image),
    cover_image: optional(form.cover_image),
    sort_order: Number(form.sort_order) || 0,
    is_placeholder: form.is_placeholder,
    media: form.media
      .filter((item) => item.url.trim())
      .map((item, index) => ({
        url: item.url.trim(),
        alt_text: item.alt_text.trim() || `${form.title.trim()} project media`,
        caption: optional(item.caption),
        media_type: item.media_type,
        sort_order: index * 10,
      })),
  };
}

const CASE_STUDY_TEXT_FIELDS: Array<{
  key: keyof Pick<
    AdminCaseStudyInput,
    | "overview"
    | "problem"
    | "context"
    | "goals"
    | "idea"
    | "research"
    | "planning"
    | "design"
    | "solution"
    | "role"
    | "architecture"
    | "technology"
    | "key_features"
    | "technical_decisions"
    | "challenges"
    | "implementation"
    | "testing"
    | "results"
    | "lessons"
    | "future_improvements"
  >;
  label: string;
  hint?: string;
}> = [
  { key: "overview", label: "Overview" },
  { key: "problem", label: "Problem", hint: "What was broken, missing, or expensive?" },
  { key: "context", label: "Context", hint: "Constraints, environment, and users." },
  { key: "goals", label: "Goals" },
  { key: "idea", label: "Approach" },
  { key: "research", label: "Research" },
  { key: "planning", label: "Planning" },
  { key: "design", label: "Design" },
  { key: "solution", label: "Solution" },
  { key: "role", label: "Role in the work" },
  { key: "architecture", label: "Architecture" },
  { key: "technology", label: "Technology notes" },
  { key: "key_features", label: "Key features" },
  { key: "technical_decisions", label: "Technical decisions and trade-offs" },
  { key: "challenges", label: "Challenges" },
  { key: "implementation", label: "Implementation" },
  { key: "testing", label: "Testing and verification", hint: "Real checks only; no invented results." },
  { key: "results", label: "Results" },
  { key: "lessons", label: "Lessons" },
  { key: "future_improvements", label: "Future improvements" },
];

function newCaseStudy(projectId: string, title: string, slug: string): AdminCaseStudyInput {
  return {
    project_id: projectId,
    title: `${title || "Project"} case study`,
    slug: `${slug || "project"}-case-study`,
    summary: null,
    cover_image_url: null,
    overview: null,
    problem: null,
    context: null,
    goals: null,
    idea: null,
    research: null,
    planning: null,
    design: null,
    solution: null,
    role: null,
    architecture: null,
    technology: null,
    key_features: null,
    technical_decisions: null,
    challenges: null,
    implementation: null,
    testing: null,
    results: null,
    result_type: null,
    lessons: null,
    future_improvements: null,
    hidden_sections: [],
    featured: false,
    sort_order: 0,
    status: "draft",
    is_placeholder: false,
  };
}

function caseStudyToInput(study: AdminCaseStudy): AdminCaseStudyInput {
  return {
    project_id: study.project_id,
    title: study.title,
    slug: study.slug,
    summary: study.summary,
    cover_image_url: study.cover_image_url,
    overview: study.overview,
    problem: study.problem,
    context: study.context,
    goals: study.goals,
    idea: study.idea,
    research: study.research,
    planning: study.planning,
    design: study.design,
    solution: study.solution,
    role: study.role,
    architecture: study.architecture,
    technology: study.technology,
    key_features: study.key_features,
    technical_decisions: study.technical_decisions,
    challenges: study.challenges,
    implementation: study.implementation,
    testing: study.testing,
    results: study.results,
    result_type: study.result_type,
    lessons: study.lessons,
    future_improvements: study.future_improvements,
    hidden_sections: (study.hidden_sections ?? []) as AdminCaseStudyInput["hidden_sections"],
    featured: study.featured,
    sort_order: study.sort_order,
    status: study.status,
    is_placeholder: study.is_placeholder,
  };
}

export default function AdminProjectEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const navigate = useNavigate();
  const location = useLocation();
  const [notice, setNotice] = useState<string | null>(
    (location.state as { notice?: string } | null)?.notice ?? null,
  );
  const [form, setForm] = useState<ProjectFormState | null>(null);
  const [section, setSection] = useState<SectionKey>("basic");
  const [savingMode, setSavingMode] = useState<
    "keep" | "draft" | "publish" | "delete" | null
  >(null);
  const saving = savingMode !== null;
  const noticeRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    if (notice && noticeRef.current) {
      noticeRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [notice]);

  const reference = useApiResource<AdminReference>("/api/v1/admin/reference");
  const project = useApiResource<AdminProject>(
    id ? `/api/v1/admin/projects/${id}` : null,
  );
  const media = useApiQuery((signal) => listMedia({ limit: 100 }, signal), []);
  const caseStudies = useApiQuery(
    (signal) => adminProjectsService.listCaseStudies(signal),
    [],
  );

  const [caseStudyForm, setCaseStudyForm] = useState<AdminCaseStudyInput | null>(null);
  const [caseStudySaving, setCaseStudySaving] = useState(false);
  const [caseStudyNotice, setCaseStudyNotice] = useState<string | null>(null);
  const [githubMeta, setGithubMeta] = useState<AdminProject | null>(null);
  const [githubBusy, setGithubBusy] = useState(false);
  const [preview, setPreview] = useState<ProjectPreview | null>(null);
  const [previewBusy, setPreviewBusy] = useState<"verify" | "generate" | null>(
    null,
  );
  const [previewNotice, setPreviewNotice] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const githubLink = useApiQuery(
    (signal) =>
      id ? githubService.projectLink(id, signal) : Promise.resolve(null),
    [id],
  );

  useEffect(() => {
    if (!isNew) {
      if (project.data) {
        setForm(fromProject(project.data));
        setGithubMeta(project.data);
        setPreview(previewFromProject(project.data));
      }
      return;
    }
    if (reference.data) {
      setForm(blankForm(reference.data.categories[0]?.id ?? ""));
    }
  }, [isNew, project.data, reference.data]);

  const linkedCaseStudy = useMemo(() => {
    if (!id) return null;
    return (caseStudies.data ?? []).find((item) => item.project_id === id) ?? null;
  }, [caseStudies.data, id]);

  useEffect(() => {
    if (linkedCaseStudy) setCaseStudyForm(caseStudyToInput(linkedCaseStudy));
  }, [linkedCaseStudy]);

  const update = <K extends keyof ProjectFormState>(key: K, value: ProjectFormState[K]) => {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  };

  const save = async (mode: "keep" | "draft" | "publish") => {
    if (saving) return;
    if (!form) {
      setNotice("The editor is still loading. Try again in a moment.");
      return;
    }
    if (!form.title.trim()) {
      setNotice("Please add a project title.");
      setSection("basic");
      return;
    }
    if (!form.category_id) {
      setNotice("Please choose a category before saving.");
      setSection("basic");
      return;
    }
    const status: PublishStatus =
      mode === "keep" ? form.status : mode === "publish" ? "published" : "draft";
    const payload = toPayload(form, status);
    setSavingMode(mode);
    setNotice(null);
    try {
      if (isNew) {
        const created = await adminProjectsService.createProject(payload);
        navigate(`/admin/projects/${created.id}`, {
          replace: true,
          state: {
            notice:
              status === "published"
                ? "Project added and published."
                : "Project added as a draft.",
          },
        });
      } else if (id) {
        const updated = await adminProjectsService.updateProject(id, payload);
        setForm(fromProject(updated));
        setGithubMeta(updated);
        setPreview(previewFromProject(updated));
        setNotice(
          status === "published" && form.status !== "published"
            ? "Project published."
            : status === "published"
              ? "Project saved and published."
              : status === "draft"
                ? "Project saved as a draft."
                : "Project saved.",
        );
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "We couldn't save this project. Please try again.");
    } finally {
      setSavingMode(null);
    }
  };

  const runPreview = async (mode: "verify" | "generate") => {
    if (!id || !form) return;
    setPreviewBusy(mode);
    setPreviewNotice(null);
    setPreviewError(null);
    try {
      const result =
        mode === "verify"
          ? await adminProjectsService.verifyPreview(id, form.live_url)
          : await adminProjectsService.generatePreview(id, form.live_url);
      setPreview(result);
      if (result.live_url) {
        const live = result.live_url;
        setForm((current) =>
          current ? { ...current, live_url: live } : current,
        );
      }
      setGithubMeta((current) =>
        current
          ? {
              ...current,
              live_url: result.live_url ?? current.live_url,
              last_verified_at: result.verified
                ? (result.preview_checked_at ?? current.last_verified_at)
                : current.last_verified_at,
              preview_image: result.preview_image,
              preview_status: result.preview_status,
              preview_source: result.preview_source,
              preview_source_url: result.preview_source_url,
              preview_checked_at: result.preview_checked_at,
              preview_error: result.preview_error,
            }
          : current,
      );
      if (result.preview_status === "generated") {
        setPreviewNotice(
          result.message ?? "Preview created from your live website.",
        );
      } else if (result.preview_status === "verified") {
        setPreviewNotice(
          result.message ?? "Website verified. You can create a preview image next.",
        );
      } else {
        setPreviewError(
          result.preview_error ??
            result.message ??
            "We couldn't create a preview.",
        );
      }
    } catch (error) {
      setPreviewError(
        error instanceof Error
          ? error.message
          : "We couldn't check this website. Please try again.",
      );
    } finally {
      setPreviewBusy(null);
    }
  };

  const saveCaseStudy = async () => {
    if (!caseStudyForm || !id) return;
    if (!caseStudyForm.title.trim()) {
      setCaseStudyNotice("Please add a case study title.");
      return;
    }
    setCaseStudySaving(true);
    setCaseStudyNotice(null);
    try {
      const saved = linkedCaseStudy
        ? await adminProjectsService.updateCaseStudy(linkedCaseStudy.id, caseStudyForm)
        : await adminProjectsService.createCaseStudy(caseStudyForm);
      setCaseStudyForm(caseStudyToInput(saved));
      caseStudies.reload();
      setCaseStudyNotice(
        saved.status === "published"
          ? "Case study saved and published."
          : "Case study saved as a draft.",
      );
    } catch (error) {
      setCaseStudyNotice(
        error instanceof Error ? error.message : "We couldn't save this case study. Please try again.",
      );
    } finally {
      setCaseStudySaving(false);
    }
  };

  const refreshGitHub = async () => {
    if (!id) return;
    setGithubBusy(true);
    setNotice(null);
    try {
      const updated = await adminProjectsService.refreshGitHub(id);
      setGithubMeta(updated);
      setNotice("GitHub details updated.");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? `We couldn't update GitHub details. ${error.message}`
          : "We couldn't update GitHub details. Please try again.",
      );
    } finally {
      setGithubBusy(false);
    }
  };

  const syncLinkedGithub = async () => {
    if (!id) return;
    setGithubBusy(true);
    setNotice(null);
    try {
      const result = await githubService.syncProject(id);
      setNotice(result.message);
      githubLink.reload();
      project.reload();
    } catch (error) {
      setNotice(
        error instanceof Error
          ? `We couldn't sync with GitHub. ${error.message}`
          : "We couldn't sync with GitHub. Please try again.",
      );
    } finally {
      setGithubBusy(false);
    }
  };

  const disconnectLinkedGithub = async () => {
    if (!id) return;
    const confirmed = window.confirm(
      "Remove the GitHub repository link? The project and your content are kept, and you can link it again later.",
    );
    if (!confirmed) return;
    setGithubBusy(true);
    setNotice(null);
    try {
      await githubService.disconnectProject(id);
      githubLink.reload();
      setNotice("GitHub link removed. The project was kept.");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? `We couldn't remove the GitHub link. ${error.message}`
          : "We couldn't remove the GitHub link. Please try again.",
      );
    } finally {
      setGithubBusy(false);
    }
  };

  const remove = async () => {
    if (!id || !form) return;
    const confirmed = window.confirm(
      `Delete "${form.title || "this project"}"? Its images and case study will also be removed. This cannot be undone.`,
    );
    if (!confirmed) return;
    setSavingMode("delete");
    try {
      await adminProjectsService.deleteProject(id);
      navigate("/admin/projects", { replace: true });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "We couldn't delete this project. Please try again.");
      setSavingMode(null);
    }
  };

  if (!isNew && project.error) {
    return (
      <div className="mt-6">
        {project.error.status === 404 ? (
          <ErrorState message="This project no longer exists." />
        ) : (
          <ErrorState
            message="We couldn't load this project. Please try again."
            onRetry={project.reload}
          />
        )}
        <Link to="/admin/projects" className={`${buttonStyles("secondary", "sm")} mt-4`}>
          Back to projects
        </Link>
      </div>
    );
  }

  if (reference.error) {
    return (
      <div className="mt-6">
        <ErrorState
          message="We couldn't load the project options. Please try again."
          onRetry={reference.reload}
        />
      </div>
    );
  }

  if ((!isNew && project.loading) || !reference.data || !form) {
    return (
      <div className="mt-6">
        <LoadingState rows={6} label="Loading project" />
      </div>
    );
  }

  const ref = reference.data;
  const technologyGroups = Array.from(
    new Set(ref.technologies.map((item) => item.kind)),
  ).sort();
  const mediaAssets = media.data?.items ?? [];
  const meta = githubMeta;
  const linkedGithub = githubLink.data;

  return (
    <>
      <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            to="/admin/projects"
            className="inline-flex items-center gap-2 font-mono text-[0.56rem] uppercase tracking-[0.14em] text-muted hover:text-paper"
          >
            <ArrowLeft className="size-3" aria-hidden="true" />
            Projects
          </Link>
          <h1 className="mt-3 text-3xl font-medium tracking-tight text-paper sm:text-4xl">
            {isNew ? "Add project" : form.title || "Untitled project"}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <StatusBadge status={form.status} />
            {!isNew ? (
              <span className="font-mono text-[0.54rem] uppercase tracking-[0.12em] text-muted">
                /{form.slug}
              </span>
            ) : (
              <span className="font-mono text-[0.54rem] uppercase tracking-[0.12em] text-muted">
                Will be saved as a draft
              </span>
            )}
            {form.public_visibility ? null : (
              <span className="font-mono text-[0.54rem] uppercase tracking-[0.12em] text-warning">
                Hidden from public
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isNew && id ? (
            <a
              href={`/admin/projects/${id}/preview`}
              target="_blank"
              rel="noreferrer"
              className={buttonStyles("secondary", "sm")}
            >
              <Eye className="size-3.5" aria-hidden="true" />
              Preview
              <ArrowUpRight className="size-3" aria-hidden="true" />
            </a>
          ) : null}
          {!isNew && form.status === "published" ? (
            <a
              href={`/work/${form.slug}`}
              target="_blank"
              rel="noreferrer"
              className={buttonStyles("secondary", "sm")}
            >
              <Eye className="size-3.5" aria-hidden="true" />
              View website
              <ArrowUpRight className="size-3" aria-hidden="true" />
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => save("draft")}
            disabled={saving}
            className={buttonStyles("secondary", "sm")}
          >
            <Save className="size-3.5" aria-hidden="true" />
            {savingMode === "draft" ? "Saving..." : "Save draft"}
          </button>
          <button
            type="button"
            onClick={() => save("publish")}
            disabled={saving}
            className={buttonStyles("primary", "sm")}
          >
            {savingMode === "publish" ? "Publishing..." : "Publish"}
          </button>
        </div>
      </div>

      {notice ? (
        <p
          ref={noticeRef}
          role="status"
          tabIndex={-1}
          className="mt-4 border border-line bg-ink-800/60 px-4 py-3 text-sm text-paper-dim"
        >
          {notice}
        </p>
      ) : null}

      {!isNew && id ? (
        <div className="mt-4">
          {githubLink.loading ? (
            <p className="border border-line bg-ink-800/40 px-4 py-3 font-mono text-[0.56rem] uppercase tracking-[0.14em] text-muted">
              Checking GitHub link...
            </p>
          ) : githubLink.error ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border border-error/40 bg-error/10 px-4 py-3 text-xs text-error">
              <span>{githubLink.error.message}</span>
              <button type="button" onClick={githubLink.reload} className={buttonStyles("outline", "sm")}>
                Retry
              </button>
            </div>
          ) : linkedGithub?.connected ? (
            <div className="border border-signal/30 bg-signal/5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-mono text-[0.56rem] uppercase tracking-[0.14em] text-signal">
                    <GitBranch className="size-3.5" aria-hidden="true" />
                    Linked GitHub repository
                  </p>
                  <p className="mt-2 truncate text-sm text-paper">
                    {linkedGithub.repository_full_name || linkedGithub.repository_id}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-3 font-mono text-[0.54rem] uppercase tracking-[0.12em] text-muted">
                    <span>{linkedGithub.visibility || "Visibility unknown"}</span>
                    <span className="inline-flex items-center gap-1">
                      <GitBranch className="size-3" aria-hidden="true" />
                      {linkedGithub.default_branch || "Branch unknown"}
                    </span>
                    <span>
                      {linkedGithub.last_synced_at
                        ? `Synced ${relativeTime(linkedGithub.last_synced_at)}`
                        : "Not synced yet"}
                    </span>
                    {linkedGithub.is_archived ? (
                      <span className="text-warning">Archived on GitHub</span>
                    ) : null}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {linkedGithub.repository_url ? (
                    <a
                      href={linkedGithub.repository_url}
                      target="_blank"
                      rel="noreferrer"
                      className={buttonStyles("secondary", "sm")}
                    >
                      <GitBranch className="size-3.5" aria-hidden="true" />
                      Open repository
                      <ArrowUpRight className="size-3" aria-hidden="true" />
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void syncLinkedGithub()}
                    disabled={githubBusy}
                    className={buttonStyles("primary", "sm")}
                  >
                    {githubBusy ? (
                      <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <RefreshCw className="size-3.5" aria-hidden="true" />
                    )}
                    Sync GitHub
                  </button>
                  <button
                    type="button"
                    onClick={() => void disconnectLinkedGithub()}
                    disabled={githubBusy}
                    className={buttonStyles("danger", "sm")}
                  >
                    <Unlink className="size-3.5" aria-hidden="true" />
                    Unlink
                  </button>
                </div>
              </div>
              <p className="mt-3 border-t border-signal/20 pt-3 text-xs leading-relaxed text-muted">
                Syncing updates only the details that come from GitHub, such as the repository
                name, visibility, branch and stars. Your title, description, images and other
                content are never overwritten.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 border border-line bg-ink-800/40 px-4 py-3 text-xs text-paper-dim">
              <span className="flex items-center gap-2">
                <GitBranch className="size-4 text-muted" aria-hidden="true" />
                This project is not linked to a GitHub repository.
              </span>
              <Link to="/admin/github" className={buttonStyles("outline", "sm")}>
                Import from GitHub
              </Link>
            </div>
          )}
        </div>
      ) : null}

      <nav aria-label="Project editor sections" className="mt-6 flex flex-wrap gap-1 border-b border-line">
        {SECTIONS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setSection(item.key)}
            aria-current={section === item.key ? "page" : undefined}
            title={item.hint}
            className={cn(
              "border-b-2 px-3 py-3 font-mono text-[0.58rem] uppercase tracking-[0.14em] transition-colors",
              section === item.key
                ? "border-signal text-paper"
                : "border-transparent text-muted hover:text-paper",
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
        <div className="space-y-6">
          {section === "basic" ? (
            <>
              <AdminPanel
                title="Overview"
                description="The name, web address and introduction."
              >
                <div className="grid gap-5">
                  <Field label="Project title" htmlFor="title" required>
                    <TextInput
                      id="title"
                      value={form.title}
                      onChange={(event) => update("title", event.target.value)}
                      placeholder="Project name"
                    />
                  </Field>
                  <Field
                    label="Web address"
                    htmlFor="slug"
                    hint="Leave blank to create one from the title."
                  >
                    <TextInput
                      id="slug"
                      value={form.slug}
                      onChange={(event) => update("slug", event.target.value)}
                      placeholder="your-project"
                    />
                  </Field>
                  <Field label="Short description" htmlFor="summary" hint={`${form.summary.length}/400 characters`}>
                    <TextArea
                      id="summary"
                      rows={3}
                      value={form.summary}
                      onChange={(event) => update("summary", event.target.value)}
                      placeholder="One or two sentences explaining what the project is and who it is for."
                    />
                  </Field>
                  <Field label="Full description" htmlFor="body" hint={`${form.body.length} characters. Separate paragraphs with a blank line.`}>
                    <TextArea
                      id="body"
                      rows={8}
                      value={form.body}
                      onChange={(event) => update("body", event.target.value)}
                      placeholder="What problem does it address? What did you build, and what was your role?"
                    />
                  </Field>
                </div>
              </AdminPanel>

              <AdminPanel
                title="Category and tools"
                description="How the project is grouped and what it was built with."
              >
                <div className="grid gap-5">
                  <Field label="Main category" htmlFor="category" required>
                    <Select
                      id="category"
                      value={form.category_id}
                      onChange={(event) => {
                        const nextId = event.target.value;
                        update("category_id", nextId);
                        update(
                          "secondary_category_ids",
                          form.secondary_category_ids.filter((item) => item !== nextId),
                        );
                      }}
                      options={ref.categories.map((item) => ({ value: item.id, label: item.name }))}
                    />
                  </Field>

                  <Field label="Secondary categories" hint="Optional. Used for filtering.">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {ref.categories
                        .filter((item) => item.id !== form.category_id)
                        .map((item) => (
                          <Checkbox
                            key={item.id}
                            label={item.name}
                            checked={form.secondary_category_ids.includes(item.id)}
                            onChange={(next) =>
                              update(
                                "secondary_category_ids",
                                next
                                  ? [...form.secondary_category_ids, item.id]
                                  : form.secondary_category_ids.filter((entry) => entry !== item.id),
                              )
                            }
                          />
                        ))}
                    </div>
                  </Field>

                  <Field label="Tools used" hint="Select every tool used.">
                    <div className="space-y-4 border border-line bg-ink-950/50 p-4">
                      {technologyGroups.map((kind) => (
                        <div key={kind}>
                          <p className="font-mono text-[0.52rem] uppercase tracking-[0.14em] text-faint">
                            {kind}
                          </p>
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            {ref.technologies
                              .filter((item) => item.kind === kind)
                              .map((item) => (
                                <Checkbox
                                  key={item.id}
                                  label={item.name}
                                  checked={form.technology_ids.includes(item.id)}
                                  onChange={(next) =>
                                    update(
                                      "technology_ids",
                                      next
                                        ? [...form.technology_ids, item.id]
                                        : form.technology_ids.filter((entry) => entry !== item.id),
                                    )
                                  }
                                />
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Field>

                  <Field label="Other tools" htmlFor="extra-technologies" hint="Separate each tool with a comma.">
                    <TextInput
                      id="extra-technologies"
                      value={form.extra_technologies}
                      onChange={(event) => update("extra_technologies", event.target.value)}
                      placeholder="Docker, Redis"
                    />
                  </Field>
                </div>
              </AdminPanel>

              <AdminPanel
                title="Role and dates"
                description="Your role, when the work happened and its stage."
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Role" htmlFor="role" hint="For example: Full-stack developer">
                    <TextInput id="role" value={form.role} onChange={(event) => update("role", event.target.value)} />
                  </Field>
                  <Field label="Year" htmlFor="year">
                    <TextInput
                      id="year"
                      type="number"
                      min={1900}
                      max={2200}
                      value={form.year}
                      onChange={(event) => update("year", event.target.value)}
                    />
                  </Field>
                  <Field label="Start date" htmlFor="started">
                    <TextInput
                      id="started"
                      type="date"
                      value={form.started_on}
                      onChange={(event) => update("started_on", event.target.value)}
                    />
                  </Field>
                  <Field label="End date" htmlFor="completed">
                    <TextInput
                      id="completed"
                      type="date"
                      value={form.completed_on}
                      onChange={(event) => update("completed_on", event.target.value)}
                    />
                  </Field>
                  <Field label="Type" htmlFor="mode">
                    <Select
                      id="mode"
                      value={form.primary_mode}
                      onChange={(event) => update("primary_mode", event.target.value)}
                      options={ref.modes.map((item) => ({ value: item.value, label: item.label }))}
                    />
                  </Field>
                  <Field label="Stage" htmlFor="stage">
                    <Select
                      id="stage"
                      value={form.project_status}
                      onChange={(event) => update("project_status", event.target.value)}
                      options={PROJECT_STAGE_ORDER.map((stage) => ({
                        value: stage,
                        label: PROJECT_STAGE_LABELS[stage],
                      }))}
                    />
                  </Field>
                </div>
              </AdminPanel>
            </>
          ) : null}

          {section === "media" ? (
            <AdminPanel
              title="Cover and gallery"
              description="The cover image appears on cards. The gallery appears on the project page."
              actions={
                <button
                  type="button"
                  onClick={() => update("media", [...form.media, { ...emptyMedia }])}
                  className={buttonStyles("secondary", "sm")}
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                  Add item
                </button>
              }
            >
              <div className="grid gap-5">
                <Field label="Cover image" hint="Used on cards and the project header.">
                  <MediaField
                    value={form.cover_image}
                    onChange={(url) => update("cover_image", url)}
                    assets={mediaAssets}
                    loading={media.loading}
                    onUploaded={() => media.reload()}
                    title={form.title}
                    altText={`${form.title} cover image`}
                    emptyLabel="No cover selected."
                  />
                </Field>

                {form.media.length === 0 ? (
                  <div className="flex items-center gap-3 border border-dashed border-line-strong px-4 py-5 text-sm text-muted">
                    <ImageIcon className="size-4" aria-hidden="true" />
                    No gallery items yet. Add a screenshot, diagram or video when you have one.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {form.media.map((item, index) => (
                      <div key={index} className="border border-line bg-ink-950/40 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-mono text-[0.54rem] uppercase tracking-[0.14em] text-muted">
                            Item {String(index + 1).padStart(2, "0")}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              update(
                                "media",
                                form.media.filter((_, itemIndex) => itemIndex !== index),
                              )
                            }
                            className="text-muted transition-colors hover:text-signal"
                            aria-label={`Remove item ${index + 1}`}
                          >
                            <Trash2 className="size-3.5" aria-hidden="true" />
                          </button>
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            {item.media_type === "video" ? (
                              <Field label="Video link" htmlFor={`media-url-${index}`}>
                                <TextInput
                                  id={`media-url-${index}`}
                                  value={item.url}
                                  onChange={(event) =>
                                    update(
                                      "media",
                                      form.media.map((entry, itemIndex) =>
                                        itemIndex === index
                                          ? { ...entry, url: event.target.value }
                                          : entry,
                                      ),
                                    )
                                  }
                                  placeholder="https://example.com"
                                />
                              </Field>
                            ) : (
                              <Field label="Image">
                                <MediaField
                                  value={item.url}
                                  onChange={(url) =>
                                    update(
                                      "media",
                                      form.media.map((entry, itemIndex) =>
                                        itemIndex === index ? { ...entry, url } : entry,
                                      ),
                                    )
                                  }
                                  assets={mediaAssets}
                                  loading={media.loading}
                                  onUploaded={() => media.reload()}
                                  title={form.title}
                                  altText={item.alt_text || `${form.title} gallery image`}
                                  emptyLabel="No image selected."
                                />
                              </Field>
                            )}
                          </div>
                          <Field label="Description" htmlFor={`media-alt-${index}`} hint="Describe what the image shows.">
                            <TextInput
                              id={`media-alt-${index}`}
                              value={item.alt_text}
                              onChange={(event) =>
                                update(
                                  "media",
                                  form.media.map((entry, itemIndex) =>
                                    itemIndex === index ? { ...entry, alt_text: event.target.value } : entry,
                                  ),
                                )
                              }
                            />
                          </Field>
                          <Field label="Caption" htmlFor={`media-caption-${index}`}>
                            <TextInput
                              id={`media-caption-${index}`}
                              value={item.caption}
                              onChange={(event) =>
                                update(
                                  "media",
                                  form.media.map((entry, itemIndex) =>
                                    itemIndex === index ? { ...entry, caption: event.target.value } : entry,
                                  ),
                                )
                              }
                            />
                          </Field>
                          <Field label="Type" htmlFor={`media-type-${index}`}>
                            <Select
                              id={`media-type-${index}`}
                              value={item.media_type}
                              onChange={(event) =>
                                update(
                                  "media",
                                  form.media.map((entry, itemIndex) =>
                                    itemIndex === index
                                      ? { ...entry, media_type: event.target.value as MediaType }
                                      : entry,
                                  ),
                                )
                              }
                              options={[
                                { value: "image", label: "Image / screenshot" },
                                { value: "diagram", label: "Diagram" },
                                { value: "video", label: "Video" },
                              ]}
                            />
                          </Field>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </AdminPanel>
          ) : null}

          {section === "deployment" ? (
            <>
              <AdminPanel
                title="Project links"
                description="Only the links you fill in are shown."
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Live website" htmlFor="live" hint="Used for the main link and preview.">
                    <TextInput id="live" type="url" value={form.live_url} onChange={(event) => update("live_url", event.target.value)} placeholder="https://example.com" />
                  </Field>
                  <Field label="Hosting link" htmlFor="deployment-url" hint="Only if it differs from the live website.">
                    <TextInput id="deployment-url" type="url" value={form.deployment_url} onChange={(event) => update("deployment_url", event.target.value)} placeholder="https://example.com" />
                  </Field>
                  <Field label="GitHub link" htmlFor="github" hint="Link to the source code.">
                    <TextInput id="github" type="url" value={form.github_url} onChange={(event) => update("github_url", event.target.value)} placeholder="https://github.com/username/project" />
                  </Field>
                  <Field label="Code repository" htmlFor="repo">
                    <TextInput id="repo" type="url" value={form.repository_url} onChange={(event) => update("repository_url", event.target.value)} placeholder="https://example.com" />
                  </Field>
                  <Field label="Documentation" htmlFor="docs">
                    <TextInput id="docs" type="url" value={form.documentation_url} onChange={(event) => update("documentation_url", event.target.value)} placeholder="https://example.com" />
                  </Field>
                  <Field label="Demo or walkthrough" htmlFor="demo">
                    <TextInput id="demo" type="url" value={form.demo_url} onChange={(event) => update("demo_url", event.target.value)} placeholder="https://example.com" />
                  </Field>
                  <Field label="Video" htmlFor="video">
                    <TextInput id="video" type="url" value={form.video_url} onChange={(event) => update("video_url", event.target.value)} placeholder="https://example.com" />
                  </Field>
                  <Field label="Download" htmlFor="download">
                    <TextInput id="download" type="url" value={form.download_url} onChange={(event) => update("download_url", event.target.value)} placeholder="https://example.com" />
                  </Field>
                  <Field label="Other project link" htmlFor="external-project">
                    <TextInput id="external-project" type="url" value={form.external_project_url} onChange={(event) => update("external_project_url", event.target.value)} placeholder="https://example.com" />
                  </Field>
                  <Field label="Other link" htmlFor="external">
                    <TextInput id="external" type="url" value={form.external_url} onChange={(event) => update("external_url", event.target.value)} placeholder="https://example.com" />
                  </Field>
                </div>
              </AdminPanel>

              <AdminPanel
                title="Homepage preview"
                description="A real screenshot of your live website."
              >
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={cn(
                          "inline-flex w-fit items-center gap-1 border px-2 py-0.5 font-mono text-[0.54rem] uppercase leading-none tracking-[0.14em]",
                          PREVIEW_TONES[preview?.preview_status ?? "not_discovered"],
                        )}
                      >
                        {PREVIEW_LABELS[preview?.preview_status ?? "not_discovered"]}
                      </span>
                      {preview?.preview_checked_at ? (
                        <span className="text-xs text-muted">
                          Checked {relativeTime(preview.preview_checked_at)}
                        </span>
                      ) : null}
                    </div>

                    <div>
                      <p className="type-meta text-faint">Website address</p>
                      <p className="mt-1 break-all text-sm text-paper">
                        {preview?.preview_source_url ||
                          form.live_url ||
                          "No live website added yet."}
                      </p>
                      {preview?.preview_source ? (
                        <p className="mt-1 text-xs text-muted">
                          Found in:{" "}
                          {PREVIEW_SOURCE_LABELS[preview.preview_source] ??
                            preview.preview_source}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => runPreview("verify")}
                        disabled={
                          !id || previewBusy !== null || !form.live_url.trim()
                        }
                        className={buttonStyles("secondary", "sm")}
                      >
                        {previewBusy === "verify" ? (
                          <LoaderCircle
                            className="size-3.5 animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <ShieldCheck className="size-3.5" aria-hidden="true" />
                        )}
                        Check website
                      </button>                      <button
                        type="button"
                        onClick={() => runPreview("generate")}
                        disabled={
                          !id || previewBusy !== null || !form.live_url.trim()
                        }
                        className={buttonStyles("primary", "sm")}
                      >
                        {previewBusy === "generate" ? (
                          <LoaderCircle
                            className="size-3.5 animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <RefreshCw className="size-3.5" aria-hidden="true" />
                        )}
                        {preview?.preview_status === "generated"
                          ? "Refresh preview"
                          : "Create preview"}
                      </button>
                      {preview?.preview_source_url || form.live_url ? (
                        <a
                          href={preview?.preview_source_url || form.live_url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className={buttonStyles("outline", "sm")}
                        >
                          <ArrowUpRight
                            className="size-3.5"
                            aria-hidden="true"
                          />
                          Open site
                        </a>
                      ) : null}
                    </div>

                    {!id ? (
                      <p className="text-xs text-muted">
                        Save this project as a draft before checking its website.
                      </p>
                    ) : null}
                    {previewError ? (
                      <p
                        role="alert"
                        className="border border-error/40 bg-error/10 px-3 py-2 text-sm text-error"
                      >
                        {previewError}
                      </p>
                    ) : null}
                    {previewNotice ? (
                      <p
                        role="status"
                        className="border border-success/40 bg-success/10 px-3 py-2 text-sm text-success"
                      >
                        {previewNotice}
                      </p>
                    ) : null}
                    <p className="text-xs leading-relaxed text-muted">
                      Fix the live website address above, check it, then create the preview.
                      Nothing is published automatically.
                    </p>
                  </div>

                  <div>
                    {preview?.preview_image &&
                    preview.preview_status === "generated" ? (
                      <a
                        href={
                          preview.preview_source_url ||
                          preview.live_url ||
                          form.live_url
                        }
                        target="_blank"
                        rel="noreferrer noopener"
                        className="block overflow-hidden border border-line bg-ink transition-colors hover:border-line-strong"
                      >
                        <img
                          src={preview.preview_image}
                          alt={`Captured homepage of ${form.title || "this project"}`}
                          className="aspect-[16/10] w-full object-cover object-top"
                          loading="lazy"
                        />
                      </a>
                    ) : (
                      <div className="flex aspect-[16/10] w-full flex-col items-center justify-center border border-dashed border-line bg-ink/60 px-6 text-center">
                        <Globe
                          className="size-5 text-faint"
                          aria-hidden="true"
                        />
                        <p className="mt-3 text-sm text-paper">
                          No preview yet.
                        </p>
                        <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted">
                          Check the website address, then create a screenshot. If there is no live
                          site, this stays empty.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </AdminPanel>

              <AdminPanel
                title="Hosting"
                description="Where the project is hosted."
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Provider" htmlFor="provider">
                    <Select
                      id="provider"
                      value={form.deployment_provider}
                      onChange={(event) => update("deployment_provider", event.target.value)}
                      options={[
                        { value: "", label: "Not recorded" },
                        ...ref.deployment_providers.map((provider) => ({
                          value: provider,
                          label: provider.replace(/_/g, " "),
                        })),
                      ]}
                    />
                  </Field>
                  <Field label="Hosting status" htmlFor="deployment-status">
                    <Select
                      id="deployment-status"
                      value={form.deployment_status}
                      onChange={(event) =>
                        update("deployment_status", event.target.value as DeploymentStatus)
                      }
                      options={ref.deployment_statuses.map((item) => ({
                        value: item.value,
                        label: item.label,
                      }))}
                    />
                  </Field>
                  <Field label="Last checked" htmlFor="verified" hint="When you last checked the live website yourself.">
                    <TextInput
                      id="verified"
                      type="datetime-local"
                      value={form.last_verified_at}
                      onChange={(event) => update("last_verified_at", event.target.value)}
                    />
                  </Field>
                  <div className="flex flex-col justify-end gap-3 pb-1">
                    <Checkbox
                      label="Allow embedded preview"
                      checked={form.embed_enabled}
                      onChange={(next) => update("embed_enabled", next)}
                      hint="Some websites do not allow this."
                    />
                    <Checkbox
                      label="Visible on the public site"
                      checked={form.public_visibility}
                      onChange={(next) => update("public_visibility", next)}
                      hint="Turn off to hide it from your website."
                    />
                  </div>
                </div>
              </AdminPanel>

              <AdminPanel
                title="GitHub details"
                description="Only updated when you ask."
                actions={
                  <button
                    type="button"
                    onClick={refreshGitHub}
                    disabled={isNew || githubBusy}
                    className={buttonStyles("secondary", "sm")}
                  >
                    {githubBusy ? (
                      <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <GitBranch className="size-3.5" aria-hidden="true" />
                    )}
                    {githubBusy ? "Updating..." : "Update from GitHub"}
                  </button>
                }
              >
                {meta?.github_metadata_checked_at ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      ["Stars", meta.github_stars],
                      ["Forks", meta.github_forks],
                      ["Open issues", meta.github_open_issues],
                      ["Language", meta.github_language],
                    ].map(([label, value]) => (
                      <div key={label as string} className="border border-line bg-ink-950/40 p-4">
                        <p className="font-mono text-[0.52rem] uppercase tracking-[0.12em] text-faint">
                          {label}
                        </p>
                        <p className="mt-2 text-lg text-paper">
                          {value === null || value === undefined ? "—" : String(value)}
                        </p>
                      </div>
                    ))}
                    <p className="sm:col-span-2 lg:col-span-4 font-mono text-[0.54rem] uppercase tracking-[0.1em] text-faint">
                      Checked {new Date(meta.github_metadata_checked_at).toLocaleString()}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed text-muted">
                    No GitHub details yet. Add a GitHub link, save the project, then update. If the
                    repository is private or GitHub can't be reached, the update fails and your
                    existing details are kept.
                  </p>
                )}
              </AdminPanel>
            </>
          ) : null}

          {section === "case-study" ? (
            <AdminPanel
              title="Linked case study"
              description="Shown on the project page."
              actions={
                caseStudyForm ? (
                  <span className="font-mono text-[0.52rem] uppercase tracking-[0.1em] text-faint">
                    {linkedCaseStudy ? "Saved" : "Not saved yet"}
                  </span>
                ) : null
              }
            >
              {!id ? (
                <p className="text-sm leading-relaxed text-muted">
                  Save the project first, then come back to write the case study.
                </p>
              ) : !caseStudyForm ? (
                <div className="space-y-4">
                  <p className="text-sm leading-relaxed text-muted">
                    No case study yet. Add one to explain the problem, the decisions you made and
                    the result.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setCaseStudyForm(newCaseStudy(id, form.title, form.slug))
                    }
                    className={buttonStyles("secondary", "sm")}
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                    Add case study
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Title" htmlFor="cs-title" required>
                      <TextInput
                        id="cs-title"
                        value={caseStudyForm.title}
                        onChange={(event) =>
                          setCaseStudyForm({ ...caseStudyForm, title: event.target.value })
                        }
                      />
                    </Field>
                    <Field label="Web address" htmlFor="cs-slug" hint="The address for the full case study.">
                      <TextInput
                        id="cs-slug"
                        value={caseStudyForm.slug ?? ""}
                        onChange={(event) =>
                          setCaseStudyForm({ ...caseStudyForm, slug: event.target.value || null })
                        }
                      />
                    </Field>
                    <Field label="Summary" htmlFor="cs-summary" className="sm:col-span-2">
                      <TextArea
                        id="cs-summary"
                        rows={2}
                        value={caseStudyForm.summary ?? ""}
                        onChange={(event) =>
                          setCaseStudyForm({ ...caseStudyForm, summary: event.target.value || null })
                        }
                      />
                    </Field>
                  </div>

                  <div className="grid gap-5">
                    {CASE_STUDY_TEXT_FIELDS.map((item) => (
                      <Field key={item.key} label={item.label} htmlFor={`cs-${item.key}`} hint={item.hint}>
                        <TextArea
                          id={`cs-${item.key}`}
                          rows={item.key === "overview" ? 5 : 4}
                          value={(caseStudyForm[item.key] as string | null) ?? ""}
                          onChange={(event) =>
                            setCaseStudyForm({ ...caseStudyForm, [item.key]: event.target.value || null })
                          }
                        />
                      </Field>
                    ))}
                  </div>

                  <div className="grid gap-5 border-t border-line pt-5 sm:grid-cols-2">
                    <Field label="Result type" htmlFor="cs-result-type" hint="Optional label, such as outcome or metric.">
                      <TextInput
                        id="cs-result-type"
                        value={caseStudyForm.result_type ?? ""}
                        onChange={(event) =>
                          setCaseStudyForm({ ...caseStudyForm, result_type: event.target.value || null })
                        }
                      />
                    </Field>
                    <Field label="Status" htmlFor="cs-status">
                      <Select
                        id="cs-status"
                        value={caseStudyForm.status}
                        onChange={(event) =>
                          setCaseStudyForm({
                            ...caseStudyForm,
                            status: event.target.value as PublishStatus,
                          })
                        }
                        options={[
                          { value: "draft", label: "Draft (private)" },
                          { value: "published", label: "Published (visible on your website)" },
                          { value: "archived", label: "Archived" },
                        ]}
                      />
                    </Field>
                    <div className="flex flex-col gap-3 sm:col-span-2">
                      <Checkbox
                        label="Feature this case study"
                        checked={caseStudyForm.featured}
                        onChange={(next) => setCaseStudyForm({ ...caseStudyForm, featured: next })}
                      />
                      <Checkbox
                        label="This case study is not finished yet"
                        checked={caseStudyForm.is_placeholder}
                        onChange={(next) =>
                          setCaseStudyForm({ ...caseStudyForm, is_placeholder: next })
                        }
                      />
                    </div>
                  </div>

                  <Field
                    label="Hidden sections"
                    hint="Tick any sections you want to hide."
                  >
                    <div className="grid gap-2 border border-line bg-ink-950/40 p-4 sm:grid-cols-2">
                      {ref.case_study_sections.map((item) => {
                        const checked = caseStudyForm.hidden_sections.includes(item.value);
                        return (
                          <Checkbox
                            key={item.value}
                            label={item.label}
                            checked={checked}
                            onChange={(next) =>
                              setCaseStudyForm({
                                ...caseStudyForm,
                                hidden_sections: next
                                  ? [...caseStudyForm.hidden_sections, item.value]
                                  : caseStudyForm.hidden_sections.filter(
                                      (entry) => entry !== item.value,
                                    ),
                              })
                            }
                          />
                        );
                      })}
                    </div>
                  </Field>

                  {caseStudyNotice ? (
                    <p role="status" className="border border-line bg-ink-800/60 px-4 py-3 text-sm text-paper-dim">
                      {caseStudyNotice}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
                    <button
                      type="button"
                      onClick={saveCaseStudy}
                      disabled={caseStudySaving}
                      className={buttonStyles("primary", "sm")}
                    >
                      <Save className="size-3.5" aria-hidden="true" />
                      {caseStudySaving ? "Saving..." : "Save case study"}
                    </button>
                    {linkedCaseStudy ? (
                      <Link
                        to={`/admin/case-studies/${linkedCaseStudy.id}`}
                        className={buttonStyles("secondary", "sm")}
                      >
                        <FileText className="size-3.5" aria-hidden="true" />
                        Open full case study
                      </Link>
                    ) : null}
                  </div>
                </div>
              )}
            </AdminPanel>
          ) : null}

          {section === "seo" ? (
            <AdminPanel
              title="Search and sharing"
              description="Optional text for search results and shared links."
            >
              <div className="grid gap-5">
                <Field label="Search title" htmlFor="seo-title" hint={`${form.seo_title.length}/200 characters`}>
                  <TextInput
                    id="seo-title"
                    value={form.seo_title}
                    onChange={(event) => update("seo_title", event.target.value)}
                    placeholder={`${form.title || "Project"} — case study`}
                  />
                </Field>
                <Field label="Search description" htmlFor="seo-description" hint={`${form.seo_description.length} characters`}>
                  <TextArea
                    id="seo-description"
                    rows={3}
                    value={form.seo_description}
                    onChange={(event) => update("seo_description", event.target.value)}
                    placeholder="A short description for search results and link previews."
                  />
                </Field>
                <Field label="Social share image">
                  <MediaField
                    value={form.og_image}
                    onChange={(url) => update("og_image", url)}
                    assets={mediaAssets}
                    loading={media.loading}
                    onUploaded={() => media.reload()}
                    title={form.title}
                    altText={`${form.title} social preview`}
                    emptyLabel="No social share image selected."
                  />
                </Field>
                <div className="border border-line bg-ink-950/40 p-4">
                  <p className="font-mono text-[0.52rem] uppercase tracking-[0.12em] text-faint">
                    Search result preview
                  </p>
                  <p className="mt-2 text-base text-signal-soft">
                    {form.seo_title || `${form.title || "Project title"} — Philemon Melabah`}
                  </p>
                  <p className="mt-1 text-xs text-success">
                    /work/{form.slug || "project-slug"}
                  </p>
                  <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted">
                    {form.seo_description ||
                      form.summary ||
                      "The project summary appears here when no search description is set."}
                  </p>
                </div>
              </div>
            </AdminPanel>
          ) : null}

          {section === "publishing" ? (
            <AdminPanel
              title="Publishing"
              description="Choose who can see this project."
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Visibility" htmlFor="status">
                  <Select
                    id="status"
                    value={form.status}
                    onChange={(event) => update("status", event.target.value as PublishStatus)}
                    options={[
                      { value: "draft", label: "Draft (private)" },
                      { value: "published", label: "Published (visible on your website)" },
                      { value: "archived", label: "Archived (hidden)" },
                    ]}
                  />
                </Field>
                <Field label="Display order" htmlFor="sort" hint="Lower numbers appear first on your website.">
                  <TextInput
                    id="sort"
                    type="number"
                    value={form.sort_order}
                    onChange={(event) => update("sort_order", event.target.value)}
                  />
                </Field>
                <div className="flex flex-col gap-3 sm:col-span-2">
                  <Checkbox
                    label="Feature on the homepage"
                    checked={form.featured}
                    onChange={(next) => update("featured", next)}
                  />
                  <Checkbox
                    label="This project is not finished yet"
                    checked={form.is_placeholder}
                    onChange={(next) => update("is_placeholder", next)}
                    hint="Your website will show a note until it is final."
                  />
                  <Checkbox
                    label="Visible on the public site"
                    checked={form.public_visibility}
                    onChange={(next) => update("public_visibility", next)}
                  />
                </div>
              </div>
            </AdminPanel>
          ) : null}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24">
          <AdminPanel title="Save">
            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => save("keep")}
                disabled={saving}
                className={buttonStyles("secondary", "md", "w-full")}
              >
                <Save className="size-3.5" aria-hidden="true" />
                {savingMode === "keep" ? "Saving..." : "Save changes"}
              </button>
              <button
                type="button"
                onClick={() => save("publish")}
                disabled={saving}
                className={buttonStyles("primary", "md", "w-full")}
              >
                <Check className="size-3.5" aria-hidden="true" />
                {savingMode === "publish" ? "Publishing..." : "Publish project"}
              </button>
              <p className="text-[0.68rem] leading-relaxed text-faint">
                Drafts are never public.
              </p>
            </div>
          </AdminPanel>

          {!isNew ? (
            <AdminPanel title="Details">
              <dl className="space-y-3 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <dt className="font-mono text-[0.52rem] uppercase tracking-[0.12em] text-muted">Published</dt>
                  <dd className="text-paper-dim">
                    {project.data?.published_at
                      ? new Date(project.data.published_at).toLocaleDateString()
                      : "Not published"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="font-mono text-[0.52rem] uppercase tracking-[0.12em] text-muted">Updated</dt>
                  <dd className="text-paper-dim">
                    {project.data?.updated_at
                      ? new Date(project.data.updated_at).toLocaleString()
                      : "—"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="font-mono text-[0.52rem] uppercase tracking-[0.12em] text-muted">Media</dt>
                  <dd className="text-paper-dim">{form.media.length}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="font-mono text-[0.52rem] uppercase tracking-[0.12em] text-muted">Case study</dt>
                  <dd className="text-paper-dim">
                    {linkedCaseStudy
                      ? linkedCaseStudy.status === "published"
                        ? "Published"
                        : linkedCaseStudy.status === "draft"
                          ? "Draft"
                          : "Archived"
                      : "Not added"}
                  </dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={remove}
                disabled={saving}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 border border-signal/40 px-3 py-2.5 font-mono text-[0.56rem] uppercase tracking-[0.12em] text-signal transition-colors hover:bg-signal hover:text-ink-950 disabled:opacity-40"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                Delete project
              </button>
            </AdminPanel>
          ) : null}
        </aside>
      </div>
    </>
  );
}
