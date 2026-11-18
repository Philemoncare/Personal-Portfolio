import { ExternalLink, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";

import { Field, Select, StatusBadge, TextArea, TextInput, Checkbox } from "@/components/admin/form";
import { AdminTable } from "@/components/admin/table";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useApiQuery } from "@/hooks/useApiQuery";
import { siteService } from "@/services/site.service";
import type { LeadershipAdmin, LeadershipInput, PublishStatus } from "@/types/api";

const BLANK: LeadershipInput = {
  organization: "",
  title: "",
  slug: null,
  description: null,
  contribution: null,
  outcome: null,
  started_on: null,
  ended_on: null,
  url: null,
  sort_order: 0,
  publish_status: "draft",
  is_placeholder: false,
};

function toInput(entry: LeadershipAdmin): LeadershipInput {
  return {
    organization: entry.organization,
    title: entry.title,
    slug: entry.slug,
    description: entry.description,
    contribution: entry.contribution,
    outcome: entry.outcome,
    started_on: entry.started_on,
    ended_on: entry.ended_on,
    url: entry.url,
    sort_order: entry.sort_order,
    publish_status: entry.status as PublishStatus,
    is_placeholder: entry.is_placeholder,
  };
}

export default function AdminLeadershipPage() {
  const entries = useApiQuery((signal) => siteService.listLeadershipAdmin(signal), []);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<LeadershipInput>(BLANK);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const items = entries.data ?? [];

  const startNew = () => {
    setEditing("new");
    setForm({ ...BLANK });
    setNotice(null);
  };

  const startEdit = (entry: LeadershipAdmin) => {
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
      const payload: LeadershipInput = {
        ...form,
        organization: form.organization.trim(),
        title: form.title.trim(),
        slug: form.slug?.trim() || null,
        url: form.url?.trim() || null,
      };
      if (editing === "new") {
        await siteService.createLeadership(payload);
        setNotice({ tone: "ok", text: "Leadership entry created." });
      } else if (editing) {
        await siteService.updateLeadership(editing, payload);
        setNotice({ tone: "ok", text: "Leadership entry updated." });
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

  const remove = async (entry: LeadershipAdmin) => {
    if (!window.confirm(`Delete “${entry.title}” at ${entry.organization}?`)) return;
    setSaving(true);
    try {
      await siteService.deleteLeadership(entry.id);
      if (editing === entry.id) setEditing(null);
      entries.reload();
      setNotice({ tone: "ok", text: "Leadership entry deleted." });
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
            Leadership
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            Communities, committees, and initiatives. Published entries appear on the leadership
            page with their contribution and outcome.
          </p>
        </div>
        <button type="button" onClick={startNew} className={buttonStyles("primary", "md")}>
          <Plus className="size-4" aria-hidden="true" />
          Add entry
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
              {editing === "new" ? "New leadership entry" : "Edit leadership entry"}
            </h2>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className={buttonStyles("ghost", "sm")}
            >
              Cancel
            </button>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <Field label="Organization" htmlFor="organization" required>
              <TextInput
                id="organization"
                value={form.organization}
                onChange={(event) => setForm({ ...form, organization: event.target.value })}
                placeholder="Community or institution"
              />
            </Field>
            <Field label="Title" htmlFor="title" required>
              <TextInput
                id="title"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder="Role or position"
              />
            </Field>
            <Field label="Slug" htmlFor="slug" hint="Leave blank to generate one from the title.">
              <TextInput
                id="slug"
                value={form.slug ?? ""}
                onChange={(event) => setForm({ ...form, slug: event.target.value || null })}
              />
            </Field>
            <Field label="Reference URL" htmlFor="url" hint="Optional public link for the entry.">
              <TextInput
                id="url"
                value={form.url ?? ""}
                onChange={(event) => setForm({ ...form, url: event.target.value || null })}
                placeholder="https://"
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
            <Field label="Ended" htmlFor="ended">
              <TextInput
                id="ended"
                type="date"
                value={form.ended_on ?? ""}
                onChange={(event) => setForm({ ...form, ended_on: event.target.value || null })}
              />
            </Field>
            <Field label="Description" htmlFor="description" className="sm:col-span-2">
              <TextArea
                id="description"
                rows={4}
                value={form.description ?? ""}
                onChange={(event) => setForm({ ...form, description: event.target.value || null })}
                placeholder="Context for the work."
              />
            </Field>
            <Field label="Contribution" htmlFor="contribution" className="sm:col-span-2">
              <TextArea
                id="contribution"
                rows={4}
                value={form.contribution ?? ""}
                onChange={(event) => setForm({ ...form, contribution: event.target.value || null })}
                placeholder="What you contributed."
              />
            </Field>
            <Field label="Outcome" htmlFor="outcome" className="sm:col-span-2">
              <TextArea
                id="outcome"
                rows={3}
                value={form.outcome ?? ""}
                onChange={(event) => setForm({ ...form, outcome: event.target.value || null })}
                placeholder="What changed as a result."
              />
            </Field>
            <Field label="Sort order" htmlFor="sort">
              <TextInput
                id="sort"
                type="number"
                value={form.sort_order}
                onChange={(event) =>
                  setForm({ ...form, sort_order: Number(event.target.value) || 0 })
                }
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
            <div className="sm:col-span-2">
              <Checkbox
                label="Mark as placeholder"
                checked={form.is_placeholder}
                onChange={(next) => setForm({ ...form, is_placeholder: next })}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className={buttonStyles("primary", "sm", "mt-5")}
          >
            <Save className="size-3.5" aria-hidden="true" />
            {saving ? "Saving…" : "Save entry"}
          </button>
        </section>
      ) : null}

      <div className="mt-6">
        {entries.loading ? <LoadingState rows={3} label="Loading leadership" /> : null}
        {!entries.loading && entries.error ? (
          <ErrorState message={entries.error.detail} onRetry={entries.reload} />
        ) : null}
        {!entries.loading && !entries.error && items.length === 0 ? (
          <EmptyState
            title="No leadership entries"
            description="Add the first entry. Nothing is shown publicly until it is published."
            action={
              <button type="button" onClick={startNew} className={buttonStyles("secondary", "sm")}>
                <Plus className="size-3.5" aria-hidden="true" />
                Add entry
              </button>
            }
          />
        ) : null}
        {items.length > 0 ? (
          <AdminTable
            caption="Leadership entries"
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
                    {entry.started_on ?? "—"} → {entry.ended_on ?? "Present"}
                  </span>
                ),
              },
              {
                key: "link",
                header: "Link",
                mobileLabel: "Link",
                render: (entry) =>
                  entry.url ? (
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 text-xs text-muted hover:text-paper"
                    >
                      Open
                      <ExternalLink className="size-2.5" aria-hidden="true" />
                    </a>
                  ) : (
                    <span className="text-xs text-muted">—</span>
                  ),
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
