import { ExternalLink, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useApiQuery } from "@/hooks/useApiQuery";
import { adminContentService } from "@/services/adminContent.service";
import type {
  ContentReference,
  NowAdminItem,
  NowCategory,
  NowInput,
  NowStatus,
  PublishStatus,
} from "@/types/api";
import { NOW_CATEGORY_LABELS, NOW_STATUS_LABELS } from "@/utils/identity";

interface NowFormState {
  title: string;
  description: string;
  category: NowCategory;
  status: NowStatus;
  active: boolean;
  priority: string;
  display_order: string;
  external_url: string;
  related_project_id: string;
  related_build_lab_id: string;
  related_leadership_id: string;
  publish_status: PublishStatus;
  is_placeholder: boolean;
}

const BLANK: NowFormState = {
  title: "",
  description: "",
  category: "building",
  status: "active",
  active: true,
  priority: "0",
  display_order: "0",
  external_url: "",
  related_project_id: "",
  related_build_lab_id: "",
  related_leadership_id: "",
  publish_status: "draft",
  is_placeholder: false,
};

function toForm(item: NowAdminItem): NowFormState {
  return {
    title: item.title,
    description: item.description ?? "",
    category: item.category,
    status: item.status,
    active: item.active,
    priority: String(item.priority),
    display_order: String(item.display_order),
    external_url: item.external_url ?? "",
    related_project_id: item.related_project_id ?? "",
    related_build_lab_id: item.related_build_lab_id ?? "",
    related_leadership_id: item.related_leadership_id ?? "",
    publish_status: item.publish_status,
    is_placeholder: item.is_placeholder,
  };
}

function toInput(form: NowFormState): NowInput {
  const optional = (value: string) => (value.trim() ? value.trim() : null);
  return {
    title: form.title.trim(),
    description: optional(form.description),
    category: form.category,
    status: form.status,
    active: form.active,
    priority: Number.parseInt(form.priority, 10) || 0,
    display_order: Number.parseInt(form.display_order, 10) || 0,
    external_url: optional(form.external_url),
    related_project_id: form.related_project_id || null,
    related_build_lab_id: form.related_build_lab_id || null,
    related_leadership_id: form.related_leadership_id || null,
    publish_status: form.publish_status,
    is_placeholder: form.is_placeholder,
  };
}

const CATEGORY_OPTIONS = Object.entries(NOW_CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}));
const STATUS_OPTIONS = Object.entries(NOW_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}));
const PUBLISH_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

