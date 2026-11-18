import { ArrowLeft, ArrowUpRight, Code2, Database, FlaskConical } from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";

import { CodeBlock } from "@/components/data/code-block";
import { DataTable } from "@/components/data/data-table";
import {
  AnalysisSection,
  DatasetPanel,
  InsightCard,
  Paragraphs,
  ResourceList,
} from "@/components/data/analysis-blocks";
import { LazyDataChart } from "@/components/data/lazy-chart";
import { PageIntro } from "@/components/layout/PageIntro";
import { PortfolioImage } from "@/components/media/PortfolioImage";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useApiResource } from "@/hooks/useApiResource";
import { useSeo } from "@/hooks/useSeo";
import type { DataProjectDetail } from "@/types/api";
import {
  DATA_PROJECT_TYPE_LABELS,
  DATA_RESOURCE_TYPE_LABELS,
} from "@/utils/data";

type SectionKey =
  | "overview"
  | "question"
  | "dataset"
  | "preparation"
  | "analysis"
  | "methodology"
  | "visualizations"
  | "storytelling"
  | "findings"
  | "recommendations"
  | "limitations"
  | "tools"
  | "resources";

const SECTION_LABELS: Record<SectionKey, string> = {
  overview: "Overview",
  question: "The question",
  dataset: "Dataset",
  preparation: "Data preparation",
  analysis: "Exploratory analysis",
  methodology: "Methodology",
  visualizations: "Visualizations",
  storytelling: "What the data shows",
  findings: "Key findings",
  recommendations: "Recommendations",
  limitations: "Limitations",
  tools: "Tools",
  resources: "Files / resources",
};

const SECTION_IDS: Record<SectionKey, string> = {
  overview: "overview",
  question: "question",
  dataset: "dataset",
  preparation: "data-preparation",
  analysis: "exploratory-analysis",
  methodology: "methodology",
  visualizations: "visualizations",
  storytelling: "what-the-data-shows",
  findings: "key-findings",
  recommendations: "recommendations",
  limitations: "limitations",
  tools: "tools",
  resources: "resources",
};

