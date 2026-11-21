import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { PageIntro } from "@/components/layout/PageIntro";
import { PortfolioImage } from "@/components/media/PortfolioImage";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { DetailSkeleton } from "@/components/ui/skeletons";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useSeo } from "@/hooks/useSeo";
import { articlesService } from "@/services/articles.service";
import { formatDate } from "@/utils/format";

function bodyParagraphs(body: string | null): string[] {
  if (!body) return [];
  return body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export default function ArticleDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const article = useApiQuery(
    (signal) =>
      slug
        ? articlesService.getBySlug(slug, signal)
        : Promise.reject(new Error("Missing article slug")),
    [slug],
  );

  const entry = article.data;

  useSeo({
    title: entry?.seo_title || (entry ? `${entry.title} — Phill` : "Article"),
    description: entry?.seo_description ?? entry?.excerpt ?? null,
    path: slug ? `/articles/${slug}` : undefined,
    type: "article",
    image: entry?.cover_image_url ?? null,
    imageAlt: entry ? `${entry.title} cover image` : null,
  });

  if (article.loading) {
    return (
      <Container className="py-16">
        <DetailSkeleton label="Loading article" />
      </Container>
    );
  }

  if (article.error) {
    return (
      <>
        <PageIntro eyebrow="Articles" title="Article" />
        <Container className="py-14">
          {article.error.status === 404 ? (
            <EmptyState
              title="Article not found"
              description="This article does not exist, or it is no longer published."
              action={
                <Link to="/articles" className={buttonStyles("secondary", "sm")}>
                  Back to articles
                </Link>
              }
            />
          ) : (
            <ErrorState
              message="This article could not be loaded. The API may be unavailable — try again in a moment."
              onRetry={article.reload}
            />
          )}
        </Container>
      </>
    );
  }

  if (!entry) return null;

  const paragraphs = bodyParagraphs(entry.body);

  return (
    <>
      <PageIntro
        eyebrow={entry.category ? `Articles / ${entry.category}` : "Articles"}
        title={entry.title}
        description={entry.excerpt}
        aside={
          <div className="border-t border-line pt-4 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
            {entry.published_at ? (
              <div className="flex items-center justify-between gap-6">
                <span>Published</span>
                <span className="text-paper">{formatDate(entry.published_at, { withDay: true })}</span>
              </div>
            ) : null}
            {entry.tags && entry.tags.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {entry.tags.map((tag) => (
                  <Badge key={tag} tone="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        }
      />

      <Container className="py-12 sm:py-16">
        <Link
          to="/articles"
          className="inline-flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted transition-colors hover:text-paper"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          All articles
        </Link>

        {entry.cover_image_url ? (
          <PortfolioImage
            src={entry.cover_image_url}
            alt={`${entry.title} cover image`}
            aspect="wide"
            priority
            className="mt-8 border border-line"
          />
        ) : null}

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-16">
          <article className="max-w-2xl space-y-6">
            {paragraphs.length > 0 ? (
              paragraphs.map((paragraph, index) => (
                <p
                  key={index}
                  className="whitespace-pre-line text-pretty text-base leading-relaxed text-paper-dim"
                >
                  {paragraph}
                </p>
              ))
            ) : (
              <p className="text-sm leading-relaxed text-muted">
                The body of this article has not been added yet.
              </p>
            )}
          </article>

          <aside className="h-fit border border-line bg-ink-800/40">
            <div className="border-b border-line px-5 py-3">
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted">
                Details
              </p>
            </div>
            <dl className="divide-y divide-line">
              {entry.category ? (
                <div className="px-5 py-4">
                  <dt className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-muted">
                    Category
                  </dt>
                  <dd className="mt-1 text-sm text-paper">{entry.category}</dd>
                </div>
              ) : null}
              {entry.published_at ? (
                <div className="px-5 py-4">
                  <dt className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-muted">
                    Published
                  </dt>
                  <dd className="mt-1 text-sm text-paper">
                    {formatDate(entry.published_at, { withDay: true })}
                  </dd>
                </div>
              ) : null}
              {entry.external_url ? (
                <div className="px-5 py-4">
                  <dt className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-muted">
                    Original source
                  </dt>
                  <dd className="mt-1">
                    <a
                      href={entry.external_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1.5 text-sm text-paper underline decoration-line underline-offset-4 hover:text-signal"
                    >
                      Visit
                      <ArrowUpRight className="size-3.5" aria-hidden="true" />
                    </a>
                  </dd>
                </div>
              ) : null}
            </dl>
          </aside>
        </div>

        <div className="mt-14 flex flex-col gap-5 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-sm leading-relaxed text-muted">
            More writing and project records are collected in the indexes.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link to="/articles" className={buttonStyles("secondary", "sm")}>
              All articles
            </Link>
            <Link to="/work" className={buttonStyles("ghost", "sm")}>
              Selected work
            </Link>
          </div>
        </div>
      </Container>
    </>
  );
}
