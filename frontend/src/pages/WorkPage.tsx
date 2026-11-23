import { ArrowUpRight, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { PageIntro } from "@/components/layout/PageIntro";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { ProjectCard, ProjectRow } from "@/components/work/project-card";
import { projectAssetId } from "@/components/work/project-assets";
import { ProjectStatus } from "@/components/work/project-status";
import { ProjectVisual } from "@/components/work/project-visual";
import { hasHomepagePreview } from "@/components/work/HomepagePreview";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePageContent, usePageSeo } from "@/app/ContentProvider";
import { projectsService } from "@/services/projects.service";
import type { ProjectStage, ProjectSummary } from "@/types/api";
import { cn } from "@/utils/cn";
import { projectSummaryText } from "@/utils/content";
import { PROJECT_STAGE_LABELS, PROJECT_STAGE_ORDER } from "@/utils/projects";

const STATUS_FILTERS: Array<{ value: "" | ProjectStage; label: string }> = [
  { value: "", label: "All statuses" },
  ...PROJECT_STAGE_ORDER.map((stage) => ({
    value: stage,
    label: PROJECT_STAGE_LABELS[stage],
  })),
];

function WorkFeature({
  project,
  index,
}: {
  project: ProjectSummary;
  index: number;
}) {
  const summary = projectSummaryText(project);

  return (
    <Link
      to={`/work/${project.slug}`}
      className="group grid gap-8 border-t border-line pt-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-stretch lg:gap-12"
    >
      <div className="flex flex-col justify-between">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="type-meta text-signal">
              {String(index).padStart(2, "0")} / Latest project
            </span>
            <ProjectStatus status={project.project_status} />
          </div>

          <h2 className="mt-7 text-balance text-[clamp(2.8rem,5.6vw,5.5rem)] font-medium leading-[0.92] tracking-[-0.05em] text-paper transition-colors duration-300 group-hover:text-signal-soft">
            {project.title}
          </h2>

          {summary ? (
            <p className="mt-5 max-w-xl text-pretty text-sm leading-relaxed text-paper-dim sm:text-base">
              {summary}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="type-meta text-paper-dim">{project.category.name}</span>
            {project.year ? (
              <>
                <span className="size-1 bg-signal" aria-hidden="true" />
                <span className="type-meta text-muted">{project.year}</span>
              </>
            ) : null}
            {project.role ? (
              <>
                <span className="size-1 bg-signal" aria-hidden="true" />
                <span className="type-meta text-muted">{project.role}</span>
              </>
            ) : null}
          </div>

          {project.technologies.length > 0 ? (
            <ul className="mt-5 flex flex-wrap gap-x-3 gap-y-2">
              {project.technologies.slice(0, 6).map((technology) => (
                <li
                  key={technology.id}
                  className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-muted"
                >
                  {technology.name}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="mt-8 flex items-end justify-between gap-5 border-t border-line pt-4">
          <span className="inline-flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-paper transition-colors group-hover:text-signal">
            View project
            <ArrowUpRight
              className="size-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </span>
          <span className="type-meta text-faint">
            {project.is_placeholder ? "Not finished" : "Published"}
          </span>
        </div>
      </div>

      <div>
        <ProjectVisual
          title={project.title}
          index={index}
          imageUrl={
            hasHomepagePreview(project)
              ? project.preview_image
              : project.cover_image_url
          }
          imageAlt={
            hasHomepagePreview(project)
              ? `Captured homepage of ${project.title}`
              : `${project.title} project cover`
          }
          assetId={projectAssetId(project.slug)}
          aspect="landscape"
          className="h-full"
        />
      </div>

      <span className="sr-only">Open {project.title}</span>
    </Link>
  );
}

export default function WorkPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get("category") ?? "";
  const technology = searchParams.get("technology") ?? "";
  const status = (searchParams.get("status") ?? "") as "" | ProjectStage;
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
    // searchParams is intentionally read at call time; including it would
    // re-run the effect for every unrelated filter change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, query, setSearchParams]);

  const filtersActive = Boolean(category || technology || status || query);

  const projects = useApiQuery(
    (signal) =>
      projectsService.list(
        {
          category: category || undefined,
          technology: technology || undefined,
          status: status || undefined,
          search: query || undefined,
          includeArchived: status === "archived",
          limit: 100,
        },
        signal,
      ),
    [category, technology, status, query],
  );

  // A single unfiltered read powers the facet counts and the index total.
  const facets = useApiQuery(
    (signal) => projectsService.list({ limit: 100 }, signal),
    [],
  );

  const categories = useApiQuery(
    (signal) => projectsService.getCategories(signal),
    [],
  );
  const technologies = useApiQuery(
    (signal) => projectsService.getTechnologies(signal),
    [],
  );

  usePageSeo("work", {
    title: "Work — Philemon Melabah",
    description:
      "Projects and case studies by Philemon Melabah. Filter by category, technology or status, then open a project to read more.",
    path: "/work",
  });

  const page = usePageContent("work");

  const items = projects.data?.items ?? [];
  const allItems = facets.data?.items ?? [];

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const project of allItems) {
      for (const slug of [
        project.category.slug,
        ...project.secondary_categories.map((item) => item.slug),
      ]) {
        counts.set(slug, (counts.get(slug) ?? 0) + 1);
      }
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

  const hasHero = items.length > 0;
  const hero = hasHero ? items[0] : null;
  const cards = items.slice(1, 3);
  const rows = items.slice(3);

  return (
    <>
      <PageIntro
        eyebrow={page?.eyebrow || "Work"}
        title={
          page?.title ? (
            page.title
          ) : (
            <>
              Projects I have built{" "}
              <span className="display-serif text-signal">and worked on.</span>
            </>
          )
        }
        description={
          page?.description ||
          "A list of the projects I have worked on. Each one explains what it does, how it was built and what I learned. Some are finished; others are still in progress."
        }
        aside={
          <div className="border-t border-line pt-4 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
            <div className="flex items-center justify-between gap-6">
              <span>Published projects</span>
              <span className="text-paper">
                {facets.loading ? "..." : String(totalPublished).padStart(2, "0")}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-6">
              <span>Showing</span>
              <span className="text-paper" aria-live="polite">
                {projects.loading ? "..." : String(resultCount).padStart(2, "0")}
              </span>
            </div>

          </div>
        }
      />

      <Container className="py-10 sm:py-14">
        <section aria-labelledby="work-filters-heading" className="border border-line bg-ink-800/30">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
            <div className="flex items-center gap-3">
              <SlidersHorizontal className="size-3.5 text-muted" aria-hidden="true" />
              <h2
                id="work-filters-heading"
                className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted"
              >
                Filters
              </h2>
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
            <form
              role="search"
              onSubmit={(event) => event.preventDefault()}
              className="relative"
            >
              <label
                htmlFor="project-search"
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
                  id="project-search"
                  type="search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Name, description, technology, keyword…"
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
                Searches names, descriptions, categories and technologies.
              </p>
            </form>

            <div>
              <label
                htmlFor="project-technology"
                className="font-mono text-[0.56rem] uppercase tracking-[0.16em] text-muted"
              >
                Technology
              </label>
              <select
                id="project-technology"
                value={technology}
                onChange={(event) => updateParam("technology", event.target.value)}
                className="mt-2 h-11 w-full border border-line bg-ink-900 px-3 font-mono text-[0.62rem] uppercase tracking-[0.1em] text-paper focus:border-line-strong focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
              >
                <option value="">All technologies</option>
                {(technologies.data ?? []).map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-[0.68rem] leading-relaxed text-faint">
                Only technologies used by published projects are listed.
              </p>
            </div>

            <div>
              <label
                htmlFor="project-status"
                className="font-mono text-[0.56rem] uppercase tracking-[0.16em] text-muted"
              >
                Status
              </label>
              <select
                id="project-status"
                value={status}
                onChange={(event) => updateParam("status", event.target.value)}
                className="mt-2 h-11 w-full border border-line bg-ink-900 px-3 font-mono text-[0.62rem] uppercase tracking-[0.1em] text-paper focus:border-line-strong focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
              >
                {STATUS_FILTERS.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-[0.68rem] leading-relaxed text-faint">
                Archived projects appear only when selected.
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
            <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by category">
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
              {(categories.data ?? []).map((item) => {
                const count = categoryCounts.get(item.slug) ?? 0;
                return (
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
                      {String(count).padStart(2, "0")}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2" aria-live="polite">
            {category ? (
              <FilterTag label={categories.data?.find((item) => item.slug === category)?.name ?? category} onRemove={() => updateParam("category", "")} />
            ) : null}
            {technology ? (
              <FilterTag label={technologies.data?.find((item) => item.slug === technology)?.name ?? technology} onRemove={() => updateParam("technology", "")} />
            ) : null}
            {status ? (
              <FilterTag label={PROJECT_STAGE_LABELS[status] ?? status} onRemove={() => updateParam("status", "")} />
            ) : null}
            {query ? <FilterTag label={`“${query}”`} onRemove={() => { setSearchInput(""); updateParam("q", ""); }} /> : null}
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
            <LoadingState rows={5} label="Loading projects" />
          ) : null}
          {!projects.loading && projects.error ? (
            <ErrorState
              message="We couldn't load the projects. Please try again in a moment."
              onRetry={projects.reload}
            />
          ) : null}
          {!projects.loading && !projects.error && items.length === 0 ? (
            <EmptyState
              title={filtersActive ? "No projects match those filters" : "No projects yet"}
              description={
                filtersActive
                  ? "Try a broader search or clear one of the filters."
                  : "Projects will appear here once they are published."
              }
              action={
                filtersActive ? (
                  <button type="button" onClick={clearFilters} className={buttonStyles("secondary", "sm")}>
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

          {items.length > 0 ? (
            <div className="space-y-12 sm:space-y-16">
              {hero ? <WorkFeature project={hero} index={1} /> : null}

              {cards.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {cards.map((project, index) => (
                    <ProjectCard key={project.id} project={project} index={index + 2} />
                  ))}
                </div>
              ) : null}

              {rows.length > 0 ? (
                <div>
                  <div className="mb-2 flex items-center gap-3">
                    <span className="type-meta text-muted">More projects</span>
                    <span className="h-px flex-1 bg-line" aria-hidden="true" />
                  </div>
                  {rows.map((project, index) => (
                    <ProjectRow key={project.id} project={project} index={index + 4} />
                  ))}
                </div>
              ) : null}
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
