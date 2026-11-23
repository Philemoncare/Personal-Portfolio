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
              From data to{" "}
              <span className="display-serif text-signal">a clear answer.</span>
            </span>
          }
          description="I use data to answer questions, test assumptions and explain what the evidence shows."
          action={
            <Link to="/data-lab" className={buttonStyles("secondary", "sm")}>
              Visit Data Lab
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          }
        />

        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-16">
          <Reveal>
            <div>
              <p className="text-pretty text-lg leading-relaxed text-paper-dim sm:text-xl">
                The Data Lab is where I publish data work: the dataset, the question, the method
                and what I found, written so it can be used.
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
                    {project.is_demo ? <Badge tone="placeholder">Sample data</Badge> : null}
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
                    Read the analysis
                    <ArrowUpRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </div>
              ) : null}

              {!featured.loading && !project ? (
                <p className="mt-8 max-w-xl text-sm leading-relaxed text-muted">
                  No featured analysis yet. Published Data Lab projects with a chart appear here.
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
                  { label: "Method", value: "Shown" },
                  { label: "Result", value: "Explained" },
                  { label: "Limits", value: "Stated" },
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
                    {featured.loading ? "Loading featured analysis..." : "No featured chart yet"}
                  </h3>
                  <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
                    {featured.loading
                      ? "Loading the latest published analysis."
                      : "Charts are built from saved project data. A featured project with a chart appears here."}
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
