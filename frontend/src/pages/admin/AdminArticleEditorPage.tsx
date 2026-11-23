import { ArrowLeft, ArrowUpRight, Eye, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

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
import { useApiQuery } from "@/hooks/useApiQuery";
import { adminContentService } from "@/services/adminContent.service";
import { listMedia } from "@/services/auth.service";
import type { ArticleAdmin, ArticleInput, PublishStatus } from "@/types/api";

interface ArticleFormState {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  cover_image_url: string;
  external_url: string;
  category: string;
  tags: string;
  featured: boolean;
  seo_title: string;
  seo_description: string;
  sort_order: string;
  publish_status: PublishStatus;
  is_placeholder: boolean;
}

const BLANK: ArticleFormState = {
  title: "",
  slug: "",
  excerpt: "",
  body: "",
  cover_image_url: "",
  external_url: "",
  category: "",
  tags: "",
  featured: false,
  seo_title: "",
  seo_description: "",
  sort_order: "0",
  publish_status: "draft",
  is_placeholder: false,
};

function fromArticle(article: ArticleAdmin): ArticleFormState {
  return {
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt ?? "",
    body: article.body ?? "",
    cover_image_url: article.cover_image_url ?? "",
    external_url: article.external_url ?? "",
    category: article.category ?? "",
    tags: (article.tags ?? []).join(", "),
    featured: article.featured,
    seo_title: article.seo_title ?? "",
    seo_description: article.seo_description ?? "",
    sort_order: String(article.sort_order),
    publish_status: article.status,
    is_placeholder: article.is_placeholder,
  };
}

function optional(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toPayload(form: ArticleFormState, status?: PublishStatus): ArticleInput {
  return {
    title: form.title.trim(),
    slug: optional(form.slug),
    excerpt: optional(form.excerpt),
    body: optional(form.body),
    cover_image_url: optional(form.cover_image_url),
    external_url: optional(form.external_url),
    category: optional(form.category),
    tags: form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    featured: form.featured,
    seo_title: optional(form.seo_title),
    seo_description: optional(form.seo_description),
    sort_order: Number.parseInt(form.sort_order, 10) || 0,
    publish_status: status ?? form.publish_status,
    is_placeholder: form.is_placeholder,
  };
}

export default function AdminArticleEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const navigate = useNavigate();
  const [form, setForm] = useState<ArticleFormState | null>(isNew ? BLANK : null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const article = useApiQuery<ArticleAdmin | null>(
    (signal) => (id ? adminContentService.getArticle(id, signal) : Promise.resolve(null)),
    [id],
  );
  const media = useApiQuery((signal) => listMedia({ limit: 100 }, signal), []);

  useEffect(() => {
    if (article.data) setForm(fromArticle(article.data));
  }, [article.data]);

  const update = <K extends keyof ArticleFormState>(key: K, value: ArticleFormState[K]) => {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  };

  const save = async (status?: PublishStatus) => {
    if (!form) return;
    if (!form.title.trim()) {
      setNotice({ tone: "error", text: "Please add a title." });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const appliedStatus = status ?? form.publish_status;
      if (isNew) {
        const created = await adminContentService.createArticle(toPayload(form, appliedStatus));
        setForm(fromArticle(created));
        navigate(`/admin/articles/${created.id}`, { replace: true });
        setNotice({ tone: "ok", text: "Article added." });
      } else if (id) {
        const updated = await adminContentService.updateArticle(id, toPayload(form, appliedStatus));
        setForm(fromArticle(updated));
        setNotice({
          tone: "ok",
          text: appliedStatus === "published" ? "Article published." : "Article saved.",
        });
      }
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "We couldn't save this article. Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!id || !form) return;
    if (!window.confirm(`Delete "${form.title}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await adminContentService.deleteArticle(id);
      navigate("/admin/articles");
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "We couldn't delete this article. Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  if (article.loading && !form) {
    return <LoadingState rows={6} label="Loading article" />;
  }

  if (article.error) {
    return (
      <ErrorState
        message="We couldn't load this article. Please try again."
        onRetry={article.reload}
      />
    );
  }

  if (!form) return null;

  return (
    <>
      <div className="flex flex-col gap-4 border-b border-line pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/admin/articles"
            className="inline-flex items-center gap-1.5 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted hover:text-paper"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            All articles
          </Link>
          {!isNew && article.data ? (
            <div className="flex items-center gap-3">
              <StatusBadge status={article.data.status} />
              {article.data.status === "published" ? (
                <a
                  href={`/articles/${article.data.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-[0.54rem] uppercase tracking-[0.12em] text-muted hover:text-paper"
                >
                  <Eye className="size-3.5" aria-hidden="true" />
                  View
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-medium tracking-tight text-paper sm:text-4xl">
              {isNew ? "Write article" : form.title || "Untitled article"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              {isNew
                ? "Start as a draft. Nothing is public until you publish it."
                : "Edit the article. Search and sharing text falls back to the title and summary when empty."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!isNew ? (
              <button
                type="button"
                onClick={remove}
                disabled={busy}
                className={buttonStyles("ghost", "sm")}
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                Delete
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => save("draft")}
              disabled={busy}
              className={buttonStyles("secondary", "sm")}
            >
              <Save className="size-3.5" aria-hidden="true" />
              {busy ? "Saving..." : "Save draft"}
            </button>
            <button
              type="button"
              onClick={() => save("published")}
              disabled={busy}
              className={buttonStyles("primary", "sm")}
            >
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
              {form.publish_status === "published" ? "Update" : "Publish"}
            </button>
          </div>
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

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <AdminPanel
            title="Article"
            description="The title, web address, summary and content shown on your website."
          >
            <div className="space-y-4">
              <Field label="Article title" htmlFor="article-title" required>
                <TextInput
                  id="article-title"
                  value={form.title}
                  onChange={(event) => update("title", event.target.value)}
                />
              </Field>
              <Field
                label="Web address"
                htmlFor="article-slug"
                hint="Leave blank to create one from the title."
              >
                <TextInput
                  id="article-slug"
                  value={form.slug}
                  onChange={(event) => update("slug", event.target.value)}
                />
              </Field>
              <Field label="Short summary" htmlFor="article-excerpt" hint={`${form.excerpt.length}/400 characters`}>
                <TextArea
                  id="article-excerpt"
                  rows={3}
                  value={form.excerpt}
                  onChange={(event) => update("excerpt", event.target.value)}
                  placeholder="A short summary shown on cards and in search results."
                />
              </Field>
              <Field
                label="Article content"
                htmlFor="article-body"
                hint="Plain text or Markdown. Blank lines separate paragraphs."
              >
                <TextArea
                  id="article-body"
                  rows={16}
                  value={form.body}
                  onChange={(event) => update("body", event.target.value)}
                />
              </Field>
            </div>
          </AdminPanel>

          <AdminPanel
            title="Search and sharing"
            description="Optional text for search results and shared links. Empty fields use the title and summary."
          >
            <div className="space-y-4">
              <Field label="Search title" htmlFor="article-seo-title">
                <TextInput
                  id="article-seo-title"
                  value={form.seo_title}
                  onChange={(event) => update("seo_title", event.target.value)}
                />
              </Field>
              <Field label="Search description" htmlFor="article-seo-description">
                <TextArea
                  id="article-seo-description"
                  rows={3}
                  value={form.seo_description}
                  onChange={(event) => update("seo_description", event.target.value)}
                />
              </Field>
            </div>
          </AdminPanel>
        </div>

        <aside className="h-fit space-y-6 lg:sticky lg:top-24">
          <AdminPanel title="Cover image" description="You can also upload it in the Media Library.">
            <MediaField
              value={form.cover_image_url}
              onChange={(value) => update("cover_image_url", value)}
              assets={media.data?.items ?? []}
              loading={media.loading}
              onUploaded={() => media.reload()}
              folder="articles"
              title={form.title ? `${form.title} cover` : "Article cover"}
              altText={form.title ? `${form.title} cover image` : "Article cover image"}
              emptyLabel="No cover image uploaded."
            />
          </AdminPanel>

          <AdminPanel title="Category and tags">
            <div className="space-y-4">
              <Field label="Category" htmlFor="article-category">
                <TextInput
                  id="article-category"
                  value={form.category}
                  onChange={(event) => update("category", event.target.value)}
                  placeholder="Engineering, Data, Notes"
                />
              </Field>
              <Field label="Tags" htmlFor="article-tags" hint="Separate each tag with a comma. Up to 12.">
                <TextInput
                  id="article-tags"
                  value={form.tags}
                  onChange={(event) => update("tags", event.target.value)}
                  placeholder="fastapi, design, testing"
                />
              </Field>
              <Field label="Other link" htmlFor="article-external" hint="Optional link to where this was first published.">
                <TextInput
                  id="article-external"
                  value={form.external_url}
                  onChange={(event) => update("external_url", event.target.value)}
                  placeholder="https://example.com"
                />
              </Field>
              <Field label="Display order" htmlFor="article-order" hint="Lower numbers appear first.">
                <TextInput
                  id="article-order"
                  type="number"
                  value={form.sort_order}
                  onChange={(event) => update("sort_order", event.target.value)}
                />
              </Field>
            </div>
          </AdminPanel>

          <AdminPanel title="Publishing">
            <div className="space-y-4">
              <Field label="Visibility" htmlFor="article-status">
                <Select
                  id="article-status"
                  value={form.publish_status}
                  onChange={(event) =>
                    update("publish_status", event.target.value as PublishStatus)
                  }
                  options={[
                    { value: "draft", label: "Draft (private)" },
                    { value: "published", label: "Published (visible on your website)" },
                    { value: "archived", label: "Archived" },
                  ]}
                />
              </Field>
              <Checkbox
                label="Feature this article"
                checked={form.featured}
                onChange={(next) => update("featured", next)}
                hint="Featured articles can appear on your homepage and articles page."
              />
              <Checkbox
                label="This article is not finished yet"
                checked={form.is_placeholder}
                onChange={(next) => update("is_placeholder", next)}
              />
            </div>
          </AdminPanel>
        </aside>
      </div>
    </>
  );
}
