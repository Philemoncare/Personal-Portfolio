import {
  ArrowLeft,
  ArrowUpRight,
  Eye,
  Image as ImageIcon,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
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
import { buttonStyles } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { useApiResource } from "@/hooks/useApiResource";
import { adminProjectsService } from "@/services/adminProjects.service";
import type {
  AdminProject,
  AdminReference,
  MediaType,
  ProjectInput,
  PublishStatus,
} from "@/types/api";
import { PROJECT_STAGE_LABELS, PROJECT_STAGE_ORDER } from "@/utils/projects";

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

export default function AdminProjectEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const navigate = useNavigate();
  const location = useLocation();
  const [notice, setNotice] = useState<string | null>(
    (location.state as { notice?: string } | null)?.notice ?? null,
  );
  const [form, setForm] = useState<ProjectFormState | null>(null);
  const [saving, setSaving] = useState(false);

  const reference = useApiResource<AdminReference>("/api/v1/admin/reference");
  const project = useApiResource<AdminProject>(
    id ? `/api/v1/admin/projects/${id}` : null,
  );

  useEffect(() => {
    if (!isNew) {
      if (project.data) setForm(fromProject(project.data));
      return;
    }
    if (reference.data) {
      setForm(blankForm(reference.data.categories[0]?.id ?? ""));
    }
  }, [isNew, project.data, reference.data]);

  const update = <K extends keyof ProjectFormState>(key: K, value: ProjectFormState[K]) => {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  };

  const save = async (mode: "keep" | "draft" | "publish") => {
    if (!form) return;
    if (!form.title.trim()) {
      setNotice("A project title is required.");
      return;
    }
    if (!form.category_id) {
      setNotice("Choose a primary category before saving.");
      return;
    }
    const status: PublishStatus =
      mode === "keep" ? form.status : mode === "publish" ? "published" : "draft";
    const payload = toPayload(form, status);
    setSaving(true);
    setNotice(null);
    try {
      if (isNew) {
        const created = await adminProjectsService.createProject(payload);
        navigate(`/admin/projects/${created.id}`, {
          replace: true,
          state: { notice: "Project created as a draft." },
        });
      } else if (id) {
        const updated = await adminProjectsService.updateProject(id, payload);
        setForm(fromProject(updated));
        setNotice(
          status === "published"
            ? "Project saved and published."
            : status === "draft"
              ? "Project saved as a draft."
              : "Project saved.",
        );
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The project could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!id || !form) return;
    const confirmed = window.confirm(
      `Delete ${form.title || "this project"} permanently? Media rows and the project's case study are affected and this cannot be undone.`,
    );
    if (!confirmed) return;
    setSaving(true);
    try {
      await adminProjectsService.deleteProject(id);
      navigate("/admin/projects", { replace: true });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The project could not be deleted.");
      setSaving(false);
    }
  };

  if (!isNew && project.error) {
    return (
      <div className="mt-6">
        {project.error.status === 404 ? (
          <ErrorState message="This project no longer exists." />
        ) : (
          <ErrorState message={project.error.detail} onRetry={project.reload} />
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
        <ErrorState message={reference.error.detail} onRetry={reference.reload} />
      </div>
    );
  }

  if ((!isNew && project.loading) || !reference.data || !form) {
    return (
      <div className="mt-6">
        <LoadingState rows={6} label="Loading project editor" />
      </div>
    );
  }

  const categories = reference.data.categories;
  const technologies = reference.data.technologies;
  const technologyGroups = Array.from(
    new Set(technologies.map((item) => item.kind)),
  ).sort();

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
            {isNew ? "New project" : form.title || "Untitled project"}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <StatusBadge status={form.status} />
            {!isNew ? (
              <span className="font-mono text-[0.54rem] uppercase tracking-[0.12em] text-muted">
                /{form.slug}
              </span>
            ) : (
              <span className="font-mono text-[0.54rem] uppercase tracking-[0.12em] text-muted">
                Draft will be created
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
              Public page
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
            {saving ? "Saving…" : "Publish"}
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
            title="Identity"
            description="The name, URL, and copy that introduce the project. The summary is used in cards and search; the body is the overview on the project page."
          >
            <div className="grid gap-5">
              <Field label="Title" htmlFor="title" required>
                <TextInput
                  id="title"
                  value={form.title}
                  onChange={(event) => update("title", event.target.value)}
                  placeholder="SchooMA"
                />
              </Field>
              <Field
                label="Slug"
                htmlFor="slug"
                hint="Leave blank to generate one from the title. The public URL is /work/{slug}."
              >
                <TextInput
                  id="slug"
                  value={form.slug}
                  onChange={(event) => update("slug", event.target.value)}
                  placeholder="schooma"
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
              <Field label="Overview body" htmlFor="body" hint={`${form.body.length} characters. Separate paragraphs with a blank line.`}>
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
            title="Classification"
            description="One primary discipline, optional secondary categories, and the technologies shown on cards, filters, and the stack panel."
          >
            <div className="grid gap-5">
              <Field label="Primary category" htmlFor="category" required>
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
                  options={categories.map((item) => ({
                    value: item.id,
                    label: item.name,
                  }))}
                />
              </Field>

              <Field
                label="Secondary categories"
                hint="Optional. Used for filtering and related-project matching; not every project needs them."
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  {categories
                    .filter((item) => item.id !== form.category_id)
                    .map((item) => {
                      const checked = form.secondary_category_ids.includes(item.id);
                      return (
                        <Checkbox
                          key={item.id}
                          label={item.name}
                          checked={checked}
                          onChange={(next) =>
                            update(
                              "secondary_category_ids",
                              next
                                ? [...form.secondary_category_ids, item.id]
                                : form.secondary_category_ids.filter((entry) => entry !== item.id),
                            )
                          }
                        />
                      );
                    })}
                </div>
              </Field>

              <Field
                label="Technologies"
                hint="Select every tool used. New tools can be added in the field below, comma-separated."
              >
                <div className="space-y-4 border border-line bg-ink-950/50 p-4">
                  {technologyGroups.map((kind) => (
                    <div key={kind}>
                      <p className="font-mono text-[0.52rem] uppercase tracking-[0.14em] text-faint">
                        {kind}
                      </p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {technologies
                          .filter((item) => item.kind === kind)
                          .map((item) => {
                            const checked = form.technology_ids.includes(item.id);
                            return (
                              <Checkbox
                                key={item.id}
                                label={item.name}
                                checked={checked}
                                onChange={(next) =>
                                  update(
                                    "technology_ids",
                                    next
                                      ? [...form.technology_ids, item.id]
                                      : form.technology_ids.filter((entry) => entry !== item.id),
                                  )
                                }
                              />
                            );
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              </Field>

              <Field label="Add technologies" htmlFor="extra-technologies" hint="Comma-separated names, for example: Docker, Redis">
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
            title="Project details"
            description="Metadata shown in the project header and used for ordering and related work."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Role" htmlFor="role" hint="For example: Full-stack developer">
                <TextInput
                  id="role"
                  value={form.role}
                  onChange={(event) => update("role", event.target.value)}
                />
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
              <Field label="Started" htmlFor="started">
                <TextInput
                  id="started"
                  type="date"
                  value={form.started_on}
                  onChange={(event) => update("started_on", event.target.value)}
                />
              </Field>
              <Field label="Completed" htmlFor="completed">
                <TextInput
                  id="completed"
                  type="date"
                  value={form.completed_on}
                  onChange={(event) => update("completed_on", event.target.value)}
                />
              </Field>
              <Field label="Mode" htmlFor="mode">
                <Select
                  id="mode"
                  value={form.primary_mode}
                  onChange={(event) => update("primary_mode", event.target.value)}
                  options={reference.data.modes.map((item) => ({
                    value: item.value,
                    label: item.label,
                  }))}
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
              <Field label="Sort order" htmlFor="sort" hint="Lower numbers appear first in the public index.">
                <TextInput
                  id="sort"
                  type="number"
                  value={form.sort_order}
                  onChange={(event) => update("sort_order", event.target.value)}
                />
              </Field>
              <div className="flex flex-col justify-end gap-3 pb-1">
                <Checkbox
                  label="Featured on the homepage"
                  checked={form.featured}
                  onChange={(next) => update("featured", next)}
                />
                <Checkbox
                  label="Mark as placeholder"
                  checked={form.is_placeholder}
                  onChange={(next) => update("is_placeholder", next)}
                  hint="Shows a visible pending-content note instead of pretending the record is complete."
                />
              </div>
            </div>
          </AdminPanel>

          <AdminPanel
            title="Links"
            description="Only links with a value are rendered publicly. External links open in a new tab."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Live demo" htmlFor="live">
                <TextInput
                  id="live"
                  type="url"
                  value={form.live_url}
                  onChange={(event) => update("live_url", event.target.value)}
                  placeholder="https://…"
                />
              </Field>
              <Field label="GitHub repository" htmlFor="repo">
                <TextInput
                  id="repo"
                  type="url"
                  value={form.repository_url}
                  onChange={(event) => update("repository_url", event.target.value)}
                  placeholder="https://github.com/…"
                />
              </Field>
              <Field label="Documentation" htmlFor="docs">
                <TextInput
                  id="docs"
                  type="url"
                  value={form.documentation_url}
                  onChange={(event) => update("documentation_url", event.target.value)}
                  placeholder="https://…"
                />
              </Field>
              <Field label="Download" htmlFor="download">
                <TextInput
                  id="download"
                  type="url"
                  value={form.download_url}
                  onChange={(event) => update("download_url", event.target.value)}
                  placeholder="https://…"
                />
              </Field>
              <Field label="External resource" htmlFor="external">
                <TextInput
                  id="external"
                  type="url"
                  value={form.external_url}
                  onChange={(event) => update("external_url", event.target.value)}
                  placeholder="https://…"
                />
              </Field>
            </div>
          </AdminPanel>

          <AdminPanel
            title="Cover and media"
            description="The cover appears on cards and at the top of the project page. Gallery images are lazy-loaded; diagrams appear in the architecture block."
            actions={
              <button
                type="button"
                onClick={() => update("media", [...form.media, { ...emptyMedia }])}
                className={buttonStyles("secondary", "sm")}
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Add media
              </button>
            }
          >
            <div className="grid gap-5">
              <Field
                label="Cover image URL"
                htmlFor="cover"
                hint="Use an optimized image. If left blank, the first gallery image becomes the cover."
              >
                <TextInput
                  id="cover"
                  value={form.cover_image}
                  onChange={(event) => update("cover_image", event.target.value)}
                  placeholder="/media/projects/schooma-cover.webp"
                />
              </Field>

              {form.media.length === 0 ? (
                <div className="flex items-center gap-3 border border-dashed border-line-strong px-4 py-5 text-sm text-muted">
                  <ImageIcon className="size-4" aria-hidden="true" />
                  No gallery media yet. Add a screenshot, diagram, or video when one exists.
                </div>
              ) : (
                <div className="space-y-4">
                  {form.media.map((media, index) => (
                    <div key={index} className="border border-line bg-ink-950/40 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-[0.54rem] uppercase tracking-[0.14em] text-muted">
                          Media {String(index + 1).padStart(2, "0")}
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
                          aria-label={`Remove media ${index + 1}`}
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                        </button>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <Field label="URL" htmlFor={`media-url-${index}`}>
                          <TextInput
                            id={`media-url-${index}`}
                            value={media.url}
                            onChange={(event) =>
                              update(
                                "media",
                                form.media.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, url: event.target.value } : item,
                                ),
                              )
                            }
                            placeholder="/media/projects/schooma-dashboard.webp"
                          />
                        </Field>
                        <Field label="Alt text" htmlFor={`media-alt-${index}`} hint="Describe what the image shows.">
                          <TextInput
                            id={`media-alt-${index}`}
                            value={media.alt_text}
                            onChange={(event) =>
                              update(
                                "media",
                                form.media.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, alt_text: event.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                        </Field>
                        <Field label="Caption" htmlFor={`media-caption-${index}`}>
                          <TextInput
                            id={`media-caption-${index}`}
                            value={media.caption}
                            onChange={(event) =>
                              update(
                                "media",
                                form.media.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, caption: event.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                        </Field>
                        <Field label="Type" htmlFor={`media-type-${index}`}>
                          <Select
                            id={`media-type-${index}`}
                            value={media.media_type}
                            onChange={(event) =>
                              update(
                                "media",
                                form.media.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, media_type: event.target.value as MediaType }
                                    : item,
                                ),
                              )
                            }
                            options={[
                              { value: "image", label: "Image / screenshot" },
                              { value: "diagram", label: "Architecture diagram" },
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
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24">
          <AdminPanel title="Publishing">
            <div className="grid gap-4">
              <Field label="Status" htmlFor="status">
                <Select
                  id="status"
                  value={form.status}
                  onChange={(event) => update("status", event.target.value as PublishStatus)}
                  options={[
                    { value: "draft", label: "Draft — private" },
                    { value: "published", label: "Published — public" },
                    { value: "archived", label: "Archived — hidden" },
                  ]}
                />
              </Field>
              <button
                type="button"
                onClick={() => save("keep")}
                disabled={saving}
                className={buttonStyles("secondary", "md", "w-full")}
              >
                <Save className="size-3.5" aria-hidden="true" />
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button
                type="button"
                onClick={() => save("publish")}
                disabled={saving}
                className={buttonStyles("primary", "md", "w-full")}
              >
                Publish project
              </button>
              <p className="text-[0.68rem] leading-relaxed text-faint">
                Draft projects are never served by the public API. Archived projects are hidden
                from listings unless the API is explicitly asked for them.
              </p>
            </div>
          </AdminPanel>

          {!isNew ? (
            <AdminPanel title="Record">
              <dl className="space-y-3 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <dt className="font-mono text-[0.52rem] uppercase tracking-[0.12em] text-muted">
                    Published
                  </dt>
                  <dd className="text-paper-dim">
                    {project.data?.published_at
                      ? new Date(project.data.published_at).toLocaleDateString()
                      : "Not published"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="font-mono text-[0.52rem] uppercase tracking-[0.12em] text-muted">
                    Updated
                  </dt>
                  <dd className="text-paper-dim">
                    {project.data?.updated_at
                      ? new Date(project.data.updated_at).toLocaleString()
                      : "—"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="font-mono text-[0.52rem] uppercase tracking-[0.12em] text-muted">
                    Media
                  </dt>
                  <dd className="text-paper-dim">{form.media.length}</dd>
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
