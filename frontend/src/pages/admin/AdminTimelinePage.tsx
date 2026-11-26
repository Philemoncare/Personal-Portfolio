import { ExternalLink, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

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
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useApiQuery } from "@/hooks/useApiQuery";
import { adminContentService } from "@/services/adminContent.service";
import { listMedia } from "@/services/auth.service";
import type {
  PublishStatus,
  TimelineAdminEntry,
  TimelineInput,
  TimelineKind,
} from "@/types/api";
import { TIMELINE_KIND_LABELS, TIMELINE_KIND_ORDER } from "@/utils/identity";

interface TimelineFormState {
  title: string;
  slug: string;
  kind: TimelineKind;
  summary: string;
  description: string;
  organization: string;
  location: string;
  start_date: string;
  end_date: string;
  external_url: string;
  image_url: string;
  related_project_id: string;
  related_experience_id: string;
  related_leadership_id: string;
  featured: boolean;
  display_order: string;
  publish_status: PublishStatus;
  is_placeholder: boolean;
}

const BLANK: TimelineFormState = {
  title: "",
  slug: "",
  kind: "milestone",
  summary: "",
  description: "",
  organization: "",
  location: "",
  start_date: "",
  end_date: "",
  external_url: "",
  image_url: "",
  related_project_id: "",
  related_experience_id: "",
  related_leadership_id: "",
  featured: false,
  display_order: "0",
  publish_status: "draft",
  is_placeholder: false,
};

function toForm(entry: TimelineAdminEntry): TimelineFormState {
  return {
    title: entry.title,
    slug: entry.slug ?? "",
    kind: entry.kind,
    summary: entry.summary ?? "",
    description: entry.description ?? "",
    organization: entry.organization ?? "",
    location: entry.location ?? "",
    start_date: entry.start_date ?? "",
    end_date: entry.end_date ?? "",
    external_url: entry.external_url ?? "",
    image_url: entry.image_url ?? "",
    related_project_id: entry.related_project_id ?? "",
    related_experience_id: entry.related_experience_id ?? "",
    related_leadership_id: entry.related_leadership_id ?? "",
    featured: entry.featured,
    display_order: String(entry.display_order),
    publish_status: entry.publish_status,
    is_placeholder: entry.is_placeholder,
  };
}

function toInput(form: TimelineFormState): TimelineInput {
  const optional = (value: string) => (value.trim() ? value.trim() : null);
  return {
    title: form.title.trim(),
    slug: optional(form.slug),
    kind: form.kind,
    summary: optional(form.summary),
    description: optional(form.description),
    organization: optional(form.organization),
    location: optional(form.location),
    start_date: form.start_date,
    end_date: form.end_date || null,
    external_url: optional(form.external_url),
    image_url: optional(form.image_url),
    related_project_id: form.related_project_id || null,
    related_experience_id: form.related_experience_id || null,
    related_leadership_id: form.related_leadership_id || null,
    featured: form.featured,
    display_order: Number.parseInt(form.display_order, 10) || 0,
    publish_status: form.publish_status,
    is_placeholder: form.is_placeholder,
  };
}

const KIND_OPTIONS = TIMELINE_KIND_ORDER.map((value) => ({
  value,
  label: TIMELINE_KIND_LABELS[value],
}));

const PUBLISH_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