export default function AdminNowPage() {
  const items = useApiQuery((signal) => adminContentService.listNow(signal), []);
  const reference = useApiQuery((signal) => adminContentService.getReference(signal), []);
  const [editing, setEditing] = useState<NowAdminItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<NowFormState>(BLANK);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (items.data && !creating && !editing) setForm(BLANK);
  }, [items.data, creating, editing]);

  const refs: ContentReference | null = reference.data;
  const projectOptions = useMemo(
    () => [
      { value: "", label: "No linked project" },
      ...(refs?.projects ?? []).map((project) => ({
        value: project.id,
        label: `${project.title}${project.subtitle ? ` (${project.subtitle})` : ""}`,
      })),
    ],
    [refs],
  );
  const leadershipOptions = useMemo(
    () => [
      { value: "", label: "No linked leadership entry" },
      ...(refs?.leadership ?? []).map((entry) => ({
        value: entry.id,
        label: `${entry.title} — ${entry.subtitle ?? "Organization"}`,
      })),
    ],
    [refs],
  );

  const startCreate = () => {
    setEditing(null);
    setCreating(true);
    setForm({ ...BLANK, display_order: String((items.data?.length ?? 0) * 10 + 10) });
    setNotice(null);
  };

  const startEdit = (item: NowAdminItem) => {
    setCreating(false);
    setEditing(item);
    setForm(toForm(item));
    setNotice(null);
  };

  const cancel = () => {
    setCreating(false);
    setEditing(null);
    setForm(BLANK);
  };

  const save = async () => {
    if (!form.title.trim()) {
      setNotice({ tone: "error", text: "A title is required." });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      if (editing) {
        await adminContentService.updateNow(editing.id, toInput(form));
      } else {
        await adminContentService.createNow(toInput(form));
      }
      items.reload();
      cancel();
      setNotice({ tone: "ok", text: editing ? "Now item updated." : "Now item created." });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "The item could not be saved.",
      });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item: NowAdminItem) => {
    if (!window.confirm(`Delete “${item.title}” permanently?`)) return;
    setBusy(true);
    setNotice(null);
    try {
      await adminContentService.deleteNow(item.id);
      items.reload();
      if (editing?.id === item.id) cancel();
      setNotice({ tone: "ok", text: "Now item deleted." });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "The item could not be deleted.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-signal">Now</p>
          <h1 className="mt-3 text-3xl font-medium tracking-tight text-paper sm:text-4xl">
            Current focus
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            Category-based updates with lifecycle status, priority, ordering, and optional links
            to existing projects, Build Lab builds, and leadership records.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/now" target="_blank" rel="noreferrer" className={buttonStyles("secondary", "sm")}>
            View Now page
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </Link>
          <button type="button" onClick={startCreate} className={buttonStyles("primary", "sm")}>
            <Plus className="size-3.5" aria-hidden="true" />
            New item
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

      {(creating || editing) ? (
        <div className="mt-6">
          <AdminPanel
            title={editing ? "Edit Now item" : "New Now item"}
            description="Draft items stay private. Published items appear on /now only when active."
            actions={
              <button type="button" onClick={cancel} className={buttonStyles("ghost", "sm")}>
                <X className="size-3.5" aria-hidden="true" />
                Cancel
              </button>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title" htmlFor="now-title" required className="sm:col-span-2">
                <TextInput
                  id="now-title"
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                />
              </Field>
              <Field label="Category" htmlFor="now-category">
                <Select
                  id="now-category"
                  value={form.category}
                  options={CATEGORY_OPTIONS}
                  onChange={(event) =>
                    setForm({ ...form, category: event.target.value as NowCategory })
                  }
                />
              </Field>
              <Field label="Lifecycle status" htmlFor="now-status">
                <Select
                  id="now-status"
                  value={form.status}
                  options={STATUS_OPTIONS}
                  onChange={(event) => setForm({ ...form, status: event.target.value as NowStatus })}
                />
              </Field>
              <Field label="Publish status" htmlFor="now-publish">
                <Select
                  id="now-publish"
                  value={form.publish_status}
                  options={PUBLISH_OPTIONS}
                  onChange={(event) =>
                    setForm({ ...form, publish_status: event.target.value as PublishStatus })
                  }
                />
              </Field>
              <Field label="External URL" htmlFor="now-external">
                <TextInput
                  id="now-external"
                  value={form.external_url}
                  placeholder="https://…"
                  onChange={(event) => setForm({ ...form, external_url: event.target.value })}
                />
              </Field>
            </div>

            <Field label="Description" htmlFor="now-description" className="mt-4">
              <TextArea
                id="now-description"
                rows={4}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </Field>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Related project" htmlFor="now-project">
                <Select
                  id="now-project"
                  value={form.related_project_id}
                  options={projectOptions}
                  onChange={(event) => setForm({ ...form, related_project_id: event.target.value })}
                />
              </Field>
              <Field label="Related Build Lab build" htmlFor="now-build-lab">
                <Select
                  id="now-build-lab"
                  value={form.related_build_lab_id}
                  options={projectOptions}
                  onChange={(event) =>
                    setForm({ ...form, related_build_lab_id: event.target.value })
                  }
                />
              </Field>
            </div>
            <Field label="Related leadership entry" htmlFor="now-leadership" className="mt-4">
              <Select
                id="now-leadership"
                value={form.related_leadership_id}
                options={leadershipOptions}
                onChange={(event) =>
                  setForm({ ...form, related_leadership_id: event.target.value })
                }
              />
            </Field>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Priority" htmlFor="now-priority" hint="Higher numbers sort first within a category.">
                <TextInput
                  id="now-priority"
                  type="number"
                  value={form.priority}
                  onChange={(event) => setForm({ ...form, priority: event.target.value })}
                />
              </Field>
              <Field label="Display order" htmlFor="now-order">
                <TextInput
                  id="now-order"
                  type="number"
                  value={form.display_order}
                  onChange={(event) => setForm({ ...form, display_order: event.target.value })}
                />
              </Field>
            </div>

            <div className="mt-5 grid gap-3 border-t border-line pt-5 sm:grid-cols-2">
              <Checkbox
                checked={form.active}
                onChange={(checked) => setForm({ ...form, active: checked })}
                label="Active"
                hint="Inactive items remain stored but are hidden from the public Now page."
              />
              <Checkbox
                checked={form.is_placeholder}
                onChange={(checked) => setForm({ ...form, is_placeholder: checked })}
                label="Placeholder content"
                hint="Shows an honest placeholder label on the public page."
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
              <button
                type="button"
                onClick={save}
                disabled={busy}
                className={buttonStyles("primary", "md")}
              >
                <Save className="size-4" aria-hidden="true" />
                {busy ? "Saving…" : "Save item"}
              </button>
              <button type="button" onClick={cancel} className={buttonStyles("ghost", "md")}>
                Cancel
              </button>
            </div>
          </AdminPanel>
        </div>
      ) : null}

      <div className="mt-8">
        {items.loading ? <LoadingState rows={4} label="Loading Now items" /> : null}
        {!items.loading && items.error ? (
          <ErrorState message="Now items could not be loaded." onRetry={items.reload} />
        ) : null}
        {!items.loading && !items.error && (items.data?.length ?? 0) === 0 ? (
          <EmptyState
            title="No Now items yet"
            description="Create the first update. It starts as a private draft."
            action={
              <button type="button" onClick={startCreate} className={buttonStyles("secondary", "sm")}>
                <Plus className="size-3.5" aria-hidden="true" />
                New item
              </button>
            }
          />
        ) : null}

        {items.data && items.data.length > 0 ? (
          <div className="border border-line">
            <ul className="divide-y divide-line">
              {items.data.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-paper">{item.title}</p>
                      <StatusBadge status={item.publish_status} />
                      {item.is_placeholder ? <Badge tone="placeholder">Placeholder</Badge> : null}
                      {!item.active ? <Badge tone="muted">Inactive</Badge> : null}
                    </div>
                    <p className="mt-1 font-mono text-[0.54rem] uppercase tracking-[0.12em] text-muted">
                      {NOW_CATEGORY_LABELS[item.category]} / {NOW_STATUS_LABELS[item.status]} / order{" "}
                      {item.display_order} / priority {item.priority}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className={buttonStyles("secondary", "sm")}
                    >
                      <Pencil className="size-3.5" aria-hidden="true" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(item)}
                      disabled={busy}
                      className="inline-flex size-8 items-center justify-center border border-line text-muted transition-colors hover:border-signal hover:text-signal disabled:opacity-40"
                      aria-label={`Delete ${item.title}`}
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