function hasText(value: string | null | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

function availableSections(data: DataProjectDetail): SectionKey[] {
  const sections: SectionKey[] = [];
  if (hasText(data.description) || hasText(data.conclusion)) sections.push("overview");
  if (hasText(data.question) || hasText(data.why_it_matters)) sections.push("question");
  if (
    hasText(data.dataset_name) ||
    hasText(data.dataset_source) ||
    hasText(data.dataset_description) ||
    hasText(data.dataset_note) ||
    data.dataset_rows !== null ||
    data.dataset_columns !== null
  ) {
    sections.push("dataset");
  }
  if (hasText(data.data_preparation)) sections.push("preparation");
  if (hasText(data.analysis)) sections.push("analysis");
  if (hasText(data.methodology) || hasText(data.sql_query) || hasText(data.python_snippet)) {
    sections.push("methodology");
  }
  if (data.visualizations.length > 0) sections.push("visualizations");
  if (
    hasText(data.what_the_data_shows) ||
    hasText(data.why_the_findings_matter) ||
    hasText(data.what_i_would_do_next)
  ) {
    sections.push("storytelling");
  }
  if (hasText(data.key_findings) || data.insights.length > 0) sections.push("findings");
  if (hasText(data.recommendations)) sections.push("recommendations");
  if (hasText(data.limitations)) sections.push("limitations");
  if (data.tools.length > 0) sections.push("tools");
  if (data.resources.length > 0) sections.push("resources");
  return sections;
}

function StoryBlock({
  label,
  text,
  emphasis,
}: {
  label: string;
  text: string | null;
  emphasis?: boolean;
}) {
  if (!hasText(text)) return null;
  return (
    <div className={emphasis ? "bg-ink-900 p-5" : "bg-ink-900 p-5"}>
      <p className="font-mono text-[0.54rem] uppercase tracking-[0.16em] text-signal">{label}</p>
      <div className="mt-3">
        <Paragraphs text={text ?? ""} />
      </div>
    </div>
  );
}

export default function DataProjectDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const isDataLabAlias = location.pathname.startsWith("/data-lab/");
  const basePath = isDataLabAlias ? "/data-lab" : "/data";
  const project = useApiResource<DataProjectDetail>(
    slug ? `/api/v1/data-projects/${encodeURIComponent(slug)}` : null,
  );
  const data = project.data;

  useSeo({
    title: data
      ? data.seo_title || `${data.title} — Data Lab | Philemon Melabah`
      : "Data project — Philemon Melabah",
    description:
      data?.seo_description ||
      data?.short_description ||
      "Data analysis project from Philemon Melabah's Data Lab.",
    path: slug ? `${basePath}/${slug}` : undefined,
    type: "article",
    image: data?.cover_image_url ?? null,
    imageAlt: data ? `${data.title} analysis cover` : null,
  });

  if (data) {
    const sections = availableSections(data);

    return (
      <>
        <PageIntro
          eyebrow={`Data Lab / ${data.category.name}`}
          title={data.title}
          description={data.short_description ?? undefined}
          aside={
            <div className="space-y-4 border-t border-line pt-4">
              <div className="flex flex-wrap gap-2">
                <Badge tone="outline">{DATA_PROJECT_TYPE_LABELS[data.project_type]}</Badge>
                {data.is_demo ? <Badge tone="placeholder">Demo data</Badge> : null}
                {data.is_placeholder ? <Badge tone="muted">Analysis pending</Badge> : null}
              </div>
              <dl className="space-y-2.5 font-mono text-[0.56rem] uppercase tracking-[0.14em] text-muted">
                {data.year ? (
                  <div className="flex items-center justify-between gap-6">
                    <dt>Year</dt>
                    <dd className="text-paper">{data.year}</dd>
                  </div>
                ) : null}
                {data.dataset_type ? (
                  <div className="flex items-center justify-between gap-6">
                    <dt>Dataset type</dt>
                    <dd className="text-paper">{data.dataset_type}</dd>
                  </div>
                ) : null}
                {data.tools.length > 0 ? (
                  <div className="flex items-center justify-between gap-6">
                    <dt>Tools used</dt>
                    <dd className="text-paper">{String(data.tools.length).padStart(2, "0")}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          }
        />

        <Container className="py-10 sm:py-14">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              to="/data-lab"
              className="inline-flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted transition-colors hover:text-paper"
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              Back to Data Lab
            </Link>
            <span className="font-mono text-[0.54rem] uppercase tracking-[0.14em] text-faint">
              /data/{data.slug}
            </span>
          </div>

          {data.is_demo ? (
            <div className="mt-8 border border-signal/35 bg-signal/5 p-5 sm:p-6" role="note">
              <div className="flex items-center gap-2">
                <FlaskConical className="size-4 text-signal" aria-hidden="true" />
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-signal">
                  Demo data
                </p>
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-paper-dim">
                This project uses a synthetic dataset generated to test the Data Lab's
                analysis and visualization interface. It is not a record of real clients,
                revenue, or personal results.
              </p>
            </div>
          ) : null}

          {data.is_placeholder && !data.is_demo ? (
            <div className="mt-8 border border-signal/30 bg-signal/5 p-5 sm:p-6">
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-signal">
                Analysis in progress
              </p>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-paper-dim">
                Sections appear here only when real, verified content has been added from
                the admin editor. Nothing is invented to fill the gap.
              </p>
            </div>
          ) : null}

          {data.cover_image_url ? (
            <figure className="mt-8 overflow-hidden border border-line">
              <PortfolioImage
                src={data.cover_image_url}
                alt={`${data.title} analysis cover`}
                aspect="auto"
                sizes="(max-width: 1024px) 100vw, 70vw"
              />
            </figure>
          ) : null}

          <div className="mt-10 grid gap-10 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-16">
            <aside className="h-fit lg:sticky lg:top-24">
              <p className="font-mono text-[0.56rem] uppercase tracking-[0.2em] text-muted">
                Contents
              </p>
              {sections.length > 0 ? (
                <nav aria-label="Data project contents" className="mt-4">
                  <ol className="space-y-2">
                    {sections.map((key, index) => (
                      <li key={key}>
                        <a
                          href={`#${SECTION_IDS[key]}`}
                          className="group flex items-baseline gap-3 text-sm text-muted transition-colors hover:text-paper"
                        >
                          <span className="font-mono text-[0.54rem] tabular-nums text-faint">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          {SECTION_LABELS[key]}
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
              ) : (
                <p className="mt-4 text-sm leading-relaxed text-muted">
                  Sections appear as the analysis is written.
                </p>
              )}

              <Link
                to="/contact"
                className="mt-8 inline-flex items-center gap-2 border-t border-line pt-4 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-paper-dim hover:text-paper"
              >
                Discuss this work
                <ArrowUpRight className="size-3" aria-hidden="true" />
              </Link>
            </aside>

            <article className="min-w-0">
              {sections.length === 0 ? (
                <EmptyState
                  title="Analysis write-up pending"
                  description="The project record exists, but no narrative sections have been published yet. Empty space is left honestly."
                  action={
                    <Link to="/data-lab" className={buttonStyles("secondary", "sm")}>
                      Back to Data Lab
                    </Link>
                  }
                />
              ) : (
                <div className="space-y-12">
                  {sections.map((key, index) => (
                    <AnalysisSection
                      key={key}
                      id={SECTION_IDS[key]}
                      index={index + 1}
                      title={SECTION_LABELS[key]}
                      eyebrow={
                        key === "question"
                          ? "Why this analysis"
                          : key === "methodology"
                            ? "How the work was done"
                            : key === "findings"
                              ? "Interpretation"
                              : undefined
                      }
                    >
                      {key === "overview" ? (
                        <div className="space-y-5">
                          {hasText(data.description) ? <Paragraphs text={data.description ?? ""} /> : null}
                          {hasText(data.conclusion) ? (
                            <div className="border-l-2 border-signal pl-5">
                              <p className="font-mono text-[0.52rem] uppercase tracking-[0.16em] text-muted">
                                Conclusion
                              </p>
                              <div className="mt-3">
                                <Paragraphs text={data.conclusion ?? ""} />
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {key === "question" ? (
                        <div className="grid gap-px border border-line bg-line md:grid-cols-2">
                          {hasText(data.question) ? (
                            <div className="bg-ink-900 p-5">
                              <p className="font-mono text-[0.54rem] uppercase tracking-[0.16em] text-signal">
                                The question
                              </p>
                              <div className="mt-3">
                                <Paragraphs text={data.question ?? ""} />
                              </div>
                            </div>
                          ) : null}
                          {hasText(data.why_it_matters) ? (
                            <div className="bg-ink-900 p-5">
                              <p className="font-mono text-[0.54rem] uppercase tracking-[0.16em] text-muted">
                                Why it matters
                              </p>
                              <div className="mt-3">
                                <Paragraphs text={data.why_it_matters ?? ""} />
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {key === "dataset" ? <DatasetPanel project={data} /> : null}

                      {key === "preparation" ? <Paragraphs text={data.data_preparation ?? ""} /> : null}
                      {key === "analysis" ? <Paragraphs text={data.analysis ?? ""} /> : null}

                      {key === "methodology" ? (
                        <div className="space-y-6">
                          {hasText(data.methodology) ? <Paragraphs text={data.methodology ?? ""} /> : null}
                          {hasText(data.sql_query) ? (
                            <div className="space-y-4">
                              <CodeBlock
                                code={data.sql_query ?? ""}
                                language="sql"
                                label="SQL query"
                                caption="Stored with the project for reading. The public site never executes arbitrary SQL."
                              />
                              {data.sql_result.length > 0 ? (
                                <div>
                                  <div className="mb-2 flex items-center gap-2">
                                    <Database className="size-3.5 text-signal" aria-hidden="true" />
                                    <p className="font-mono text-[0.56rem] uppercase tracking-[0.16em] text-muted">
                                      Stored result example
                                    </p>
                                  </div>
                                  <DataTable
                                    rows={data.sql_result}
                                    caption="Stored query result"
                                    pageSize={6}
                                    searchable
                                    columnToggle={false}
                                  />
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                          {hasText(data.python_snippet) ? (
                            <CodeBlock
                              code={data.python_snippet ?? ""}
                              language="python"
                              label="Python excerpt"
                              caption="A short excerpt, not private project code."
                            />
                          ) : null}
                        </div>
                      ) : null}

                      {key === "visualizations" ? (
                        <div className="space-y-6">
                          <p className="max-w-2xl text-sm leading-relaxed text-muted">
                            Each chart is generated from stored data and includes a readable
                            data-table alternative. Color is never the only signal.
                          </p>
                          {data.visualizations.map((visualization) => (
                            <LazyDataChart
                              key={visualization.id}
                              visualization={visualization}
                              isDemo={data.is_demo}
                            />
                          ))}
                        </div>
                      ) : null}

                      {key === "storytelling" ? (
                        <div className="grid gap-px border border-line bg-line lg:grid-cols-3">
                          <StoryBlock
                            label="What the data shows"
                            text={data.what_the_data_shows}
                            emphasis
                          />
                          <StoryBlock
                            label="Why it matters"
                            text={data.why_the_findings_matter}
                          />
                          <StoryBlock
                            label="What I would do next"
                            text={data.what_i_would_do_next}
                          />
                        </div>
                      ) : null}

                      {key === "findings" ? (
                        <div className="space-y-6">
                          {hasText(data.key_findings) ? (
                            <Paragraphs text={data.key_findings ?? ""} />
                          ) : null}
                          {data.insights.length > 0 ? (
                            <div className="space-y-4">
                              {data.insights.map((insight, insightIndex) => (
                                <InsightCard
                                  key={insight.id}
                                  insight={insight}
                                  index={insightIndex + 1}
                                />
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {key === "recommendations" ? (
                        <Paragraphs text={data.recommendations ?? ""} />
                      ) : null}
                      {key === "limitations" ? <Paragraphs text={data.limitations ?? ""} /> : null}

                      {key === "tools" ? (
                        <div className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
                          {data.tools.map((tool) => (
                            <div key={tool.id} className="bg-ink-900 p-4">
                              <p className="text-sm text-paper">{tool.name}</p>
                              <p className="mt-1.5 font-mono text-[0.5rem] uppercase tracking-[0.12em] text-faint">
                                {tool.kind}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {key === "resources" ? (
                        <div className="space-y-3">
                          <p className="max-w-2xl text-sm leading-relaxed text-muted">
                            Only resources that exist are listed. A resource without a public
                            URL is shown as unavailable rather than linked to something broken.
                          </p>
                          <ResourceList resources={data.resources} />
                          <ul className="flex flex-wrap gap-x-4 gap-y-2">
                            {data.github_url ? (
                              <li>
                                <a
                                  href={data.github_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 font-mono text-[0.56rem] uppercase tracking-[0.12em] text-paper-dim hover:text-paper"
                                >
                                  <Code2 className="size-3" aria-hidden="true" />
                                  GitHub
                                  <ArrowUpRight className="size-3" aria-hidden="true" />
                                </a>
                              </li>
                            ) : null}
                            {data.notebook_url ? (
                              <li>
                                <a
                                  href={data.notebook_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 font-mono text-[0.56rem] uppercase tracking-[0.12em] text-paper-dim hover:text-paper"
                                >
                                  Notebook
                                  <ArrowUpRight className="size-3" aria-hidden="true" />
                                </a>
                              </li>
                            ) : null}
                            {data.dashboard_url ? (
                              <li>
                                <a
                                  href={data.dashboard_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 font-mono text-[0.56rem] uppercase tracking-[0.12em] text-paper-dim hover:text-paper"
                                >
                                  Dashboard
                                  <ArrowUpRight className="size-3" aria-hidden="true" />
                                </a>
                              </li>
                            ) : null}
                          </ul>
                          {data.resources.some((resource) => !resource.url) ? (
                            <p className="text-[0.68rem] leading-relaxed text-faint">
                              {data.resources.filter((resource) => !resource.url).length} resource
                              {data.resources.filter((resource) => !resource.url).length === 1
                                ? ""
                                : "s"}{" "}
                              without a public URL:{" "}
                              {data.resources
                                .filter((resource) => !resource.url)
                                .map(
                                  (resource) =>
                                    `${resource.title} (${DATA_RESOURCE_TYPE_LABELS[resource.resource_type] ?? resource.resource_type})`,
                                )
                                .join(", ")}
                              .
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </AnalysisSection>
                  ))}
                </div>
              )}

              <div className="mt-14 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-faint">
                  {data.is_demo
                    ? "Demo analysis / synthetic data"
                    : data.is_placeholder
                      ? "Draft content / pending verification"
                      : "Published analysis"}
                </p>
                <Link to="/data-lab" className={buttonStyles("secondary", "sm")}>
                  <ArrowLeft className="size-3.5" aria-hidden="true" />
                  Back to Data Lab
                </Link>
              </div>
            </article>
          </div>
        </Container>
      </>
    );
  }

  return (
    <>
      <PageIntro eyebrow="Data Lab / Project" title={project.loading ? "Loading analysis…" : "Data project"} />
      <Container className="py-10 sm:py-14">
        <Link
          to="/data-lab"
          className="inline-flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted transition-colors hover:text-paper"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to Data Lab
        </Link>

        {project.loading ? (
          <div className="mt-10">
            <LoadingState rows={5} label="Loading data project" />
          </div>
        ) : null}

        {!project.loading && project.error ? (
          <div className="mt-10">
            {project.error.status === 404 ? (
              <EmptyState
                title="Data project not found"
                description="This analysis may be unpublished, archived, or the URL may be incorrect."
                action={
                  <Link to="/data-lab" className={buttonStyles("secondary", "sm")}>
                    Back to Data Lab
                  </Link>
                }
              />
            ) : (
              <ErrorState
                message="This analysis could not be loaded. The API may be unavailable — try again in a moment."
                onRetry={project.reload}
              />
            )}
          </div>
        ) : null}
      </Container>
    </>
  );
}
