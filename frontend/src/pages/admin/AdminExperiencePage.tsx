import { Pencil, Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";

import { Checkbox, Field, Select, StatusBadge, TextArea, TextInput } from "@/components/admin/form";
import { AdminTable } from "@/components/admin/table";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useApiQuery } from "@/hooks/useApiQuery";
import { siteService } from "@/services/site.service";
import type { ExperienceAdmin, ExperienceInput, PublishStatus } from "@/types/api";

const BLANK: ExperienceInput = {
  organization: "",
  title: "",
  slug: null,
  location: null,
  description: null,
  started_on: null,
  ended_on: null,
  is_current: false,
  sort_order: 0,
  publish_status: "draft",
  is_placeholder: false,
};

function toInput(entry: ExperienceAdmin): ExperienceInput {
  return {
    organization: entry.organization,
    title: entry.title,
    slug: entry.slug,
    location: entry.location,
    description: entry.description,
    started_on: entry.started_on,
    ended_on: entry.ended_on,
    is_current: entry.is_current,
    sort_order: entry.sort_order,
    publish_status: entry.status as PublishStatus,
    is_placeholder: entry.is_placeholder,
  };
}

export default function AdminExperiencePage() {
  const entries = useApiQuery((signal) => siteService.listExperienceAdmin(signal), []);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<ExperienceInput>(BLANK);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const items = entries.data ?? [];

  const startNew = () => {
    setEditing("new");
    setForm({ ...BLANK });
    setNotice(null);
  };

  const startEdit = (entry: ExperienceAdmin) => {
    setEditing(entry.id);
    setForm(toInput(entry));
    setNotice(null);
  };

  const save = async () => {
    if (!form.organization.trim() || !form.title.trim()) {
      setNotice({ tone: "error", text: "Organization and title are required." });
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const payload: ExperienceInput = {
        ...form,
        organization: form.organization.trim(),
        title: form.title.trim(),
        slug: form.slug?.trim() || null,
        ended_on: form.is_current ? null : form.ended_on,
      };
      if (editing === "new") {
        await siteService.createExperience(payload);
        setNotice({ tone: "ok", text: "Experience entry created." });
      } else if (editing) {
        await siteService.updateExperience(editing, payload);
        setNotice({ tone: "ok", text: "Experience entry updated." });
      }
      setEditing(null);
      entries.reload();
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "The entry could not be saved.",
      });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (entry: ExperienceAdmin) => {
    if (!window.confirm(`Delete “${entry.title}” at ${entry.organization}?`)) return;
    setSaving(true);
    try {
      await siteService.deleteExperience(entry.id);
      if (editing === entry.id) setEditing(null);
      entries.reload();
      setNotice({ tone: "ok", text: "Experience entry deleted." });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "The entry could not be deleted.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-signal">Profile</p>
          <h1 className="mt-3 text-3xl font-medium tracking-tight text-paper sm:text-4xl">
            Experience
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            Roles, organizations, and what the work involved. Published entries appear on the
            experience page and can be linked from the timeline.
          </p>
        </div>
        <button type="button" onClick={startNew} className={buttonStyles("primary", "md")}>
          <Plus className="size-4" aria-hidden="true" />
          Add experience
        </button>
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

      {editing ? (
        <section className="mt-6 border border-line-strong bg-ink-900/40 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <h2 className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-muted">
              {editing === "new" ? "New experience entry" : "Edit experience entry"}
            </h2>
            <button type="button" onClick={() => setEditing(null)} className={buttonStyles("ghost", "sm")}>
              Cancel
            </button>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <Field label="Organization" htmlFor="organization" required>
              <TextInput
                id="organization"
                value={form.organization}
                onChange={(event) => setForm({ ...form, organization: event.target.value })}
                placeholder="Company or institution"
              />
            </Field>
            <Field label="Title" htmlFor="title" required>
              <TextInput
                id="title"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder="Role"
              />
            </Field>
            <Field label="Slug" htmlFor="slug" hint="Leave blank to generate one from the title.">
              <TextInput
                id="slug"
                value={form.slug ?? ""}
                onChange={(event) => setForm({ ...form, slug: event.target.value || null })}
              />
            </Field>
            <Field label="Location" htmlFor="location">
              <TextInput
                id="location"
                value={form.location ?? ""}
                onChange={(event) => setForm({ ...form, location: event.target.value || null })}
              />
            </Field>
            <Field label="Started" htmlFor="started">
              <TextInput
                id="started"
                type="date"
                value={form.started_on ?? ""}
                onChange={(event) => setForm({ ...form, started_on: event.target.value || null })}
              />
            </Field>
            <Field label="Ended" htmlFor="ended" hint="Disabled while this is a current role.">
              <TextInput
                id="ended"
                type="date"
                value={form.ended_on ?? ""}
                disabled={form.is_current}
                onChange={(event) => setForm({ ...form, ended_on: event.target.value || null })}
              />
            </Field>
            <Field label="Description" htmlFor="description" className="sm:col-span-2">
              <TextArea
                id="description"
                rows={5}
                value={form.description ?? ""}
                onChange={(event) => setForm({ ...form, description: event.target.value || null })}
                placeholder="What the role covered and what was delivered."
              />
            </Field>
            <Field label="Sort order" htmlFor="sort">
              <TextInput
                id="sort"
                type="number"
                value={form.sort_order}
                onChange={(event) => setForm({ ...form, sort_order: Number(event.target.value) || 0 })}
              />
            </Field>
            <Field label="Publish status" htmlFor="status">
              <Select
                id="status"
                value={form.publish_status}
                onChange={(event) =>
                  setForm({ ...form, publish_status: event.target.value as PublishStatus })
                }
                options={[
                  { value: "draft", label: "Draft — private" },
                  { value: "published", label: "Published — public" },
                  { value: "archived", label: "Archived" },
                ]}
              />
            </Field>
            <div className="flex flex-col gap-3 sm:col-span-2">
              <Checkbox
                label="Current role"
                checked={form.is_current}
                onChange={(next) =>
                  setForm({ ...form, is_current: next, ended_on: next ? null : form.ended_on })
                }
              />
              <Checkbox
                label="Mark as placeholder"
                checked={form.is_placeholder}
                onChange={(next) => setForm({ ...form, is_placeholder: next })}
              />
            </div>
          </div>
          <button type="button" onClick={save} disabled={saving} className={buttonStyles("primary", "sm", "mt-5")}>
            <Save className="size-3.5" aria-hidden="true" />
            {saving ? "Saving…" : "Save entry"}
          </button>
        </section>
      ) : null}

      <div className="mt-6">
        {entries.loading ? <LoadingState rows={3} label="Loading experience" /> : null}
        {!entries.loading && entries.error ? (
          <ErrorState message={entries.error.detail} onRetry={entries.reload} />
        ) : null}
        {!entries.loading && !entries.error && items.length === 0 ? (
          <EmptyState
            title="No experience entries"
            description="Add the first role. Nothing is shown publicly until it is published."
            action={
              <button type="button" onClick={startNew} className={buttonStyles("secondary", "sm")}>
                <Plus className="size-3.5" aria-hidden="true" />
                Add experience
              </button>
            }
          />
        ) : null}
        {items.length > 0 ? (
          <AdminTable
            caption="Experience entries"
            rows={items}
            rowKey={(entry) => entry.id}
            gridClassName="lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_8rem_7rem_7rem]"
            columns={[
              {
                key: "role",
                header: "Role",
                render: (entry) => (
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-paper">{entry.title}</p>
                    <p className="mt-1 truncate font-mono text-[0.52rem] uppercase tracking-[0.1em] text-muted">
                      {entry.organization}
                    </p>
                  </div>
                ),
              },
              {
                key: "dates",
                header: "Dates",
                mobileLabel: "Dates",
                render: (entry) => (
                  <span className="text-xs text-paper-dim">
                    {entry.started_on ?? "—"} → {entry.is_current ? "Present" : entry.ended_on ?? "—"}
                  </span>
                ),
              },
              {
                key: "location",
                header: "Location",
                mobileLabel: "Location",
                render: (entry) => <span className="text-xs text-muted">{entry.location ?? "—"}</span>,
              },
              {
                key: "status",
                header: "Status",
                mobileLabel: "Status",
                render: (entry) => <StatusBadge status={entry.status} />,
              },
              {
                key: "actions",
                header: "Actions",
                mobileLabel: "Actions",
                className: "lg:text-right",
                render: (entry) => (
                  <div className="flex items-center gap-1.5 lg:justify-end">
                    <button
                      type="button"
                      onClick={() => startEdit(entry)}
                      className="inline-flex size-8 items-center justify-center border border-line text-muted hover:border-paper hover:text-paper"
                      aria-label={`Edit ${entry.title}`}
                    >
                      <Pencil className="size-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(entry)}
                      disabled={saving}
                      className="inline-flex size-8 items-center justify-center border border-line text-muted hover:border-signal hover:text-signal disabled:opacity-40"
                      aria-label={`Delete ${entry.title}`}
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ),
              },
            ]}
          />
        ) : null}
      </div>
    </>
  );
}
