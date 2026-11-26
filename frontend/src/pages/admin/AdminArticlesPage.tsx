import { ArrowUpRight, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { StatusBadge } from "@/components/admin/form";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useApiQuery } from "@/hooks/useApiQuery";
import { adminContentService } from "@/services/adminContent.service";
import type { ArticleAdmin } from "@/types/api";
import { relativeTime } from "@/utils/format";

export default function AdminArticlesPage() {
  const articles = useApiQuery((signal) => adminContentService.listArticles(signal), []);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const remove = async (article: ArticleAdmin) => {
    const confirmed = window.confirm(`Delete "${article.title}"? This cannot be undone.`);
    if (!confirmed) return;
    setBusy(`${article.id}:delete`);
    setNotice(null);
    try {
      await adminContentService.deleteArticle(article.id);
      articles.reload();
      setNotice(`"${article.title}" was deleted.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "We couldn't delete this article. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-signal">Writing</p>
          <h1 className="mt-3 text-3xl font-medium tracking-tight text-paper sm:text-4xl">
            Articles
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            Articles shown on your website. Drafts stay private until you publish them.
          </p>
        </div>
        <Link to="/admin/articles/new" className={buttonStyles("primary", "md")}>
          <Plus className="size-4" aria-hidden="true" />
          Write article
        </Link>
      </div>

      {notice ? (
        <p
          role="status"
          className="mt-4 border border-line bg-ink-800/60 px-4 py-3 text-sm text-paper-dim"
        >
          {notice}
        </p>
      ) : null}

      <div className="mt-6">
        {articles.loading ? <LoadingState rows={4} label="Loading articles" /> : null}
        {!articles.loading && articles.error ? (
          <ErrorState message="We couldn't load your articles. Please try again." onRetry={articles.reload} />
        ) : null}
        {!articles.loading && !articles.error && (articles.data?.length ?? 0) === 0 ? (
          <EmptyState
            title="No articles yet"
            description="Write your first article. It stays private until you publish it."
            action={
              <Link to="/admin/articles/new" className={buttonStyles("secondary", "sm")}>
                <Plus className="size-3.5" aria-hidden="true" />
                Write article
              </Link>
            }
          />
        ) : null}

        {(articles.data?.length ?? 0) > 0 ? (
          <div className="border border-line">
            <div className="hidden grid-cols-[minmax(0,1fr)_10rem_7rem_8rem_9rem] gap-4 border-b border-line bg-ink-800/50 px-4 py-3 font-mono text-[0.54rem] uppercase tracking-[0.14em] text-muted lg:grid">
              <span>Article</span>
              <span>Category</span>
              <span>Status</span>
              <span>Updated</span>
              <span className="text-right">Actions</span>
            </div>
            <ul className="divide-y divide-line">
              {articles.data?.map((article) => (
                <li
                  key={article.id}
                  className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_10rem_7rem_8rem_9rem] lg:items-center lg:gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/admin/articles/${article.id}`}
                        className="truncate text-sm font-medium text-paper hover:text-signal-soft"
                      >
                        {article.title}
                      </Link>
                      {article.featured ? (
                        <span className="font-mono text-[0.5rem] uppercase tracking-[0.14em] text-signal">
                          Featured
                        </span>
                      ) : null}
                      {article.is_placeholder ? (
                        <span className="font-mono text-[0.5rem] uppercase tracking-[0.14em] text-warning">
                          Not finished
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate font-mono text-[0.54rem] uppercase tracking-[0.12em] text-muted">
                      /articles/{article.slug}
                    </p>
                  </div>

                  <span className="truncate text-xs text-paper-dim">
                    {article.category || "Uncategorised"}
                  </span>
                  <StatusBadge status={article.status} />
                  <span className="font-mono text-[0.54rem] uppercase tracking-[0.12em] text-muted">
                    {relativeTime(article.updated_at)}
                  </span>

                  <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
                    <Link
                      to={`/admin/articles/${article.id}`}
                      className="inline-flex size-8 items-center justify-center border border-line text-muted transition-colors hover:border-paper hover:text-paper"
                      aria-label={`Edit ${article.title}`}
                    >
                      <Pencil className="size-3.5" aria-hidden="true" />
                    </Link>
                    {article.status === "published" ? (
                      <a
                        href={`/articles/${article.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex size-8 items-center justify-center border border-line text-muted transition-colors hover:border-paper hover:text-paper"
                        aria-label={`Open ${article.title}`}
                      >
                        <Eye className="size-3.5" aria-hidden="true" />
                      </a>
                    ) : (
                      <span
                        className="inline-flex size-8 items-center justify-center border border-line/60 text-faint"
                        title="Publish the article to open its public page"
                      >
                        <Eye className="size-3.5" aria-hidden="true" />
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(article)}
                      disabled={busy !== null}
                      className="inline-flex size-8 items-center justify-center border border-line text-muted transition-colors hover:border-signal hover:text-signal disabled:opacity-40"
                      aria-label={`Delete ${article.title}`}
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

      <p className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 font-mono text-[0.54rem] uppercase tracking-[0.12em] text-faint">
        <span>{articles.data?.length ?? 0} articles</span>
        <Link to="/articles" className="inline-flex items-center gap-1.5 hover:text-paper">
          View articles page
          <ArrowUpRight className="size-3" aria-hidden="true" />
        </Link>
      </p>
    </>
  );
}
