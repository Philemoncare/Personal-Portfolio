import {
  ArrowLeft,
  ArrowUpRight,
  Eye,
  Save,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import {
  AdminPanel,
  Checkbox,
  Field,
  Select,
  StatusBadge,
  TextArea,
  TextInput,
} from "@/components/admin/form";
import { MediaField } from "@/components/admin/MediaField";
import { buttonStyles } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { useApiResource } from "@/hooks/useApiResource";
import { useApiQuery } from "@/hooks/useApiQuery";
import {
  adminProjectsService,
  type AdminCaseStudyInput,
} from "@/services/adminProjects.service";
import { listMedia } from "@/services/auth.service";
import type {
  AdminCaseStudy,
  AdminReference,
  CaseStudySectionKey,
  PublishStatus,
} from "@/types/api";
import { relativeTime } from "@/utils/format";

const PRIMARY_KEYS: CaseStudySectionKey[] = [
  "overview",
  "problem",
  "context",
  "goals",
  "research",
  "planning",
  "architecture",
  "design",
  "implementation",
  "challenges",
  "technical_decisions",
  "testing",
  "results",
  "lessons",
  "future_improvements",
];

const EXTRA_KEYS: CaseStudySectionKey[] = [
  "idea",
  "solution",
  "role",
  "technology",
  "key_features",
];

const HINTS: Partial<Record<CaseStudySectionKey, string>> = {
  overview: "What the project is, in two or three short paragraphs.",
  problem: "What was missing or broken? Describe it plainly.",
  context: "The setting, constraints, team and timeline.",
  goals: "What the work was meant to achieve. Keep it specific.",
  research: "What you read, compared or tested before building.",
  planning: "How the work was planned and ordered.",
  architecture: "Explain the real system. Diagrams added in the project editor appear here automatically.",
  design: "Interface, data or system design decisions.",
  implementation: "How it was built, in plain language.",
  challenges:
    "Use the labels below so the page can format them:\nCHALLENGE: what was difficult?\nAPPROACH: how did you handle it?\nOUTCOME: what changed?",
  technical_decisions:
    "Explain why, not just what. For example, why this database or this hosting setup.",
  testing: "What you tested and how. Only include checks that actually happened.",
  results:
    "Only real outcomes. If you have no numbers, describe the result in words.",
  lessons: "What you would do differently, or what the work taught you.",
  future_improvements: "What is still incomplete or planned.",
  idea: "Optional early idea or starting point.",
  solution: "Optional summary of the final solution.",
  role: "Optional details about your part in the work.",
  technology: "Optional notes about the tools used. The main list comes from the project.",
  key_features: "Optional list of main features.",
};

interface StudyFormState {
  project_id: string;
  title: string;
  slug: string;
  summary: string;
  cover_image_url: string;
  status: PublishStatus;
  featured: boolean;
  sort_order: string;
  is_placeholder: boolean;
  result_type: string;
  hidden_sections: CaseStudySectionKey[];
  sections: Record<string, string>;
}

const ALL_KEYS = [...PRIMARY_KEYS, ...EXTRA_KEYS];

function blankSections(): Record<string, string> {
  return Object.fromEntries(ALL_KEYS.map((key) => [key, ""]));
}

function fromStudy(study: AdminCaseStudy): StudyFormState {
  const sections = blankSections();
  for (const key of ALL_KEYS) {
    sections[key] = study[key] ?? "";
  }
  return {
    project_id: study.project_id ?? "",
    title: study.title,
    slug: study.slug,
    summary: study.summary ?? "",
    cover_image_url: study.cover_image_url ?? "",
    status: study.status,
    featured: study.featured,
    sort_order: String(study.sort_order),
    is_placeholder: study.is_placeholder,
    result_type: study.result_type ?? "",
    hidden_sections: (study.hidden_sections ?? []) as CaseStudySectionKey[],
    sections,
  };
}

function blankForm(): StudyFormState {
  return {
    project_id: "",
    title: "",
    slug: "",
    summary: "",
    cover_image_url: "",
    status: "draft",
    featured: false,
    sort_order: "100",
    is_placeholder: false,
    result_type: "",
    hidden_sections: [],
    sections: blankSections(),
  };
}

function optional(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toPayload(form: StudyFormState, status: PublishStatus): AdminCaseStudyInput {
  return {
    project_id: form.project_id || null,
    title: form.title.trim(),
    slug: optional(form.slug),
    summary: optional(form.summary),
    cover_image_url: optional(form.cover_image_url),
    overview: optional(form.sections.overview ?? ""),
    problem: optional(form.sections.problem ?? ""),
    context: optional(form.sections.context ?? ""),
    goals: optional(form.sections.goals ?? ""),
    idea: optional(form.sections.idea ?? ""),
    research: optional(form.sections.research ?? ""),
    planning: optional(form.sections.planning ?? ""),
    design: optional(form.sections.design ?? ""),
    solution: optional(form.sections.solution ?? ""),
    role: optional(form.sections.role ?? ""),
    architecture: optional(form.sections.architecture ?? ""),
    technology: optional(form.sections.technology ?? ""),
    key_features: optional(form.sections.key_features ?? ""),
    technical_decisions: optional(form.sections.technical_decisions ?? ""),
    challenges: optional(form.sections.challenges ?? ""),
    implementation: optional(form.sections.implementation ?? ""),
    testing: optional(form.sections.testing ?? ""),
    results: optional(form.sections.results ?? ""),
    result_type: form.result_type || null,
    lessons: optional(form.sections.lessons ?? ""),
    future_improvements: optional(form.sections.future_improvements ?? ""),
    hidden_sections: form.hidden_sections,
    featured: form.featured,
    sort_order: Number(form.sort_order) || 0,
    status,
    is_placeholder: form.is_placeholder,
  };
}

export default function AdminCaseStudyEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const navigate = useNavigate();
  const location = useLocation();
  const [notice, setNotice] = useState<string | null>(
    (location.state as { notice?: string } | null)?.notice ?? null,
  );
  const [form, setForm] = useState<StudyFormState | null>(null);
  const [saving, setSaving] = useState(false);

  const reference = useApiResource<AdminReference>("/api/v1/admin/reference");
  const study = useApiResource<AdminCaseStudy>(
    id ? `/api/v1/admin/case-studies/${id}` : null,
  );
  const projects = useApiQuery(
    (signal) => adminProjectsService.listProjects({}, signal),
    [],
  );
  const media = useApiQuery((signal) => listMedia({ limit: 100 }, signal), []);

  useEffect(() => {
    if (!isNew) {
      if (study.data) setForm(fromStudy(study.data));
      return;
    }
    setForm((current) => current ?? blankForm());
  }, [isNew, study.data]);

  const update = <K extends keyof StudyFormState>(key: K, value: StudyFormState[K]) => {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  };

  const updateSection = (key: string, value: string) => {
    setForm((current) =>
      current
        ? { ...current, sections: { ...current.sections, [key]: value } }
        : current,
    );
  };

  const toggleSection = (key: CaseStudySectionKey, visible: boolean) => {
    setForm((current) => {
      if (!current) return current;
      const hidden = new Set(current.hidden_sections);
      if (visible) hidden.delete(key);
      else hidden.add(key);
      return { ...current, hidden_sections: Array.from(hidden) };
    });
  };

  const sectionLabels = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of reference.data?.case_study_sections ?? []) {
      map.set(item.value, item.label);
    }
    return map;
  }, [reference.data]);

  const save = async (mode: "keep" | "draft" | "publish") => {
    if (!form) return;
    if (!form.title.trim()) {
      setNotice("Please add a case study title.");
      return;
    }
    const status: PublishStatus =
      mode === "keep" ? form.status : mode === "publish" ? "published" : "draft";
    setSaving(true);
    setNotice(null);
    try {
      if (isNew) {
        const created = await adminProjectsService.createCaseStudy(toPayload(form, status));
        navigate(`/admin/case-studies/${created.id}`, {
          replace: true,
          state: { notice: "Case study added." },
        });
      } else if (id) {
        const updated = await adminProjectsService.updateCaseStudy(
          id,
          toPayload(form, status),
        );
        setForm(fromStudy(updated));
        setNotice(
          status === "published"
            ? "Case study saved and published."
            : status === "draft"
              ? "Case study saved as a draft."
              : "Case study saved.",
        );
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "We couldn't save this case study. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!id || !form) return;
    const confirmed = window.confirm(
      `Delete "${form.title}"? The linked project is kept. This cannot be undone.`,
    );
    if (!confirmed) return;
    setSaving(true);
    try {
      await adminProjectsService.deleteCaseStudy(id);
      navigate("/admin/case-studies", { replace: true });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "We couldn't delete this case study. Please try again.");
      setSaving(false);
    }
  };

  if (!isNew && study.error) {
    return (
      <div className="mt-6">
        {study.error.status === 404 ? (
          <ErrorState message="This case study no longer exists." />
        ) : (
          <ErrorState
            message="We couldn't load this case study. Please try again."
            onRetry={study.reload}
          />
        )}
        <Link to="/admin/case-studies" className={`${buttonStyles("secondary", "sm")} mt-4`}>
          Back to case studies
        </Link>
      </div>
    );
  }

  if (reference.error) {
    return (
      <div className="mt-6">
        <ErrorState
          message="We couldn't load the case study options. Please try again."
          onRetry={reference.reload}
        />
      </div>
    );
  }

  if ((!isNew && study.loading) || !reference.data || !form) {
    return (
      <div className="mt-6">
        <LoadingState rows={6} label="Loading case study" />
      </div>
    );
  }

  const linkedProject = projects.data?.find((item) => item.id === form.project_id);

  return (
    <>
      <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            to="/admin/case-studies"
            className="inline-flex items-center gap-2 font-mono text-[0.56rem] uppercase tracking-[0.14em] text-muted hover:text-paper"
          >
            <ArrowLeft className="size-3" aria-hidden="true" />
            Case studies
          </Link>
          <h1 className="mt-3 text-3xl font-medium tracking-tight text-paper sm:text-4xl">
            {isNew ? "Add case study" : form.title || "Untitled case study"}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <StatusBadge status={form.status} />
            <span className="font-mono text-[0.54rem] uppercase tracking-[0.12em] text-muted">
              {linkedProject ? linkedProject.title : isNew ? "Not linked yet" : "No project"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isNew && form.status === "published" ? (
            <a
              href={`/case-studies/${form.slug}`}
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
            Save draft
          </button>
          <button
            type="button"
            onClick={() => save("publish")}
            disabled={saving}
            className={buttonStyles("primary", "sm")}
          >
            {saving ? "Saving..." : "Publish"}
          </button>
        </div>
      </div>

      {notice ? (
        <p role="status" className="mt-4 border border-line bg-ink-800/60 px-4 py-3 text-sm text-paper-dim">
          {notice}
        </p>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
        <div className="space-y-6">
          <AdminPanel
            title="Case study details"
            description="Link this case study to a project. Only sections with content appear on your website."
          >
            <div className="grid gap-5">
              <Field label="Project" htmlFor="project">
                <Select
                  id="project"
                  value={form.project_id}
                  onChange={(event) => update("project_id", event.target.value)}
                  options={[
                    { value: "", label: "Not linked" },
                    ...(projects.data ?? []).map((project) => ({
                      value: project.id,
                      label: `${project.title} (${
                        project.status === "published"
                          ? "published"
                          : project.status === "draft"
                            ? "draft"
                            : "archived"
                      })`,
                    })),
                  ]}
                />
              </Field>
              <Field label="Case study title" htmlFor="study-title" required>
                <TextInput
                  id="study-title"
                  value={form.title}
                  onChange={(event) => update("title", event.target.value)}
                  placeholder="How I built..."
                />
              </Field>
              <Field
                label="Web address"
                htmlFor="study-slug"
                hint="Leave blank to create one from the title."
              >
                <TextInput
                  id="study-slug"
                  value={form.slug}
                  onChange={(event) => update("slug", event.target.value)}
                />
              </Field>
              <Field label="Summary" htmlFor="study-summary" hint={`${form.summary.length}/400 characters`}>
                <TextArea
                  id="study-summary"
                  rows={3}
                  value={form.summary}
                  onChange={(event) => update("summary", event.target.value)}
                  placeholder="One sentence that explains the project."
                />
              </Field>
              <Field label="Cover image" className="sm:col-span-2">
                <MediaField
                  value={form.cover_image_url}
                  onChange={(value) => update("cover_image_url", value)}
                  assets={media.data?.items ?? []}
                  loading={media.loading}
                  onUploaded={() => media.reload()}
                  folder="case-studies"
                  title={form.title ? `${form.title} cover` : "Case study cover"}
                  altText={form.title ? `${form.title} cover image` : "Case study cover image"}
                  emptyLabel="No cover image uploaded."
                />
              </Field>
            </div>
          </AdminPanel>

          <AdminPanel
            title="Sections"
            description="Open a section to write it. Sections with no text are skipped on your website. You can hide a section without deleting its text."
          >
            <div className="space-y-3">
              {[...PRIMARY_KEYS, ...EXTRA_KEYS].map((key) => {
                const label = sectionLabels.get(key) ?? key;
                const value = form.sections[key] ?? "";
                const visible = !form.hidden_sections.includes(key);
                const isExtra = EXTRA_KEYS.includes(key);
                return (
                  <details
                    key={key}
                    className="group border border-line bg-ink-950/40"
                  >
                    <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <span className="flex items-center gap-3">
                        <span className="font-mono text-[0.54rem] uppercase tracking-[0.14em] text-muted">
                          {label}
                        </span>
                        {isExtra ? (
                          <span className="font-mono text-[0.48rem] uppercase tracking-[0.12em] text-faint">
                            Optional
                          </span>
                        ) : null}
                        {!visible ? (
                          <span className="font-mono text-[0.48rem] uppercase tracking-[0.12em] text-warning">
                            Hidden
                          </span>
                        ) : null}
                      </span>
                      <span className="font-mono text-[0.5rem] uppercase tracking-[0.12em] text-faint">
                        {value.trim().length} characters
                      </span>
                    </summary>
                    <div className="border-t border-line p-4">
                      <TextArea
                        aria-label={`${label} content`}
                        rows={key === "overview" || key === "implementation" ? 8 : 5}
                        value={value}
                        onChange={(event) => updateSection(key, event.target.value)}
                        placeholder={HINTS[key] ?? ""}
                      />
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <Checkbox
                          label="Show this section on my website"
                          checked={visible}
                          onChange={(next) => toggleSection(key, next)}
                        />
                        {value.trim().length === 0 ? (
                          <span className="text-[0.66rem] text-faint">Empty sections are skipped automatically.</span>
                        ) : null}
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>
          </AdminPanel>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24">
          <AdminPanel title="Publishing">
            <div className="grid gap-4">
              <Field label="Visibility" htmlFor="study-status">
                <Select
                  id="study-status"
                  value={form.status}
                  onChange={(event) => update("status", event.target.value as PublishStatus)}
                  options={[
                    { value: "draft", label: "Draft (private)" },
                    { value: "published", label: "Published (visible on your website)" },
                    { value: "archived", label: "Archived (hidden)" },
                  ]}
                />
              </Field>
              <Field label="Result type" htmlFor="result-type" hint="How the results section is labelled. Descriptive outcomes are fine.">
                <Select
                  id="result-type"
                  value={form.result_type}
                  onChange={(event) => update("result_type", event.target.value)}
                  options={[
                    { value: "", label: "Not specified" },
                    ...(reference.data.result_types ?? []).map((value) => ({
                      value,
                      label: value.replace(/^\w/, (letter) => letter.toUpperCase()),
                    })),
                  ]}
                />
              </Field>
              <Field label="Display order" htmlFor="study-sort">
                <TextInput
                  id="study-sort"
                  type="number"
                  value={form.sort_order}
                  onChange={(event) => update("sort_order", event.target.value)}
                />
              </Field>
              <Checkbox
                label="Feature this case study"
                checked={form.featured}
                onChange={(next) => update("featured", next)}
              />
              <Checkbox
                label="This case study is not finished yet"
                checked={form.is_placeholder}
                onChange={(next) => update("is_placeholder", next)}
                hint="Your website will show a note until it is final."
              />
              <button
                type="button"
                onClick={() => save("keep")}
                disabled={saving}
                className={buttonStyles("secondary", "md", "w-full")}
              >
                <Save className="size-3.5" aria-hidden="true" />
                {saving ? "Saving..." : "Save changes"}
              </button>
              <button
                type="button"
                onClick={() => save("publish")}
                disabled={saving}
                className={buttonStyles("primary", "md", "w-full")}
              >
                Publish case study
              </button>
            </div>
          </AdminPanel>

          {!isNew ? (
            <AdminPanel title="Details">
              <dl className="space-y-3 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <dt className="font-mono text-[0.52rem] uppercase tracking-[0.12em] text-muted">
                    Updated
                  </dt>
                  <dd className="text-paper-dim">
                    {study.data?.updated_at ? relativeTime(study.data.updated_at) : "—"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="font-mono text-[0.52rem] uppercase tracking-[0.12em] text-muted">
                    Visible sections
                  </dt>
                  <dd className="text-paper-dim">
                    {
                      ALL_KEYS.filter(
                        (key) =>
                          !form.hidden_sections.includes(key) &&
                          (form.sections[key] ?? "").trim().length > 0,
                      ).length
                    }
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="font-mono text-[0.52rem] uppercase tracking-[0.12em] text-muted">
                    Total content
                  </dt>
                  <dd className="text-paper-dim">
                    {ALL_KEYS.reduce((total, key) => total + (form.sections[key] ?? "").length, 0)}
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
                Delete case study
              </button>
            </AdminPanel>
          ) : null}
        </aside>
      </div>
    </>
  );
}
