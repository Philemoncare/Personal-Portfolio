import { ExternalLink, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";

import { Checkbox, Field, Select, TextInput } from "@/components/admin/form";
import { AdminTable, AdminTableToolbar } from "@/components/admin/table";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useApiQuery } from "@/hooks/useApiQuery";
import { SOCIAL_PLATFORMS, siteService } from "@/services/site.service";
import type { SocialLinkAdmin, SocialLinkInput } from "@/types/api";

const BLANK: SocialLinkInput = {
  platform: "github",
  label: "GitHub",
  url: "",
  handle: "",
  sort_order: 0,
  is_visible: true,
};

function toInput(link: SocialLinkAdmin): SocialLinkInput {
  return {
    platform: link.platform,
    label: link.label,
    url: link.url,
    handle: link.handle ?? "",
    sort_order: link.sort_order,
    is_visible: link.is_visible,
  };
}

export default function AdminSocialLinksPage() {
  const links = useApiQuery((signal) => siteService.listSocialLinksAdmin(signal), []);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<SocialLinkInput>(BLANK);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const items = links.data ?? [];

  const startNew = () => {
    setEditing("new");
    setForm({ ...BLANK });
    setNotice(null);
  };

  const startEdit = (link: SocialLinkAdmin) => {
    setEditing(link.id);
    setForm(toInput(link));
    setNotice(null);
  };

  const save = async () => {
    if (!form.label.trim() || !form.url.trim()) {
      setNotice({ tone: "error", text: "A label and URL are required." });
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const payload: SocialLinkInput = {
        ...form,
        label: form.label.trim(),
        url: form.url.trim(),
        handle: form.handle?.trim() || null,
      };
      if (editing === "new") {
        await siteService.createSocialLink(payload);
        setNotice({ tone: "ok", text: "Social link added." });
      } else if (editing) {
        await siteService.updateSocialLink(editing, payload);
        setNotice({ tone: "ok", text: "Social link updated." });
      }
      setEditing(null);
      links.reload();
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "The social link could not be saved.",
      });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (link: SocialLinkAdmin) => {
    if (!window.confirm(`Delete the ${link.label} link? It disappears from the public site.`)) {
      return;
    }
    setSaving(true);
    try {
      await siteService.deleteSocialLink(link.id);
      if (editing === link.id) setEditing(null);
      links.reload();
      setNotice({ tone: "ok", text: "Social link deleted." });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "The link could not be deleted.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-signal">Identity</p>
          <h1 className="mt-3 text-3xl font-medium tracking-tight text-paper sm:text-4xl">
            Social links
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            Real channels shown in the header, footer, and contact page. Only add handles that
            exist — the public site never invents a destination.
          </p>
        </div>
        <button type="button" onClick={startNew} className={buttonStyles("primary", "md")}>
          <Plus className="size-4" aria-hidden="true" />
          Add link
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
              {editing === "new" ? "New social link" : "Edit social link"}
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
            <Field label="Platform" htmlFor="platform">
              <Select
                id="platform"
                value={form.platform}
                onChange={(event) => setForm({ ...form, platform: event.target.value })}
                options={SOCIAL_PLATFORMS.map((platform) => ({
                  value: platform,
                  label: platform.replace(/_/g, " "),
                }))}
              />
            </Field>
            <Field label="Label" htmlFor="label" required>
              <TextInput
                id="label"
                value={form.label}
                onChange={(event) => setForm({ ...form, label: event.target.value })}
                placeholder="GitHub"
              />
            </Field>
            <Field
              label="URL"
              htmlFor="url"
              required
              hint="Full http(s) URL. Email and phone use mailto:/tel: or a plain address."
              className="sm:col-span-2"
            >
              <TextInput
                id="url"
                value={form.url}
                onChange={(event) => setForm({ ...form, url: event.target.value })}
                placeholder="https://github.com/username"
              />
            </Field>
            <Field label="Handle" htmlFor="handle" hint="Optional, e.g. @username">
              <TextInput
                id="handle"
                value={form.handle ?? ""}
                onChange={(event) => setForm({ ...form, handle: event.target.value })}
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
            <div className="sm:col-span-2">
              <Checkbox
                label="Visible on the public site"
                checked={form.is_visible}
                onChange={(next) => setForm({ ...form, is_visible: next })}
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
            {saving ? "Saving…" : "Save link"}
          </button>
        </section>
      ) : null}

      <div className="mt-6">
        {links.loading ? <LoadingState rows={3} label="Loading social links" /> : null}
        {!links.loading && links.error ? (
          <ErrorState message={links.error.detail} onRetry={links.reload} />
        ) : null}
        {!links.loading && !links.error && items.length === 0 ? (
          <EmptyState
            title="No social links yet"
            description="Add a GitHub, LinkedIn, email, or WhatsApp destination. The footer and contact page fall back to profile settings until a link exists here."
            action={
              <button type="button" onClick={startNew} className={buttonStyles("secondary", "sm")}>
                <Plus className="size-3.5" aria-hidden="true" />
                Add the first link
              </button>
            }
          />
        ) : null}
        {items.length > 0 ? (
          <AdminTable
            caption="Social links"
            rows={items}
            rowKey={(link) => link.id}
            gridClassName="lg:grid-cols-[8rem_minmax(0,1fr)_8rem_6rem_9rem]"
            columns={[
              {
                key: "platform",
                header: "Platform",
                render: (link) => (
                  <span className="font-mono text-[0.56rem] uppercase tracking-[0.1em] text-paper-dim">
                    {link.platform}
                  </span>
                ),
              },
              {
                key: "link",
                header: "Link",
                mobileLabel: "Link",
                render: (link) => (
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-paper">{link.label}</p>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-1 flex items-center gap-1 truncate font-mono text-[0.52rem] text-muted hover:text-paper"
                    >
                      {link.handle || link.url}
                      <ExternalLink className="size-2.5 shrink-0" aria-hidden="true" />
                    </a>
                  </div>
                ),
              },
              {
                key: "order",
                header: "Order",
                mobileLabel: "Order",
                render: (link) => (
                  <span className="font-mono text-[0.58rem] tabular-nums text-muted">
                    {String(link.sort_order).padStart(3, "0")}
                  </span>
                ),
              },
              {
                key: "visibility",
                header: "Public",
                mobileLabel: "Public",
                render: (link) => (
                  <span
                    className={
                      link.is_visible
                        ? "font-mono text-[0.54rem] uppercase tracking-[0.1em] text-success"
                        : "font-mono text-[0.54rem] uppercase tracking-[0.1em] text-faint"
                    }
                  >
                    {link.is_visible ? "Visible" : "Hidden"}
                  </span>
                ),
              },
              {
                key: "actions",
                header: "Actions",
                mobileLabel: "Actions",
                className: "lg:text-right",
                render: (link) => (
                  <div className="flex items-center gap-1.5 lg:justify-end">
                    <button
                      type="button"
                      onClick={() => startEdit(link)}
                      className="inline-flex size-8 items-center justify-center border border-line text-muted transition-colors hover:border-paper hover:text-paper"
                      aria-label={`Edit ${link.label}`}
                    >
                      <Pencil className="size-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(link)}
                      disabled={saving}
                      className="inline-flex size-8 items-center justify-center border border-line text-muted transition-colors hover:border-signal hover:text-signal disabled:opacity-40"
                      aria-label={`Delete ${link.label}`}
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

      <AdminTableToolbar className="mt-6 border-b-0 pt-2" status={`${items.length} links`}>
        <p className="font-mono text-[0.54rem] uppercase tracking-[0.12em] text-faint">
          Public endpoint: /api/v1/social-links
        </p>
      </AdminTableToolbar>
    </>
  );
}
