import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import type { LeadershipEntry, ProjectSummary, WorkMode as WorkModeType } from "@/types/api";
import { cn } from "@/utils/cn";
import { projectSummaryText } from "@/utils/content";

const MODES: Array<{
  id: WorkModeType;
  label: string;
  description: string;
  capabilities: string[];
  href: string;
  hrefLabel: string;
}> = [
  {
    id: "build",
    label: "Build",
    description:
      "Web applications, APIs and the software systems behind them.",
    capabilities: [
      "Full-stack applications",
      "Web platforms",
      "APIs",
      "Backend systems",
      "Frontend development",
    ],
    href: "/work",
    hrefLabel: "See all projects",
  },
  {
    id: "data",
    label: "Data",
    description:
      "Analysis, SQL and dashboards, with the thinking behind them.",
    capabilities: [
      "Python",
      "SQL",
      "Excel",
      "Analytics",
      "Data visualisation",
      "Dashboards",
    ],
    href: "/data-lab",
    hrefLabel: "Open the Data Lab",
  },
  {
    id: "lead",
    label: "Lead",
    description:
      "Communities, programmes and the work of helping technical teams do well.",
    capabilities: [
      "Technology communities",
      "Academic initiatives",
      "Mentorship",
      "Project leadership",
    ],
    href: "/leadership",
    hrefLabel: "See leadership",
  },
  {
    id: "explore",
    label: "Explore",
    description:
      "Research, prototypes, cloud work and technologies I am still learning.",
    capabilities: [
      "Research",
      "Experiments",
      "Cloud",
      "New technologies",
      "New ideas",
    ],
    href: "/build-lab",
    hrefLabel: "Open the Build Lab",
  },
];

