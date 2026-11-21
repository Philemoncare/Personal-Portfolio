import { ArrowUpRight, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Checkbox, Field, TextArea, TextInput } from "@/components/admin/form";
import { MediaField } from "@/components/admin/MediaField";
import { buttonStyles } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { useApiQuery } from "@/hooks/useApiQuery";
import { listMedia } from "@/services/auth.service";
import { PAGE_KEYS, siteService } from "@/services/site.service";
import type { PageContentAdmin, PageContentInput } from "@/types/api";
import { cn } from "@/utils/cn";

const EMPTY: PageContentInput = {
  eyebrow: null,
  title: null,
  description: null,
  intro: null,
  hero_image: null,
  seo_title: null,
  seo_description: null,
  og_image: null,
  canonical_path: null,
  is_published: true,
  content: null,
};

function fromSaved(page: PageContentAdmin | undefined, path: string): PageContentInput {
  if (!page) return { ...EMPTY, canonical_path: path };
  return {
    eyebrow: page.eyebrow,
    title: page.title,
    description: page.description,
    intro: page.intro,
    hero_image: page.hero_image,
    seo_title: page.seo_title,
    seo_description: page.seo_description,
    og_image: page.og_image,
    canonical_path: page.canonical_path ?? path,
    is_published: page.is_published,
    content: page.content,
  };
}

