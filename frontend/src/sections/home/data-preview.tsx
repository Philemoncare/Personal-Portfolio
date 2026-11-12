import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

import { LazyDataChart } from "@/components/data/lazy-chart";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { InlineLoading } from "@/components/ui/states";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeader } from "@/components/ui/section-header";
import { useApiQuery } from "@/hooks/useApiQuery";
import { dataProjectsService } from "@/services/dataProjects.service";
import { DATA_PROJECT_TYPE_LABELS } from "@/utils/data";

export function DataPreview() {
  const featured = useApiQuery(
    (signal) => dataProjectsService.getFeatured(1, signal),
    [],
  );
  const project = featured.data?.items[0] ?? null;
  const visualization = project?.hero_visualization ?? null;
  const tools = project?.tools.slice(0, 5) ?? [];

  return (
    <section className="border-t border-line py-20 sm:py-28" aria-labelledby="data-preview-heading">
      <Container>
        <SectionHeader
          index="04"
          eyebrow="Data Lab"
          title={
            <span id="data-preview-heading">
              Find the pattern.{" "}
              <span className="display-serif text-signal">Explain it clearly.</span>
            </span>
          }
          description="I work with data to answer questions, test assumptions, and communicate what the evidence actually supports."
          action={
            <Link to="/data-lab" className={buttonStyles("secondary", "sm")}>
              Explore Data Lab
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          }
        />

        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-16">
          <Reveal>
            <div>
              <p className="text-pretty text-lg leading-relaxed text-paper-dim sm:text-xl">
                The Data Lab is the analysis side of the practice: the dataset, the question, the
                method, and the finding — written so a decision can be made from it.
              </p>

              {featured.loading ? (
                <div className="mt-8">
                  <InlineLoading label="Loading featured analysis" />
                </div>
              ) : null}

              {!featured.loading && project ? (
                <div className="mt-8">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="outline">
                      {DATA_PROJECT_TYPE_LABELS[project.project_type]}
                    </Badge>
                    {project.is_demo ? <Badge tone="placeholder">Demo data</Badge> : null}
                  </div>
                  <Link
                    to={`/data/${project.slug}`}
                    className="mt-4 block text-xl font-medium leading-tight tracking-tight text-paper transition-colors hover:text-signal-soft sm:text-2xl"
                  >
                    {project.title}
                  </Link>
                  {project.short_description ? (
                    <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
                      {project.short_description}
                    </p>
                  ) : null}
                  <Link
                    to={`/data/${project.slug}`}
                    className="mt-5 inline-flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-paper transition-colors hover:text-signal"
                  >
                    Explore Analysis
                    <ArrowUpRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </div>
              ) : null}

              {!featured.loading && !project ? (
                <p className="mt-8 max-w-xl text-sm leading-relaxed text-muted">
                  Featured analyses appear here once a published Data Lab project has a
                  validated visualization. No values are invented to fill this space.
                </p>
              ) : null}

              {tools.length > 0 ? (
                <ul className="mt-8 flex flex-wrap gap-1.5">
                  {tools.map((tool) => (
                    <li
                      key={tool.id}
                      className="border border-line px-2.5 py-1.5 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-paper-dim"
                    >
                      {tool.name}
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-3">
                {[
                  { label: "Method", value: "Reproducible" },
                  { label: "Output", value: "Decision-ready" },
                  { label: "Limit", value: "Stated openly" },
                ].map((item) => (
                  <div key={item.label} className="bg-background p-4">
                    <p className="type-meta text-faint">{item.label}</p>
                    <p className="mt-2 text-sm text-paper">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.06}>
            {visualization && project ? (
              <LazyDataChart visualization={visualization} isDemo={project.is_demo} compact />
            ) : (
              <div className="flex min-h-64 flex-col justify-between border border-dashed border-line-strong bg-ink-800/30 p-6">
                <div>
                  <p className="type-meta text-signal">Data Lab / Featured view</p>
                  <h3 className="mt-4 text-xl font-medium tracking-tight text-paper">
                    {featured.loading ? "Loading featured analysis…" : "No featured chart yet"}
                  </h3>
                  <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
                    {featured.loading
                      ? "Fetching the latest published analysis from the Data Lab API."
                      : "Charts are only rendered from stored analysis data. Publish a project with a validated visualization to feature it here."}
                  </p>
                </div>
                <Link
                  to="/data-lab"
                  className="mt-8 inline-flex items-center gap-2 font-mono text-[0.56rem] uppercase tracking-[0.14em] text-paper-dim hover:text-paper"
                >
                  Open the Data Lab
                  <ArrowUpRight className="size-3" aria-hidden="true" />
                </Link>
              </div>
            )}
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
