import { ArrowLeft, Eye } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";

import { CodeBlock } from "@/components/data/code-block";
import { DataTable } from "@/components/data/data-table";
import { DatasetPanel, InsightCard, Paragraphs, ResourceList } from "@/components/data/analysis-blocks";
import { LazyDataChart } from "@/components/data/lazy-chart";
import { PageIntro } from "@/components/layout/PageIntro";
import { PortfolioImage } from "@/components/media/PortfolioImage";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useApiResource } from "@/hooks/useApiResource";
import { useSeo } from "@/hooks/useSeo";
import type { AdminDataProject } from "@/types/api";
import { DATA_PROJECT_TYPE_LABELS } from "@/utils/data";

function hasText(value: string | null | undefined): boolean {
  return Boolean(value && value.trim());
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line pt-7">
      <h2 className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted">
        {title}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export default function AdminDataPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const project = useApiResource<AdminDataProject>(
    id ? `/api/v1/admin/data-projects/${encodeURIComponent(id)}` : null,
  );
  const data = project.data;

  useSeo({
    title: data ? `Preview: ${data.title} | Data Lab` : "Data project preview",
    description: null,
    noIndex: true,
  });

  const backTo = id ? `/admin/data/${id}` : "/admin/data";

  if (project.loading) {
    return (
      <>
        <PageIntro eyebrow="Data Lab / Preview" title="Loading preview…" />
        <Container className="py-10">
          <LoadingState rows={5} label="Loading data project preview" />
        </Container>
      </>
    );
  }

  if (project.error) {
    return (
      <>
        <PageIntro eyebrow="Data Lab / Preview" title="Preview unavailable" />
        <Container className="py-10">
          {project.error.status === 404 ? (
            <EmptyState
              title="Data project not found"
              description="This analysis record no longer exists."
              action={
                <Link to="/admin/data" className={buttonStyles("secondary", "sm")}>
                  Back to data projects
                </Link>
              }
            />
          ) : (
            <ErrorState
              message="The preview could not be loaded. The API may be unavailable — try again in a moment."
              onRetry={project.reload}
            />
          )}
        </Container>
      </>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-ink-950">
      <div className="sticky top-0 z-50 border-b border-signal/40 bg-ink-900">
        <Container className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 border border-signal/40 bg-signal/10 px-2 py-1 font-mono text-[0.56rem] uppercase tracking-[0.14em] text-signal">
              <Eye className="size-3" aria-hidden="true" />
              Preview
            </span>
            <span className="font-mono text-[0.56rem] uppercase tracking-[0.12em] text-muted">
              Not public
            </span>
          </div>
          <Link to={backTo} className={buttonStyles("secondary", "sm")}>
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Back to editor
          </Link>
        </Container>
      </div>

      <PageIntro
        eyebrow={`Data Lab / ${data.category.name}`}
        title={data.title}
        description={data.short_description ?? undefined}
        aside={
          <div className="space-y-4 border-t border-line pt-4">
            <div className="flex flex-wrap gap-2">
              <Badge tone="outline">{DATA_PROJECT_TYPE_LABELS[data.project_type]}</Badge>
              <Badge tone="muted">{data.status}</Badge>
              {data.is_demo ? <Badge tone="placeholder">Demo data</Badge> : null}
              {data.featured ? <Badge tone="signal">Featured</Badge> : null}
            </div>
            <dl className="space-y-2.5 font-mono text-[0.56rem] uppercase tracking-[0.14em] text-muted">
              <div className="flex items-center justify-between gap-6">
                <dt>Slug</dt>
                <dd className="text-paper">/{data.slug}</dd>
              </div>
              <div className="flex items-center justify-between gap-6">
                <dt>Charts</dt>
                <dd className="text-paper">{data.visualizations.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-6">
                <dt>Insights</dt>
                <dd className="text-paper">{data.insights.length}</dd>
              </div>
            </dl>
          </div>
        }
      />

      <Container className="py-10 sm:py-14">
        {data.is_demo ? (
          <div className="mb-8 border border-signal/35 bg-signal/5 p-5">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-signal">
              Demo data
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-paper-dim">
              This preview contains synthetic data. It must remain labelled as demo content
              if it is published.
            </p>
          </div>
        ) : null}

        {data.cover_image_url ? (
          <figure className="mb-10 overflow-hidden border border-line">
            <PortfolioImage
              src={data.cover_image_url}
              alt={`${data.title} analysis cover`}
              aspect="auto"
              sizes="(max-width: 1024px) 100vw, 70vw"
            />
          </figure>
        ) : null}

        <div className="space-y-8">
          {hasText(data.description) || hasText(data.conclusion) ? (
            <Block title="Overview">
              {hasText(data.description) ? <Paragraphs text={data.description ?? ""} /> : null}
              {hasText(data.conclusion) ? <Paragraphs text={data.conclusion ?? ""} /> : null}
            </Block>
          ) : null}

          {hasText(data.question) || hasText(data.why_it_matters) ? (
            <Block title="The question">
              {hasText(data.question) ? <Paragraphs text={data.question ?? ""} /> : null}
              {hasText(data.why_it_matters) ? (
                <Paragraphs text={data.why_it_matters ?? ""} />
              ) : null}
            </Block>
          ) : null}

          <DatasetPanel project={data} />

          {hasText(data.data_preparation) ? (
            <Block title="Data preparation">
              <Paragraphs text={data.data_preparation ?? ""} />
            </Block>
          ) : null}

          {hasText(data.analysis) ? (
            <Block title="Exploratory analysis">
              <Paragraphs text={data.analysis ?? ""} />
            </Block>
          ) : null}

          {hasText(data.methodology) || hasText(data.sql_query) || hasText(data.python_snippet) ? (
            <Block title="Methodology">
              {hasText(data.methodology) ? <Paragraphs text={data.methodology ?? ""} /> : null}
              {hasText(data.sql_query) ? (
                <CodeBlock
                  code={data.sql_query ?? ""}
                  language="sql"
                  label="SQL query"
                  caption="Stored with the project for reading. Never executed publicly."
                />
              ) : null}
              {data.sql_result.length > 0 ? (
                <DataTable
                  rows={data.sql_result}
                  caption="Stored query result"
                  pageSize={6}
                  searchable
                  columnToggle={false}
                />
              ) : null}
              {hasText(data.python_snippet) ? (
                <CodeBlock
                  code={data.python_snippet ?? ""}
                  language="python"
                  label="Python excerpt"
                />
              ) : null}
            </Block>
          ) : null}

          {data.visualizations.length > 0 ? (
            <Block title="Visualizations">
              <div className="space-y-6">
                {data.visualizations.map((visualization) => (
                  <LazyDataChart
                    key={visualization.id}
                    visualization={visualization}
                    isDemo={data.is_demo}
                  />
                ))}
              </div>
            </Block>
          ) : null}

          {hasText(data.what_the_data_shows) ||
          hasText(data.why_the_findings_matter) ||
          hasText(data.what_i_would_do_next) ? (
            <Block title="What the data shows / why it matters / what next">
              <div className="grid gap-px border border-line bg-line md:grid-cols-3">
                {[
                  ["What the data shows", data.what_the_data_shows],
                  ["Why it matters", data.why_the_findings_matter],
                  ["What I would do next", data.what_i_would_do_next],
                ].map(([label, text]) =>
                  hasText(text) ? (
                    <div key={label} className="bg-ink-900 p-5">
                      <p className="font-mono text-[0.54rem] uppercase tracking-[0.16em] text-signal">
                        {label}
                      </p>
                      <div className="mt-3">
                        <Paragraphs text={text ?? ""} />
                      </div>
                    </div>
                  ) : null,
                )}
              </div>
            </Block>
          ) : null}

          {hasText(data.key_findings) || data.insights.length > 0 ? (
            <Block title="Key findings">
              {hasText(data.key_findings) ? (
                <Paragraphs text={data.key_findings ?? ""} />
              ) : null}
              {data.insights.map((insight, index) => (
                <InsightCard key={insight.id} insight={insight} index={index + 1} />
              ))}
            </Block>
          ) : null}

          {hasText(data.recommendations) ? (
            <Block title="Recommendations">
              <Paragraphs text={data.recommendations ?? ""} />
            </Block>
          ) : null}

          {hasText(data.limitations) ? (
            <Block title="Limitations">
              <Paragraphs text={data.limitations ?? ""} />
            </Block>
          ) : null}

          {data.tools.length > 0 ? (
            <Block title="Tools">
              <div className="flex flex-wrap gap-2">
                {data.tools.map((tool) => (
                  <span
                    key={tool.id}
                    className="border border-line px-2 py-1 font-mono text-[0.54rem] uppercase tracking-[0.12em] text-paper-dim"
                  >
                    {tool.name}
                  </span>
                ))}
              </div>
            </Block>
          ) : null}

          {data.resources.length > 0 ? (
            <Block title="Files / resources">
              <ResourceList resources={data.resources} />
            </Block>
          ) : null}
        </div>
      </Container>
    </div>
  );
}