export default function AdminPagesPage() {
  const pages = useApiQuery((signal) => siteService.listPagesAdmin(signal), []);
  const media = useApiQuery((signal) => listMedia({ limit: 100 }, signal), []);
  const [selectedKey, setSelectedKey] = useState("home");
  const [form, setForm] = useState<PageContentInput>(EMPTY);
  const [contentJson, setContentJson] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const savedByKey = useMemo(() => {
    const map = new Map<string, PageContentAdmin>();
    for (const page of pages.data ?? []) map.set(page.page_key, page);
    return map;
  }, [pages.data]);

  const meta = PAGE_KEYS.find((page) => page.key === selectedKey) ?? PAGE_KEYS[0];
  const saved = savedByKey.get(selectedKey);

  useEffect(() => {
    const next = fromSaved(savedByKey.get(selectedKey), meta.path);
    setForm(next);
    setContentJson(next.content ? JSON.stringify(next.content, null, 2) : "");
    setNotice(null);
  }, [selectedKey, savedByKey, meta.path]);

  const update = <K extends keyof PageContentInput>(key: K, value: PageContentInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    let parsedContent: Record<string, unknown> | null = null;
    if (contentJson.trim()) {
      try {
        const parsed = JSON.parse(contentJson) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("The extra content must be a JSON object.");
        }
        parsedContent = parsed as Record<string, unknown>;
      } catch (error) {
        setNotice({
          tone: "error",
          text: "The advanced content is not valid JSON. Check it and try again.",
        });
        return;
      }
    }
    setSaving(true);
    setNotice(null);
    try {
      await siteService.savePage(selectedKey, { ...form, content: parsedContent });
      pages.reload();
      setNotice({ tone: "ok", text: "Changes saved." });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "We couldn't save your changes. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (pages.loading && !pages.data) {
    return <LoadingState rows={4} label="Loading page content" />;
  }

  if (pages.error) {
    return (
      <ErrorState
        message="We couldn't load your pages. Please try again."
        onRetry={pages.reload}
      />
    );
  }

  return (
    <>
      <div className="flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-signal">Pages</p>
          <h1 className="mt-3 text-3xl font-medium tracking-tight text-paper sm:text-4xl">
            Pages &amp; SEO
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            Change the headings, descriptions and search information for each page. Leave a field
            empty to use the default text.
          </p>
        </div>
        <a
          href={meta.path}
          target="_blank"
          rel="noreferrer"
          className={buttonStyles("secondary", "sm")}
        >
          View page
          <ArrowUpRight className="size-3" aria-hidden="true" />
        </a>
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

      <div className="mt-6 grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <nav aria-label="Pages" className="border border-line">
          <p className="border-b border-line bg-ink-800/40 px-4 py-3 font-mono text-[0.54rem] uppercase tracking-[0.14em] text-muted">
            Public pages
          </p>
          <ul className="divide-y divide-line">
            {PAGE_KEYS.map((page) => {
              const record = savedByKey.get(page.key);
              return (
                <li key={page.key}>
                  <button
                    type="button"
                    onClick={() => setSelectedKey(page.key)}
                    aria-current={selectedKey === page.key ? "page" : undefined}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors",
                      selectedKey === page.key
                        ? "bg-ink-800/70 text-paper"
                        : "text-paper-dim hover:bg-ink-800/30 hover:text-paper",
                    )}
                  >
                    <span>{page.label}</span>
                    <span
                      className={cn(
                        "font-mono text-[0.5rem] uppercase tracking-[0.1em]",
                        !record
                          ? "text-faint"
                          : record.is_published
                            ? "text-success"
                            : "text-warning",
                      )}
                    >
                      {!record ? "Default" : record.is_published ? "Saved" : "Hidden"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <section className="border border-line bg-ink-900/50">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <h2 className="text-lg font-medium text-paper">{meta.label}</h2>
              <p className="mt-1 font-mono text-[0.54rem] uppercase tracking-[0.1em] text-faint">
                {saved
                  ? `Updated ${new Date(saved.updated_at).toLocaleString()}`
                  : "Using the default content"}
              </p>
            </div>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className={buttonStyles("primary", "sm")}
            >
              <Save className="size-3.5" aria-hidden="true" />
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>

          <div className="grid gap-6 p-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Small label" htmlFor="eyebrow" hint="Shown above the page heading.">
                <TextInput
                  id="eyebrow"
                  value={form.eyebrow ?? ""}
                  onChange={(event) => update("eyebrow", event.target.value || null)}
                />
              </Field>
              <Field label="Page address" htmlFor="canonical" hint="The web address for this page.">
                <TextInput
                  id="canonical"
                  value={form.canonical_path ?? ""}
                  onChange={(event) => update("canonical_path", event.target.value || null)}
                />
              </Field>
              <Field label="Page heading" htmlFor="title" className="sm:col-span-2">
                <TextInput
                  id="title"
                  value={form.title ?? ""}
                  onChange={(event) => update("title", event.target.value || null)}
                />
              </Field>
              <Field label="Short description" htmlFor="description" hint="Shown under the heading." className="sm:col-span-2">
                <TextArea
                  id="description"
                  rows={3}
                  value={form.description ?? ""}
                  onChange={(event) => update("description", event.target.value || null)}
                />
              </Field>
              <Field label="Supporting text" htmlFor="intro" hint="Longer text for pages that have room for it." className="sm:col-span-2">
                <TextArea
                  id="intro"
                  rows={4}
                  value={form.intro ?? ""}
                  onChange={(event) => update("intro", event.target.value || null)}
                />
              </Field>
              <Field label="Page image">
                <MediaField
                  value={form.hero_image ?? ""}
                  onChange={(value) => update("hero_image", value || null)}
                  assets={media.data?.items ?? []}
                  loading={media.loading}
                  onUploaded={() => media.reload()}
                  folder="pages"
                  title={`${meta.label} page image`}
                  altText={`${meta.label} page image`}
                  emptyLabel="No page image uploaded."
                />
              </Field>
              <div className="flex items-end pb-1">
                <Checkbox
                  label="Show this content on your website"
                  checked={form.is_published}
                  onChange={(next) => update("is_published", next)}
                  hint="If you turn this off, your website shows the default content instead."
                />
              </div>
            </div>

            <div className="border-t border-line pt-5">
              <p className="font-mono text-[0.56rem] uppercase tracking-[0.16em] text-muted">
                Search and sharing
              </p>
              <div className="mt-4 grid gap-5">
                <Field label="Search title" htmlFor="seo-title" hint="Shown in search results and browser tabs. Defaults to the page heading.">
                  <TextInput
                    id="seo-title"
                    value={form.seo_title ?? ""}
                    onChange={(event) => update("seo_title", event.target.value || null)}
                  />
                </Field>
                <Field label="Search description" htmlFor="seo-description" hint="Shown in search results. Defaults to the short description.">
                  <TextArea
                    id="seo-description"
                    rows={3}
                    value={form.seo_description ?? ""}
                    onChange={(event) => update("seo_description", event.target.value || null)}
                  />
                </Field>
                <Field label="Social share image">
                  <MediaField
                    value={form.og_image ?? ""}
                    onChange={(value) => update("og_image", value || null)}
                    assets={media.data?.items ?? []}
                    loading={media.loading}
                    onUploaded={() => media.reload()}
                    folder="social"
                    title={`${meta.label} social share image`}
                    altText={`${meta.label} social share image`}
                    emptyLabel="No social share image uploaded."
                  />
                </Field>
              </div>
            </div>

            <details className="border-t border-line pt-5">
              <summary className="cursor-pointer font-mono text-[0.56rem] uppercase tracking-[0.16em] text-muted">
                Advanced content
              </summary>
              <p className="mt-3 text-xs leading-relaxed text-muted">
                Optional JSON for page-specific blocks. Invalid JSON will not be saved. Leave it
                empty if you don't need it.
              </p>
              <TextArea
                aria-label="Advanced page content (JSON)"
                rows={8}
                value={contentJson}
                onChange={(event) => setContentJson(event.target.value)}
                className="mt-3 font-mono text-xs"
                placeholder={'{\n  "note": "value"\n}'}
              />
            </details>
          </div>
        </section>
      </div>
    </>
  );
}
