import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

import { usePageContent, usePageSeo } from "@/app/ContentProvider";
import { PageIntro } from "@/components/layout/PageIntro";
import { PortfolioImage } from "@/components/media/PortfolioImage";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useApiQuery } from "@/hooks/useApiQuery";
import { articlesService } from "@/services/articles.service";
import { formatDate } from "@/utils/format";

export default function ArticlesPage() {
  const articles = useApiQuery((signal) => articlesService.list(signal), []);
  const page = usePageContent("articles");

  usePageSeo("articles", {
    title: "Articles — Phill",
    description:
      "Written notes on engineering, data, and the decisions behind the work.",
    path: "/articles",
  });

  const items = articles.data ?? [];

  return (
    <>
      <PageIntro
        eyebrow={page?.eyebrow || "Articles"}
        title={page?.title || (
          <>
            Notes on the work, <span className="display-serif text-signal">in writing.</span>
          </>
        )}
        description={
          page?.description ||
          "Long-form writing about engineering decisions, data work, and the details that do not fit on a project card."
        }
        aside={
          <div className="border-t border-line pt-4 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
            <div className="flex items-center justify-between gap-6">
              <span>Published</span>
              <span className="text-paper">
                {articles.loading ? "—" : String(items.length).padStart(2, "0")}
              </span>
            </div>
          </div>
        }
      />

      <Container className="py-12 sm:py-16">
        {articles.loading ? <LoadingState rows={3} label="Loading articles" /> : null}
        {!articles.loading && articles.error ? (
          <ErrorState message={articles.error.detail} onRetry={articles.reload} />
        ) : null}
        {!articles.loading && !articles.error && items.length === 0 ? (
          <EmptyState
            title="No articles published yet"
            description="Writing appears here once an article is published from the admin."
            action={
              <Link to="/work" className={buttonStyles("secondary", "sm")}>
                Explore the work
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
            }
          />
        ) : null}

        {!articles.loading && !articles.error && items.length > 0 ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((article) => (
              <article key={article.id} className="group flex flex-col border-t border-line pt-6">
                <Link
                  to={`/articles/${article.slug}`}
                  className="block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal"
                >
                  {article.cover_image_url ? (
                    <PortfolioImage
                      src={article.cover_image_url}
                      alt={`${article.title} cover image`}
                      aspect="landscape"
                      className="border border-line"
                      imageClassName="transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex aspect-[4/3] items-end border border-line bg-ink-800/40 p-5">
                      <span className="font-mono text-[0.54rem] uppercase tracking-[0.16em] text-faint">
                        {article.category || "Article"}
                      </span>
                    </div>
                  )}
                </Link>

                <div className="mt-5 flex flex-wrap items-center gap-2 font-mono text-[0.54rem] uppercase tracking-[0.14em] text-faint">
                  {article.category ? <span className="text-signal">{article.category}</span> : null}
                  {article.published_at ? (
                    <span>{formatDate(article.published_at)}</span>
                  ) : null}
                  {article.featured ? <Badge tone="signal">Featured</Badge> : null}
                </div>

                <h2 className="mt-3 text-xl font-medium leading-snug tracking-tight text-paper">
                  <Link to={`/articles/${article.slug}`} className="hover:text-signal-soft">
                    {article.title}
                  </Link>
                </h2>

                {article.excerpt ? (
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-paper-dim">
                    {article.excerpt}
                  </p>
                ) : null}

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Link
                    to={`/articles/${article.slug}`}
                    className="inline-flex items-center gap-1.5 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-paper hover:text-signal"
                  >
                    Read article
                    <ArrowUpRight className="size-3" aria-hidden="true" />
                  </Link>
                  {article.external_url ? (
                    <a
                      href={article.external_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1.5 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted hover:text-paper"
                    >
                      Source
                      <ArrowUpRight className="size-3" aria-hidden="true" />
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </Container>
    </>
  );
}