export default function AdminTimelinePage() {
  const entries = useApiQuery((signal) => adminContentService.listTimeline(signal), []);
  const reference = useApiQuery((signal) => adminContentService.getReference(signal), []);
  const media = useApiQuery((signal) => listMedia({ limit: 100 }, signal), []);
  const [editing, setEditing] = useState<TimelineAdminEntry | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<TimelineFormState>(BLANK);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const refs = reference.data;
  const projectOptions = useMemo(
    () => [
      { value: "", label: "No linked project" },
      ...(refs?.projects ?? []).map((record) => ({
        value: record.id,
        label: record.title,
      })),
    ],
    [refs],
  );
  const experienceOptions = useMemo(
    () => [
      { value: "", label: "No linked experience" },
      ...(refs?.experience ?? []).map((record) => ({
        value: record.id,
        label: `${record.title} (${record.subtitle ?? "Organisation"})`,
      })),
    ],
    [refs],
  );
  const leadershipOptions = useMemo(
    () => [
      { value: "", label: "No linked leadership entry" },
      ...(refs?.leadership ?? []).map((record) => ({
        value: record.id,
        label: `${record.title} (${record.subtitle ?? "Organisation"})`,
      })),
    ],
    [refs],
  );

  const startCreate = () => {
    setEditing(null);
    setCreating(true);
    setForm({
      ...BLANK,
      display_order: String((entries.data?.length ?? 0) * 10 + 10),
    });
    setNotice(null);
  };

  const startEdit = (entry: TimelineAdminEntry) => {
    setCreating(false);
    setEditing(entry);
    setForm(toForm(entry));
    setNotice(null);
  };

  const cancel = () => {
    setCreating(false);
    setEditing(null);
    setForm(BLANK);
  };

  const save = async () => {
    if (!form.title.trim()) {
      setNotice({ tone: "error", text: "Please add a title." });
      return;
    }
    if (!form.start_date) {
      setNotice({ tone: "error", text: "Please add a start date." });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      if (editing) {
        await adminContentService.updateTimeline(editing.id, toInput(form));
      } else {
        await adminContentService.createTimeline(toInput(form));
      }
      entries.reload();
      setNotice({
        tone: "ok",
        text: editing ? "Entry saved." : "Entry added.",
      });
      cancel();
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "We couldn't save your changes. Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (entry: TimelineAdminEntry) => {
    if (!window.confirm(`Delete “${entry.title}”? This cannot be undone.`)) return;
    setBusy(true);
    setNotice(null);
    try {
      await adminContentService.deleteTimeline(entry.id);
      entries.reload();
      if (editing?.id === entry.id) cancel();
      setNotice({ tone: "ok", text: "Entry deleted." });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "We couldn't delete this entry. Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-signal">
            Timeline
          </p>
          <h1 className="mt-3 text-3xl font-medium tracking-tight text-paper sm:text-4xl">
            Timeline
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            Key dates and milestones from your work and study. You can link an entry to a
            project, a role or a leadership entry instead of repeating the same text.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/timeline"
            target="_blank"
            rel="noreferrer"
            className={buttonStyles("secondary", "sm")}
          >
            View timeline
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </Link>
          <button type="button" onClick={startCreate} className={buttonStyles("primary", "sm")}>
            <Plus className="size-3.5" aria-hidden="true" />
            New entry
          </button>
        </div>
      </div>
      {notice ? (
        <p
          role={notice.tone === "error" ? "alert" : "status"}
          className={
            notice.tone === "error"
              ? "mt-4 border border-signal/35 bg-signal/5 px-4 py-3 text-sm text-paper-dim"
              : "mt-4 border border-line bg-ink-800/60 px-4 py-3 text-sm text-paper-dim"
          }
        >
          {notice.text}
        </p>
      ) : null}

      {creating || editing ? (
        <div className="mt-6">
          <AdminPanel
            title={editing ? "Edit entry" : "Add entry"}
            description="Drafts stay private. A start date is required."
            actions={
              <button type="button" onClick={cancel} className={buttonStyles("ghost", "sm")}>
                <X className="size-3.5" aria-hidden="true" />
                Cancel
              </button>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title" htmlFor="tl-title" required className="sm:col-span-2">
                <TextInput
                  id="tl-title"
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  placeholder="What happened"
                />
              </Field>
              <Field label="Type" htmlFor="tl-kind">
                <Select
                  id="tl-kind"
                  value={form.kind}
                  options={KIND_OPTIONS}
                  onChange={(event) =>
                    setForm({ ...form, kind: event.target.value as TimelineKind })
                  }
                />
              </Field>
              <Field label="Organisation" htmlFor="tl-organization">
                <TextInput
                  id="tl-organization"
                  value={form.organization}
                  onChange={(event) => setForm({ ...form, organization: event.target.value })}
                  placeholder="Optional"
                />
              </Field>
              <Field label="Start date" htmlFor="tl-start" required hint="The year is taken from this date.">
                <TextInput
                  id="tl-start"
                  type="date"
                  value={form.start_date}
                  onChange={(event) => setForm({ ...form, start_date: event.target.value })}
                />
              </Field>
              <Field label="End date" htmlFor="tl-end" hint="Leave empty if ongoing.">
                <TextInput
                  id="tl-end"
                  type="date"
                  value={form.end_date}
                  onChange={(event) => setForm({ ...form, end_date: event.target.value })}
                />
              </Field>
              <Field label="Location" htmlFor="tl-location">
                <TextInput
                  id="tl-location"
                  value={form.location}
                  onChange={(event) => setForm({ ...form, location: event.target.value })}
                  placeholder="Optional"
                />
              </Field>
              <Field label="Web address" htmlFor="tl-slug" hint="Optional. Created from the title if left empty.">
                <TextInput
                  id="tl-slug"
                  value={form.slug}
                  onChange={(event) => setForm({ ...form, slug: event.target.value })}
                />
              </Field>
            </div>

            <Field label="Summary" htmlFor="tl-summary" className="mt-4" hint="A short one-line summary.">
              <TextArea
                id="tl-summary"
                rows={2}
                value={form.summary}
                onChange={(event) => setForm({ ...form, summary: event.target.value })}
              />
            </Field>
            <Field label="Description" htmlFor="tl-description" className="mt-4">
              <TextArea
                id="tl-description"
                rows={4}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </Field>
            <Field label="Image" className="mt-4">
              <MediaField
                value={form.image_url}
                onChange={(value) => setForm({ ...form, image_url: value })}
                assets={media.data?.items ?? []}
                loading={media.loading}
                onUploaded={() => media.reload()}
                folder="timeline"
                title={form.title ? `${form.title} image` : "Timeline image"}
                altText={form.title ? `${form.title} illustration` : "Timeline image"}
                emptyLabel="No image uploaded."
              />
            </Field>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Link" htmlFor="tl-external" hint="Must start with http:// or https://">
                <TextInput
                  id="tl-external"
                  value={form.external_url}
                  placeholder="https://example.com"
                  onChange={(event) => setForm({ ...form, external_url: event.target.value })}
                />
              </Field>
              <Field label="Display order" htmlFor="tl-order" hint="Lower numbers appear first within a year.">
                <TextInput
                  id="tl-order"
                  type="number"
                  value={form.display_order}
                  onChange={(event) => setForm({ ...form, display_order: event.target.value })}
                />
              </Field>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Field label="Related project" htmlFor="tl-project">
                <Select
                  id="tl-project"
                  value={form.related_project_id}
                  options={projectOptions}
                  onChange={(event) =>
                    setForm({ ...form, related_project_id: event.target.value })
                  }
                />
              </Field>
              <Field label="Related experience" htmlFor="tl-experience">
                <Select
                  id="tl-experience"
                  value={form.related_experience_id}
                  options={experienceOptions}
                  onChange={(event) =>
                    setForm({ ...form, related_experience_id: event.target.value })
                  }
                />
              </Field>
              <Field label="Related leadership" htmlFor="tl-leadership">
                <Select
                  id="tl-leadership"
                  value={form.related_leadership_id}
                  options={leadershipOptions}
                  onChange={(event) =>
                    setForm({ ...form, related_leadership_id: event.target.value })
                  }
                />
              </Field>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Visibility" htmlFor="tl-publish">
                <Select
                  id="tl-publish"
                  value={form.publish_status}
                  options={PUBLISH_OPTIONS}
                  onChange={(event) =>
                    setForm({ ...form, publish_status: event.target.value as PublishStatus })
                  }
                />
              </Field>
              <div className="grid gap-3 border border-line p-4 sm:grid-cols-1">
                <Checkbox
                  checked={form.featured}
                  onChange={(checked) => setForm({ ...form, featured: checked })}
                  label="Featured"
                  hint="Featured entries can be shown in previews."
                />
                <Checkbox
                  checked={form.is_placeholder}
                  onChange={(checked) => setForm({ ...form, is_placeholder: checked })}
                  label="This entry is not finished yet"
                  hint="Only the year is shown; no month or day is invented."
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
              <button
                type="button"
                onClick={save}
                disabled={busy}
                className={buttonStyles("primary", "md")}
              >
                <Save className="size-4" aria-hidden="true" />
                {busy ? "Saving..." : "Save entry"}
              </button>
              <button type="button" onClick={cancel} className={buttonStyles("ghost", "md")}>
                Cancel
              </button>
            </div>
          </AdminPanel>
        </div>
      ) : null}

      <div className="mt-8">
        {entries.loading ? <LoadingState rows={4} label="Loading timeline" /> : null}
        {!entries.loading && entries.error ? (
          <ErrorState
            message="We couldn't load your timeline. Please try again."
            onRetry={entries.reload}
          />
        ) : null}
        {!entries.loading && !entries.error && (entries.data?.length ?? 0) === 0 ? (
          <EmptyState
            title="No timeline entries yet"
            description="Add your first entry. It starts as a private draft and is grouped by its start year."
            action={
              <button type="button" onClick={startCreate} className={buttonStyles("secondary", "sm")}>
                <Plus className="size-3.5" aria-hidden="true" />
                New entry
              </button>
            }
          />
        ) : null}

        {entries.data && entries.data.length > 0 ? (
          <div className="border border-line">
            <ul className="divide-y divide-line">
              {entries.data.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-paper">{entry.title}</p>
                      <StatusBadge status={entry.publish_status} />
                      <Badge tone="muted">{TIMELINE_KIND_LABELS[entry.kind]}</Badge>
                      {entry.featured ? <Badge tone="outline">Featured</Badge> : null}
                      {entry.is_placeholder ? <Badge tone="placeholder">Not finished</Badge> : null}
                    </div>
                    <p className="mt-1 font-mono text-[0.54rem] uppercase tracking-[0.12em] text-muted">
                      {entry.start_date ?? `Year ${entry.year}`}
                      {entry.organization ? ` / ${entry.organization}` : ""}
                      {entry.related_project_title ? ` / ${entry.related_project_title}` : ""}
                      {entry.related_leadership_title ? ` / ${entry.related_leadership_title}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(entry)}
                      className={buttonStyles("secondary", "sm")}
                    >
                      <Pencil className="size-3.5" aria-hidden="true" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(entry)}
                      disabled={busy}
                      className="inline-flex size-8 items-center justify-center border border-line text-muted transition-colors hover:border-signal hover:text-signal disabled:opacity-40"
                      aria-label={`Delete ${entry.title}`}
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
    </>
  );
}
