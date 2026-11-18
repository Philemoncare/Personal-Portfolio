import { ArrowLeft, ArrowUpRight, Boxes, Code2, Globe, Layers } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { PageIntro } from "@/components/layout/PageIntro";
import { PortfolioImage } from "@/components/media/PortfolioImage";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useApiResource } from "@/hooks/useApiResource";
import { useSeo } from "@/hooks/useSeo";
import type {
  CaseStudyDetail,
  CaseStudySectionKey,
  ProjectDetail,
  ProjectMedia,
  Technology,
} from "@/types/api";
import { groupTechnologies } from "@/utils/projects";

const SECTIONS: Array<{ key: CaseStudySectionKey; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "problem", label: "Problem" },
  { key: "context", label: "Context" },
  { key: "goals", label: "Goals" },
  { key: "research", label: "Research" },
  { key: "planning", label: "Planning" },
  { key: "architecture", label: "Architecture" },
  { key: "design", label: "Design" },
  { key: "implementation", label: "Implementation" },
  { key: "challenges", label: "Challenges" },
  { key: "technical_decisions", label: "Technical decisions" },
  { key: "testing", label: "Testing" },
  { key: "results", label: "Results" },
  { key: "lessons", label: "Lessons learned" },
  { key: "future_improvements", label: "Future improvements" },
  { key: "idea", label: "The idea" },
  { key: "solution", label: "Solution" },
  { key: "role", label: "My role" },
  { key: "technology", label: "Technology" },
  { key: "key_features", label: "Key features" },
];

