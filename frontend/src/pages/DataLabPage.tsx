import { ArrowUpRight, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { DataProjectCard } from "@/components/data/data-project-card";
import { LazyDataChart } from "@/components/data/lazy-chart";
import { PageIntro } from "@/components/layout/PageIntro";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePageContent, usePageSeo } from "@/app/ContentProvider";
import { dataProjectsService } from "@/services/dataProjects.service";
import type { DataProjectType } from "@/types/api";
import { cn } from "@/utils/cn";
import { DATA_PROJECT_TYPE_LABELS } from "@/utils/data";

const METHOD = [
  {
    index: "01",
    title: "Start with a question",
    body: "Decide what needs answering, why it matters and what a useful result would change.",
  },
  {
    index: "02",
    title: "Work through the evidence",
    body: "Prepare the data, note assumptions and use Python, SQL, Excel or statistics where they fit.",
  },
  {
    index: "03",
    title: "Communicate the finding",
    body: "Show the evidence, explain the limits and say what the result means for a decision.",
  },
];

export default function DataLabPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get("category") ?? "";
  const tool = searchParams.get("tool") ?? "";
  const projectType = (searchParams.get("type") ?? "") as "" | DataProjectType;
  const query = searchParams.get("q") ?? "";

  const [searchInput, setSearchInput] = useState(query);
  const debouncedSearch = useDebouncedValue(searchInput, 320);

  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  useEffect(() => {
    if (debouncedSearch === query) return;
    const next = new URLSearchParams(searchParams);
    if (debouncedSearch.trim()) next.set("q", debouncedSearch.trim());
    else next.delete("q");
    setSearchParams(next, { replace: true });
    // Read searchParams at call time; including it would re-run on every filter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, query, setSearchParams]);

  const filtersActive = Boolean(category || tool || projectType || query);

  const projects = useApiQuery(
    (signal) =>
      dataProjectsService.list(
        {
          category: category || undefined,
          tool: tool || undefined,
          projectType: projectType || undefined,
          search: query || undefined,
          limit: 100,
        },
        signal,
      ),
    [category, tool, projectType, query],
  );

  const facets = useApiQuery(
    (signal) => dataProjectsService.list({ limit: 100 }, signal),
    [],
  );
  const categories = useApiQuery(
    (signal) => dataProjectsService.getCategories(signal),
    [],
  );
  const tools = useApiQuery((signal) => dataProjectsService.getTools(signal), []);
  const featured = useApiQuery(
    (signal) => dataProjectsService.getFeatured(3, signal),
    [],
  );

  usePageSeo("data-lab", {
    title: "Data Lab | Philemon Melabah",
    description:
      "Data projects by Philemon Melabah: the dataset, the question, the method and what the analysis found.",
    path: "/data-lab",
  });

  const page = usePageContent("data-lab");

  const items = projects.data?.items ?? [];
  const allItems = facets.data?.items ?? [];
  const heroProject = featured.data?.items[0] ?? null;
  const heroVisualization = heroProject?.hero_visualization ?? null;

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const project of allItems) {
      counts.set(project.category.slug, (counts.get(project.category.slug) ?? 0) + 1);
    }
    return counts;
  }, [allItems]);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const totalPublished = facets.data?.total ?? 0;
  const resultCount = projects.data?.total ?? 0;

  return (
    <>
      <PageIntro
        eyebrow={page?.eyebrow || "Data Lab"}
        title={
          page?.title ? (
            page.title
          ) : (
            <>
              From data to{" "}
              <span className="display-serif text-signal">a clear answer.</span>
            </>
          )
        }
        description={
          page?.description ||
          "I use data to answer questions, test assumptions and explain what the evidence shows. Each project includes the question, the dataset, the method and the result."
        }
        aside={
          <div className="border-t border-line pt-4 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
            <div className="flex items-center justify-between gap-6">
              <span>Projects</span>
              <span className="text-paper">
                {facets.loading ? "..." : String(totalPublished).padStart(2, "0")}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-6">
              <span>Tools</span>
              <span className="text-paper">
                {tools.loading ? "..." : String(tools.data?.length ?? 0).padStart(2, "0")}
              </span>
            </div>
          </div>
        }
      />

      <Container className="py-12 sm:py-16">
        <div className="grid gap-px border border-line bg-line md:grid-cols-3">
          {METHOD.map((step) => (
            <div key={step.index} className="bg-ink-900 p-6 sm:p-8">
              <span className="font-mono text-[0.6rem] tracking-[0.18em] text-signal">
                {step.index}
              </span>
              <h2 className="mt-6 text-xl font-medium tracking-tight text-paper">{step.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">{step.body}</p>
            </div>
          ))}
        </div>

        <section className="mt-12" aria-labelledby="featured-visual-heading">
          <div className="flex flex-wrap items-end justify-between gap-3 border-t border-line pt-6">
            <div>
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted">
                Featured
              </p>
              <h2
                id="featured-visual-heading"
                className="mt-2 text-2xl font-medium tracking-tight text-paper sm:text-3xl"
              >
                A chart from a recent project
              </h2>
            </div>
            <Link to="/data-lab#index" className={buttonStyles("secondary", "sm")}>
              See all projects
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
            {heroVisualization && heroProject ? (
              <LazyDataChart visualization={heroVisualization} isDemo={heroProject.is_demo} compact />
            ) : (
              <div className="flex min-h-48 flex-col items-start justify-center border border-dashed border-line-strong bg-ink-800/30 p-8">
                <p className="text-sm font-medium text-paper">No featured chart yet</p>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
                  A chart appears here when a published project has one. Charts are built from
                  saved project data.
                </p>
              </div>
            )}

            <div className="border border-line bg-ink-900/50 p-5">
              <p className="font-mono text-[0.54rem] uppercase tracking-[0.16em] text-muted">
                Featured analysis
              </p>
              {heroProject ? (
                <>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge tone="outline">{DATA_PROJECT_TYPE_LABELS[heroProject.project_type]}</Badge>
                    {heroProject.is_demo ? <Badge tone="placeholder">Sample data</Badge> : null}
                  </div>
                  <Link
                    to={`/data/${heroProject.slug}`}
                    className="mt-4 block text-xl font-medium leading-tight tracking-tight text-paper hover:text-signal-soft"
                  >
                    {heroProject.title}
                  </Link>
                  {heroProject.short_description ? (
                    <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-muted">
                      {heroProject.short_description}
                    </p>
                  ) : null}
                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    {heroProject.tools.slice(0, 4).map((item) => (
                      <span
                        key={item.id}
                        className="border border-line px-2 py-1 font-mono text-[0.5rem] uppercase tracking-[0.12em] text-paper-dim"
                      >
                        {item.name}
                      </span>
                    ))}
                  </div>
                  <Link
                    to={`/data/${heroProject.slug}`}
                    className="mt-6 inline-flex items-center gap-2 font-mono text-[0.56rem] uppercase tracking-[0.14em] text-paper hover:text-signal"
                  >
                    Read the analysis
                    <ArrowUpRight className="size-3" aria-hidden="true" />
                  </Link>
                </>
              ) : (
                <p className="mt-4 text-sm leading-relaxed text-muted">
                  Featured projects will appear here once one is selected.
                </p>
              )}
            </div>
          </div>
        </section>

        <section id="index" className="mt-16 scroll-mt-24" aria-labelledby="data-index-heading">
          <div className="flex flex-wrap items-end justify-between gap-4 border-t border-line pt-6">
            <div>
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted">
                Data Lab
              </p>
              <h2
                id="data-index-heading"
                className="mt-3 text-3xl font-medium tracking-tight text-paper sm:text-4xl"
              >
                All projects
              </h2>
            </div>
            <Link to="/contact" className={buttonStyles("secondary", "sm")}>
              Get in touch
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>

          <section
            aria-labelledby="data-filters-heading"
            className="mt-8 border border-line bg-ink-800/30"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
              <div className="flex items-center gap-3">
                <SlidersHorizontal className="size-3.5 text-muted" aria-hidden="true" />
                <h3
                  id="data-filters-heading"
                  className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted"
                >
                  Filters
                </h3>
              </div>
              {filtersActive ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1.5 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted transition-colors hover:text-paper"
                >
                  <X className="size-3" aria-hidden="true" />
                  Clear all
                </button>
              ) : null}
            </div>

            <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]">
              <form role="search" onSubmit={(event) => event.preventDefault()} className="relative">
                <label
                  htmlFor="data-search"
                  className="font-mono text-[0.56rem] uppercase tracking-[0.16em] text-muted"
                >
                  Search projects
                </label>
                <div className="relative mt-2">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted"
                    aria-hidden="true"
                  />
                  <input
                    id="data-search"
                    type="search"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Name, description, tool, category, keyword..."
                    autoComplete="off"
                    className="h-11 w-full border border-line bg-ink-900 pl-9 pr-9 font-sans text-sm text-paper placeholder:text-faint focus:border-line-strong focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
                  />
                  {searchInput ? (
                    <button
                      type="button"
                      onClick={() => setSearchInput("")}
                      className="absolute right-2 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center text-muted hover:text-paper"
                      aria-label="Clear search"
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
                <p className="mt-2 text-[0.68rem] leading-relaxed text-faint">
                  Searches names, descriptions, categories and tools.
                </p>
              </form>

              <div>
                <label
                  htmlFor="data-tool"
                  className="font-mono text-[0.56rem] uppercase tracking-[0.16em] text-muted"
                >
                  Tool
                </label>
                <select
                  id="data-tool"
                  value={tool}
                  onChange={(event) => updateParam("tool", event.target.value)}
                  className="mt-2 h-11 w-full border border-line bg-ink-900 px-3 font-mono text-[0.62rem] uppercase tracking-[0.1em] text-paper focus:border-line-strong focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
                >
                  <option value="">All tools</option>
                  {(tools.data ?? []).map((item) => (
                    <option key={item.id} value={item.slug}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-[0.68rem] leading-relaxed text-faint">
                  Only tools used by published projects are listed.
                </p>
              </div>

              <div>
                <label
                  htmlFor="data-type"
                  className="font-mono text-[0.56rem] uppercase tracking-[0.16em] text-muted"
                >
                  Project type
                </label>
                <select
                  id="data-type"
                  value={projectType}
                  onChange={(event) => updateParam("type", event.target.value)}
                  className="mt-2 h-11 w-full border border-line bg-ink-900 px-3 font-mono text-[0.62rem] uppercase tracking-[0.1em] text-paper focus:border-line-strong focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
                >
                  <option value="">All types</option>
                  {Object.entries(DATA_PROJECT_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-[0.68rem] leading-relaxed text-faint">
                  For example analysis, SQL, Excel, dashboards or research.
                </p>
              </div>
            </div>

            <div className="border-t border-line px-4 py-4 sm:px-5">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[0.56rem] uppercase tracking-[0.16em] text-muted">
                  Category
                </span>
                <span className="h-px flex-1 bg-line" aria-hidden="true" />
              </div>
              <div
                className="scrollbar-none mt-3 flex gap-2 overflow-x-auto pb-1"
                role="group"
                aria-label="Filter by category"
              >
                <button
                  type="button"
                  onClick={() => updateParam("category", "")}
                  aria-pressed={!category}
                  className={cn(
                    "shrink-0 border px-3 py-2 font-mono text-[0.6rem] uppercase tracking-[0.14em] transition-colors",
                    !category
                      ? "border-paper bg-paper text-ink-950"
                      : "border-line text-paper-dim hover:border-line-strong",
                  )}
                >
                  All
                  <span className="ml-2 text-[0.52rem] opacity-70">
                    {String(totalPublished).padStart(2, "0")}
                  </span>
                </button>
                {(categories.data ?? []).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => updateParam("category", item.slug)}
                    aria-pressed={category === item.slug}
                    className={cn(
                      "shrink-0 border px-3 py-2 font-mono text-[0.6rem] uppercase tracking-[0.14em] transition-colors",
                      category === item.slug
                        ? "border-paper bg-paper text-ink-950"
                        : "border-line text-paper-dim hover:border-line-strong",
                    )}
                  >
                    {item.name}
                    <span className="ml-2 text-[0.52rem] opacity-70">
                      {String(categoryCounts.get(item.slug) ?? 0).padStart(2, "0")}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2" aria-live="polite">
              {category ? (
                <FilterTag
                  label={
                    categories.data?.find((item) => item.slug === category)?.name ?? category
                  }
                  onRemove={() => updateParam("category", "")}
                />
              ) : null}
              {tool ? (
                <FilterTag
                  label={tools.data?.find((item) => item.slug === tool)?.name ?? tool}
                  onRemove={() => updateParam("tool", "")}
                />
              ) : null}
              {projectType ? (
                <FilterTag
                  label={DATA_PROJECT_TYPE_LABELS[projectType] ?? projectType}
                  onRemove={() => updateParam("type", "")}
                />
              ) : null}
              {query ? (
                <FilterTag
                  label={`“${query}”`}
                  onRemove={() => {
                    setSearchInput("");
                    updateParam("q", "");
                  }}
                />
              ) : null}
              {!filtersActive ? (
                <span className="type-meta text-faint">
                  {String(totalPublished).padStart(2, "0")} published project
                  {totalPublished === 1 ? "" : "s"}
                </span>
              ) : (
                <span className="type-meta text-muted">
                  {String(resultCount).padStart(2, "0")} match{resultCount === 1 ? "" : "es"}
                </span>
              )}
            </div>
            <span className="type-meta text-faint">
              Newest first
            </span>
          </div>

          <div className="mt-8">
            {projects.loading && items.length === 0 ? (
              <LoadingState rows={4} label="Loading projects" />
            ) : null}
            {!projects.loading && projects.error ? (
              <ErrorState
                message="We couldn't load these projects. Please try again in a moment."
                onRetry={projects.reload}
              />
            ) : null}
            {!projects.loading && !projects.error && items.length === 0 ? (
              <EmptyState
                title={
                  filtersActive
                    ? "No projects match those filters"
                    : "No data projects yet"
                }
                description={
                  filtersActive
                    ? "Try a broader search or clear one of the filters."
                    : "Data projects will appear here once they are published."
                }
                action={
                  filtersActive ? (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className={buttonStyles("secondary", "sm")}
                    >
                      Clear all filters
                    </button>
                  ) : (
                    <Link to="/contact" className={buttonStyles("secondary", "sm")}>
                      Get in touch
                      <ArrowUpRight className="size-3.5" aria-hidden="true" />
                    </Link>
                  )
                }
              />
            ) : null}
            {!projects.loading && !projects.error && items.length > 0 ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {items.map((project, index) => (
                  <DataProjectCard key={project.id} project={project} index={index + 1} />
                ))}
              </div>
            ) : null}
          </div>

          <p className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 font-mono text-[0.56rem] uppercase tracking-[0.14em] text-faint">
            <span>
              {projects.data
                ? `${resultCount} project${resultCount === 1 ? "" : "s"}`
                : "No projects loaded yet"}
            </span>
            <span>Filters are saved in the address bar</span>
          </p>
        </section>
      </Container>
    </>
  );
}

function FilterTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Badge tone="outline" className="gap-2 py-1.5">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="text-muted transition-colors hover:text-paper"
        aria-label={`Remove ${label} filter`}
      >
        <X className="size-3" aria-hidden="true" />
      </button>
    </Badge>
  );
}