interface WorkModeProps {
  projects: ProjectSummary[];
  leadership: LeadershipEntry[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export function WorkMode({ projects, leadership, loading, error, onRetry }: WorkModeProps) {
  const [active, setActive] = useState<WorkModeType>("build");
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const baseId = useId();
  const panelId = `${baseId}-panel`;
  const reduceMotion = useReducedMotion();

  const counts: Record<WorkModeType, number> = {
    build: projects.filter((project) => project.primary_mode === "build").length,
    data: projects.filter((project) => project.primary_mode === "data").length,
    lead: leadership.length,
    explore: projects.filter((project) => project.primary_mode === "explore").length,
  };

  const activeMode = MODES.find((mode) => mode.id === active) ?? MODES[0];
  const activeProjects = projects.filter((project) => project.primary_mode === active);

  const onTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const lastIndex = MODES.length - 1;
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight") nextIndex = index === lastIndex ? 0 : index + 1;
    if (event.key === "ArrowLeft") nextIndex = index === 0 ? lastIndex : index - 1;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = lastIndex;

    if (nextIndex !== null) {
      event.preventDefault();
      const nextMode = MODES[nextIndex];
      setActive(nextMode.id);
      tabRefs.current[nextMode.id]?.focus();
    }
  };

  return (
    <div className="mt-10">
      <div
        role="tablist"
        aria-label="Work modes"
        className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4"
      >
        {MODES.map((mode, index) => {
          const selected = mode.id === active;
          return (
            <button
              key={mode.id}
              ref={(node) => {
                tabRefs.current[mode.id] = node;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${mode.id}`}
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(mode.id)}
              onKeyDown={(event) => onTabKeyDown(event, index)}
              className={cn(
                "group relative flex min-h-24 flex-col items-start justify-between gap-4 p-4 text-left transition-colors sm:p-5",
                selected
                  ? "bg-surface-raised text-paper"
                  : "bg-background text-paper-dim hover:bg-surface",
              )}
            >
              <span className="type-meta text-faint">0{index + 1}</span>
              <span className="flex w-full items-end justify-between gap-2">
                <span className="text-xl font-medium uppercase tracking-[-0.02em] sm:text-2xl">
                  {mode.label}
                </span>
                <span
                  className={cn(
                    "type-meta tabular-nums",
                    selected ? "text-signal" : "text-faint",
                  )}
                >
                  {loading ? "..." : String(counts[mode.id]).padStart(2, "0")}
                </span>
              </span>
              {selected ? (
                <motion.span
                  layoutId="work-mode-active-indicator"
                  className="absolute inset-x-0 bottom-0 h-px bg-signal"
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  aria-hidden="true"
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${active}`}
        className="border-x border-b border-line"
      >
        <div className="grid gap-10 p-5 sm:p-8 lg:grid-cols-[1.45fr_1fr] lg:gap-14">
          <div>
            {loading ? <LoadingState rows={3} label="Loading work" /> : null}
            {!loading && error ? <ErrorState message={error} onRetry={onRetry} /> : null}

            {!loading && !error ? (
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={active}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                >
                  <p className="type-meta text-signal">{activeMode.label}</p>

                  <ul className="mt-5 grid gap-px border border-line bg-line sm:grid-cols-2">
                    {activeMode.capabilities.map((capability, index) => (
                      <li
                        key={capability}
                        className={cn(
                          "flex items-baseline gap-3 bg-background px-4 py-3.5",
                          activeMode.capabilities.length % 2 === 1 &&
                            index === activeMode.capabilities.length - 1 &&
                            "sm:col-span-2",
                        )}
                      >
                        <span className="font-mono text-[0.54rem] tracking-[0.1em] text-faint">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="text-sm text-paper-dim">{capability}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8">
                    <p className="type-meta text-muted">Related work</p>

                    {active === "lead" ? (
                      leadership.length > 0 ? (
                        <ul>
                          {leadership.map((entry) => (
                            <li key={entry.id}>
                              <Link
                                to="/leadership"
                                className="group flex flex-col gap-2 border-t border-line py-4 transition-colors hover:border-line-strong sm:flex-row sm:items-baseline sm:justify-between"
                              >
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-base font-medium text-paper group-hover:text-signal-soft">
                                      {entry.title}
                                    </span>
                                    {entry.is_placeholder ? (
                                      <Badge tone="placeholder">Not finished</Badge>
                                    ) : null}
                                  </div>
                                  <p className="type-meta mt-1 text-muted">
                                    {entry.organization}
                                  </p>
                                </div>
                                <ArrowUpRight
                                  className="size-4 shrink-0 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                                  aria-hidden="true"
                                />
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <EmptyState
                          className="mt-4 border-0 border-t border-dashed border-line bg-transparent p-0 pt-5"
                          title="No leadership entries yet"
                          description="Roles and contributions will appear here once they are added."
                          action={
                            <Link to="/leadership" className={buttonStyles("secondary", "sm")}>
                              View leadership page
                            </Link>
                          }
                        />
                      )
                    ) : activeProjects.length > 0 ? (
                      <ul>
                        {activeProjects.map((project) => (
                          <li key={project.id}>
                            <Link
                              to={`/work/${project.slug}`}
                              className="group flex flex-col gap-2 border-t border-line py-4 transition-colors hover:border-line-strong sm:flex-row sm:items-baseline sm:justify-between"
                            >
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-base font-medium tracking-tight text-paper group-hover:text-signal-soft">
                                    {project.title}
                                  </span>
                                  {project.is_placeholder ? (
                                    <Badge tone="placeholder">Not finished</Badge>
                                  ) : null}
                                </div>
                                <p className="type-meta mt-1 text-muted">
                                  {project.category.name}
                                </p>
                                {projectSummaryText(project) ? (
                                  <p className="mt-2 line-clamp-2 max-w-xl text-sm text-paper-dim">
                                    {projectSummaryText(project)}
                                  </p>
                                ) : null}
                              </div>
                              <ArrowUpRight
                                className="size-4 shrink-0 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                                aria-hidden="true"
                              />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <EmptyState
                        className="mt-4 border-0 border-t border-dashed border-line bg-transparent p-0 pt-5"
                        title={
                          active === "data"
                            ? "No data projects yet"
                            : "No builds yet"
                        }
                        description={
                          active === "data"
                            ? "Data projects will appear here once the first one is published."
                            : "Prototypes and technical experiments will appear here."
                        }
                        action={
                          <Link to={activeMode.href} className={buttonStyles("secondary", "sm")}>
                            Visit {active === "data" ? "Data Lab" : "Build Lab"}
                          </Link>
                        }
                      />
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            ) : null}
          </div>

          <aside className="flex flex-col justify-between gap-8 border-t border-line pt-6 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
            <div>
              <p className="type-meta text-muted">About this work</p>
              <p className="mt-4 text-pretty text-sm leading-relaxed text-paper-dim">
                {activeMode.description}
              </p>
              <p className="mt-6 type-meta text-faint">
                {loading ? "..." : `${String(counts[active]).padStart(2, "0")} related items`}
              </p>
            </div>
            <Link
              to={activeMode.href}
              className="inline-flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-paper transition-colors hover:text-signal"
            >
              {activeMode.hrefLabel}
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}