const RESULT_TYPE_LABELS: Record<string, string> = {
  text: "Outcome",
  metric: "Metric",
  achievement: "Achievement",
  technical: "Technical outcome",
  qualitative: "Qualitative outcome",
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function Paragraphs({ text }: { text: string }) {
  return (
    <div className="prose-copy">
      {text
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
        .map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
    </div>
  );
}

function ChallengeBlocks({ text }: { text: string }) {
  const parts = text.split(/\n(?=(?:CHALLENGE|APPROACH|OUTCOME)\b)/i);
  const parsed = parts
    .map((part) => {
      const match = part.match(/^(CHALLENGE|APPROACH|OUTCOME)\s*:?\s*([\s\S]*)$/i);
      if (!match) return null;
      return { label: match[1].toUpperCase(), body: match[2].trim() };
    })
    .filter(Boolean) as Array<{ label: string; body: string }>;

  if (parsed.length < 2) return <Paragraphs text={text} />;

  return (
    <div className="divide-y divide-line border border-line">
      {parsed.map((part) => (
        <div key={part.label} className="grid gap-2 p-5 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-6">
          <span className="font-mono text-[0.56rem] uppercase tracking-[0.18em] text-signal">
            {part.label}
          </span>
          <div className="prose-copy">
            {part.body.split(/\n{2,}/).map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Diagram({ media }: { media: ProjectMedia }) {
  return (
    <figure className="border border-line bg-ink-800/40">
      <PortfolioImage
        src={media.url}
        alt={media.alt_text}
        aspect="auto"
        sizes="(max-width: 1024px) 100vw, 70vw"
      />
      {media.caption ? (
        <figcaption className="border-t border-line px-4 py-3 text-xs leading-relaxed text-muted">
          {media.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

function TechStack({ technologies }: { technologies: Technology[] }) {
  const groups = groupTechnologies(technologies);
  if (groups.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-muted">
        The technology stack has not been documented for this project yet.
      </p>
    );
  }
  return (
    <div
      className={`grid gap-px border border-line bg-line sm:grid-cols-2 ${
        groups.length >= 3 ? "lg:grid-cols-3" : ""
      }`}
    >
      {groups.map((group) => (
        <div key={group.label} className="bg-ink-900 p-5">
          <div className="flex items-center gap-2">
            {group.label === "Frontend" ? (
              <Layers className="size-3.5 text-signal" aria-hidden="true" />
            ) : group.label === "Backend" ? (
              <Code2 className="size-3.5 text-signal" aria-hidden="true" />
            ) : group.label === "Database" ? (
              <Boxes className="size-3.5 text-signal" aria-hidden="true" />
            ) : (
              <Globe className="size-3.5 text-signal" aria-hidden="true" />
            )}
            <h3 className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-muted">
              {group.label}
            </h3>
          </div>
          <ul className="mt-4 flex flex-wrap gap-x-3 gap-y-2">
            {group.items.map((technology) => (
              <li key={technology.id} className="text-sm text-paper">
                {technology.name}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function CaseStudyPage() {
  const { slug } = useParams<{ slug: string }>();
  const study = useApiResource<CaseStudyDetail>(
    slug ? `/api/v1/case-studies/${encodeURIComponent(slug)}` : null,
  );
  const project = useApiResource<ProjectDetail>(
    study.data?.project_slug
      ? `/api/v1/projects/${encodeURIComponent(study.data.project_slug)}`
      : null,
  );

  const data = study.data;
  const projectData = project.data;

  useSeo({
    title: data ? `${data.title} — Case study | Philemon Melabah` : "Case study — Philemon Melabah",
    description: data?.summary ?? "Engineering and product case study.",
    path: slug ? `/case-studies/${slug}` : undefined,
    type: "article",
    image: projectData?.cover_image_url ?? null,
    imageAlt: projectData ? `${projectData.title} project cover` : null,
  });

  const hidden = new Set(data?.hidden_sections ?? []);
  const diagrams =
    projectData?.media.filter((item) => item.media_type === "diagram") ?? [];

  const visibleSections = data
    ? SECTIONS.filter((section) => {
        if (hidden.has(section.key)) return false;
        const value = data[section.key];
        const hasText = typeof value === "string" && value.trim().length > 0;
        if (section.key === "architecture") return hasText || diagrams.length > 0;
        if (section.key === "technology") {
          return hasText || (projectData?.technologies.length ?? 0) > 0;
        }
        return hasText;
      })
    : [];

  return (
    <>
      <PageIntro
        eyebrow={projectData ? `Case study / ${projectData.title}` : "Case study"}
        title={data?.title ?? (study.loading ? "Loading case study…" : "Case study")}
        description={data?.summary ?? undefined}
        aside={
          data ? (
            <div className="flex flex-wrap gap-2">
              <Badge tone="outline">Case study</Badge>
              {data.result_type ? (
                <Badge tone="muted">
                  {RESULT_TYPE_LABELS[data.result_type] ?? data.result_type}
                </Badge>
              ) : null}
              {data.is_placeholder ? <Badge tone="placeholder">In progress</Badge> : null}
            </div>
          ) : null
        }
      />

      <Container className="py-10 sm:py-14">
        <div className="flex flex-wrap items-center gap-5">
          <Link
            to={data?.project_slug ? `/work/${data.project_slug}` : "/work"}
            className="inline-flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted transition-colors hover:text-paper"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            {data?.project_slug ? "Back to project" : "Back to work"}
          </Link>
        </div>

        {study.loading ? (
          <div className="mt-10">
            <LoadingState rows={5} label="Loading case study" />
          </div>
        ) : null}

        {!study.loading && study.error ? (
          <div className="mt-10">
            {study.error.status === 404 ? (
              <EmptyState
                title="Case study not found"
                description="This case study may be unpublished or the URL may be incorrect."
                action={
                  <Link to="/work" className={buttonStyles("secondary", "sm")}>
                    Back to work
                  </Link>
                }
              />
            ) : (
              <ErrorState
                message="This case study could not be loaded. The API may be unavailable — try again in a moment."
                onRetry={study.reload}
              />
            )}
          </div>
        ) : null}

        {!study.loading && !study.error && data ? (
          <div className="mt-10 grid gap-10 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-16">
            <aside className="h-fit lg:sticky lg:top-24">
              <p className="font-mono text-[0.56rem] uppercase tracking-[0.2em] text-muted">
                Contents
              </p>
              {visibleSections.length > 0 ? (
                <nav aria-label="Case study contents" className="mt-4">
                  <ol className="space-y-2">
                    {visibleSections.map((section, index) => (
                      <li key={section.key}>
                        <a
                          href={`#${slugify(section.label)}`}
                          className="group flex items-baseline gap-3 text-sm text-muted transition-colors hover:text-paper"
                        >
                          <span className="font-mono text-[0.54rem] tabular-nums text-faint">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          {section.label}
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
              ) : (
                <p className="mt-4 text-sm leading-relaxed text-muted">
                  Sections appear as the study is written.
                </p>
              )}

              {data.project_slug ? (
                <Link
                  to={`/work/${data.project_slug}`}
                  className="mt-8 inline-flex items-center gap-2 border-t border-line pt-4 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-paper-dim hover:text-paper"
                >
                  Project record
                  <ArrowUpRight className="size-3" aria-hidden="true" />
                </Link>
              ) : null}
            </aside>

            <article className="min-w-0">
              {data.is_placeholder ? (
                <div className="mb-10 border border-signal/30 bg-signal/5 p-5 sm:p-6">
                  <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-signal">
                    Case study in progress
                  </p>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-paper-dim">
                    The case-study structure is live. Sections will appear here only when
                    real, verified content has been added from the admin editor.
                  </p>
                </div>
              ) : null}

              {visibleSections.length === 0 ? (
                <EmptyState
                  title="Case study write-up pending"
                  description="No sections have been published yet. The structure is ready for the full engineering narrative."
                />
              ) : (
                <div className="space-y-12">
                  {visibleSections.map((section, index) => {
                    const text = data[section.key];
                    const isResults = section.key === "results";
                    return (
                      <section
                        key={section.key}
                        id={slugify(section.label)}
                        aria-labelledby={`${section.key}-heading`}
                        className="scroll-mt-28 border-t border-line pt-8 first:border-t-0 first:pt-0"
                      >
                        <div className="flex flex-wrap items-baseline gap-4">
                          <span className="font-mono text-[0.56rem] tabular-nums text-signal">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <h2
                            id={`${section.key}-heading`}
                            className="text-2xl font-medium tracking-[-0.03em] text-paper sm:text-3xl"
                          >
                            {section.label}
                          </h2>
                          {isResults && data.result_type ? (
                            <Badge tone="muted">
                              {RESULT_TYPE_LABELS[data.result_type] ?? data.result_type}
                            </Badge>
                          ) : null}
                        </div>

                        <div className="mt-5">
                          {section.key === "challenges" && text ? (
                            <ChallengeBlocks text={text} />
                          ) : text ? (
                            <Paragraphs text={text} />
                          ) : null}

                          {section.key === "architecture" && diagrams.length > 0 ? (
                            <div className="mt-7 space-y-6">
                              {diagrams.map((media) => (
                                <Diagram key={media.id} media={media} />
                              ))}
                            </div>
                          ) : null}

                          {section.key === "technology" && projectData ? (
                            <div className="mt-7">
                              <TechStack technologies={projectData.technologies} />
                            </div>
                          ) : null}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}

              <div className="mt-14 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-faint">
                  {data.is_placeholder ? "Draft content / pending verification" : "Published case study"}
                </p>
                <Link
                  to={data.project_slug ? `/work/${data.project_slug}` : "/work"}
                  className={buttonStyles("secondary", "sm")}
                >
                  <ArrowLeft className="size-3.5" aria-hidden="true" />
                  {data.project_slug ? "Back to project" : "Back to work"}
                </Link>
              </div>
            </article>
          </div>
        ) : null}
      </Container>
    </>
  );
}
