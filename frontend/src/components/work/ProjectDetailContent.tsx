import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Code2,
  Download,
  ExternalLink,
  FileText,
  GitBranch,
  Globe,
  Layers,
  Play,
  Sparkles,
  Star,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { PageIntro } from "@/components/layout/PageIntro";
import { PortfolioImage } from "@/components/media/PortfolioImage";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { HomepagePreview, hasHomepagePreview } from "@/components/work/HomepagePreview";
import { LiveProjectPreview } from "@/components/work/LiveProjectPreview";
import { ProjectCard } from "@/components/work/project-card";
import { ProjectGallery } from "@/components/work/ProjectGallery";
import { ProjectStatus } from "@/components/work/project-status";
import type { CaseStudyDetail, ProjectDetail } from "@/types/api";
import { cn } from "@/utils/cn";
import { groupTechnologies } from "@/utils/projects";

const DEPLOYMENT_LABELS: Record<string, string> = {
  not_deployed: "Not deployed",
  deploying: "Deploying",
  live: "Live",
  failed: "Failed",
  offline: "Offline",
};

function hasText(value: string | null | undefined): value is string {
  return Boolean(value && value.trim());
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

function Section({
  id,
  label,
  children,
  meta,
}: {
  id: string;
  label: string;
  children: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="scroll-mt-28 border-t border-line pt-8"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2
          id={`${id}-heading`}
          className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted"
        >
          {label}
        </h2>
        {meta}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function MetaItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-[0.56rem] uppercase tracking-[0.18em] text-muted">
        {label}
      </dt>
      <dd className="mt-2 text-sm text-paper">{children}</dd>
    </div>
  );
}

function formatDate(value: string | null): string {
  if (!value) return "Not recorded";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface ActionLink {
  href: string;
  label: string;
  icon: typeof Globe;
  primary?: boolean;
}

function projectActions(project: ProjectDetail): ActionLink[] {
  const live =
    project.deployment_url || project.live_url || project.demo_url || null;
  const actions: ActionLink[] = [];
  if (live) actions.push({ href: live, label: "Live website", icon: Globe, primary: true });
  if (project.github_url || project.repository_url) {
    actions.push({
      href: (project.github_url || project.repository_url) as string,
      label: "GitHub repository",
      icon: GitBranch,
    });
  }
  if (project.documentation_url) {
    actions.push({
      href: project.documentation_url,
      label: "Documentation",
      icon: FileText,
    });
  }
  if (project.video_url) {
    actions.push({ href: project.video_url, label: "Watch video", icon: Play });
  }
  if (project.download_url) {
    actions.push({ href: project.download_url, label: "Download", icon: Download });
  }
  if (project.external_project_url || project.external_url) {
    actions.push({
      href: (project.external_project_url || project.external_url) as string,
      label: "External link",
      icon: ExternalLink,
    });
  }
  return actions;
}

interface NarrativeSection {
  id: string;
  label: string;
  text: string | null;
}

function narrativeSections(study: CaseStudyDetail | null): NarrativeSection[] {
  if (!study) return [];
  const hidden = new Set(study.hidden_sections ?? []);
  const sections: NarrativeSection[] = [
    { id: "problem", label: "The problem", text: study.problem },
    { id: "context", label: "Context", text: study.context },
    { id: "goals", label: "Goals", text: study.goals },
    { id: "idea", label: "Approach", text: study.idea },
    { id: "research", label: "Research and planning", text: study.research ?? study.planning },
    { id: "design", label: "Design", text: study.design },
    { id: "solution", label: "Solution", text: study.solution },
    { id: "key_features", label: "Key features", text: study.key_features },
    { id: "implementation", label: "Implementation", text: study.implementation },
    { id: "challenges", label: "Challenges", text: study.challenges },
    { id: "technical_decisions", label: "Technical decisions", text: study.technical_decisions },
    { id: "testing", label: "Testing", text: study.testing },
    { id: "results", label: "Results", text: study.results },
    { id: "lessons", label: "Lessons learned", text: study.lessons },
    { id: "future_improvements", label: "Future improvements", text: study.future_improvements },
  ];
  return sections.filter((section) => hasText(section.text) && !hidden.has(section.id));
}

function GitHubMeta({ project }: { project: ProjectDetail }) {
  const hasMeta =
    project.github_stars !== null ||
    project.github_forks !== null ||
    project.github_language ||
    project.github_open_issues !== null;
  if (!hasMeta) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border border-line bg-ink-800/30 px-4 py-3 font-mono text-[0.56rem] uppercase tracking-[0.12em] text-muted">
      <span className="inline-flex items-center gap-1.5">
        <Star className="size-3 text-signal" aria-hidden="true" />
        {project.github_stars ?? 0} stars
      </span>
      <span className="inline-flex items-center gap-1.5">
        <GitBranch className="size-3 text-signal" aria-hidden="true" />
        {project.github_forks ?? 0} forks
      </span>
      {project.github_open_issues !== null ? (
        <span>{project.github_open_issues} open issues</span>
      ) : null}
      {project.github_language ? <span>{project.github_language}</span> : null}
      <span className="ml-auto normal-case tracking-normal text-faint">
        From GitHub
        {project.github_metadata_checked_at
          ? ` · checked ${formatDate(project.github_metadata_checked_at)}`
          : ""}
      </span>
    </div>
  );
}

interface ProjectDetailContentProps {
  data: ProjectDetail;
  backTo?: string;
  backLabel?: string;
  basePath?: string;
  preview?: boolean;
}

export function ProjectDetailContent({
  data,
  backTo = "/work",
  backLabel = "Back to projects",
  basePath = "/work",
  preview = false,
}: ProjectDetailContentProps) {
  const diagrams = data.media.filter((item) => item.media_type === "diagram");
  const gallery = data.media.filter(
    (item) =>
      item.media_type !== "diagram" &&
      !(data.cover_image_url && item.url === data.cover_image_url),
  );
  const techGroups = groupTechnologies(data.technologies);
  const study = data.case_study;
  const actions = projectActions(data);
  const previewUrl = data.deployment_url || data.demo_url || data.live_url || null;
  const hasPreviewImage = hasHomepagePreview(data);
  const verifiedHomepage = data.preview_source_url || previewUrl;
  const narrative = narrativeSections(study);
  const overview = (hasText(study?.overview) ? study?.overview : data.body) ?? null;
  const architectureText = hasText(study?.architecture) ? study?.architecture : null;
  const resultsMeta = study?.result_type ? (
    <span className="border border-line px-2 py-1 font-mono text-[0.52rem] uppercase tracking-[0.12em] text-muted">
      {study.result_type}
    </span>
  ) : null;

  return (
    <>
      <PageIntro
        eyebrow={`Project / ${data.category.name}`}
        title={data.title}
        description={data.summary ?? undefined}
        aside={
          <div className="border-t border-line pt-4">
            <ProjectStatus status={data.project_status} />
            <div className="mt-3 flex items-center justify-between gap-4 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted">
              <span>{data.year ?? data.published_at?.slice(0, 4) ?? "No year"}</span>
              <span>
                {preview ? "Preview" : data.is_placeholder ? "Draft" : "Published"}
              </span>
            </div>
            {data.deployment_status !== "not_deployed" ? (
              <div className="mt-3 flex items-center justify-between gap-4 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted">
                <span>Hosting</span>
                <span
                  className={cn(
                    data.deployment_status === "live"
                      ? "text-success"
                      : data.deployment_status === "failed" ||
                          data.deployment_status === "offline"
                        ? "text-warning"
                        : "text-paper",
                  )}
                >
                  {DEPLOYMENT_LABELS[data.deployment_status] ?? data.deployment_status}
                </span>
              </div>
            ) : null}
          </div>
        }
      />

      <Container className="py-10 sm:py-14">
        <Link
          to={backTo}
          className="inline-flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted transition-colors hover:text-paper"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          {backLabel}
        </Link>

        <article className="mt-8">
          {hasPreviewImage ? (
            <HomepagePreview project={data} priority />
          ) : verifiedHomepage ? (
            <HomepagePreview project={data} />
          ) : data.cover_image_url ? (
            <figure className="overflow-hidden border border-line bg-surface">
              <PortfolioImage
                src={data.cover_image_url}
                alt={`${data.title} project cover`}
                aspect="auto"
                priority
                sizes="(max-width: 1024px) 100vw, 70vw"
                imageClassName="max-h-[38rem]"
              />
            </figure>
          ) : null}

          <div className="mt-8 flex flex-col gap-5 border-y border-line py-6 lg:flex-row lg:items-center lg:justify-between">
            <dl className="grid flex-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <MetaItem label="Category">
                <span>{data.category.name}</span>
                {data.secondary_categories.length > 0 ? (
                  <span className="mt-1 block text-xs text-muted">
                    {data.secondary_categories.map((item) => item.name).join(" · ")}
                  </span>
                ) : null}
              </MetaItem>
              <MetaItem label="Year">
                {data.year ??
                  (data.published_at
                    ? `${new Date(data.published_at).getFullYear()} (published)`
                    : "Not recorded")}
              </MetaItem>
              <MetaItem label="Role">{data.role ?? "Not recorded"}</MetaItem>
              <MetaItem label="Status">
                <ProjectStatus status={data.project_status} />
              </MetaItem>
            </dl>
            {actions.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {actions.map((link) => (
                  <li key={`${link.label}-${link.href}`}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className={buttonStyles(link.primary ? "primary" : "secondary", "sm")}
                    >
                      <link.icon className="size-3.5" aria-hidden="true" />
                      {link.label}
                      <ArrowUpRight className="size-3" aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {data.is_placeholder ? (
            <div className="mt-8 border border-signal/30 bg-signal/5 p-5 sm:p-6">
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-signal">
                This page is not finished
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-paper-dim">
                Some details are still being added. Sections without confirmed information are
                hidden until they are ready.
              </p>
            </div>
          ) : null}

          <div className="mt-12 space-y-12">
            {hasText(overview) ? (
              <Section id="overview" label="Overview">
                <Paragraphs text={overview} />
              </Section>
            ) : null}

            {previewUrl && data.embed_enabled && !hasPreviewImage ? (
              <Section
                id="live-preview"
                label="Live preview"
                meta={
                  data.last_verified_at ? (
                    <span className="font-mono text-[0.54rem] uppercase tracking-[0.12em] text-faint">
                      Last verified {formatDate(data.last_verified_at)}
                    </span>
                  ) : null
                }
              >
                <LiveProjectPreview
                  url={previewUrl}
                  title={data.title}
                  embedEnabled={data.embed_enabled}
                  deploymentStatus={data.deployment_status}
                />
              </Section>
            ) : null}

            {narrative
              .filter((section) => ["problem", "context", "goals", "idea"].includes(section.id))
              .map((section) => (
                <Section key={section.id} id={section.id} label={section.label}>
                  <Paragraphs text={section.text as string} />
                </Section>
              ))}

            {hasText(architectureText) || diagrams.length > 0 ? (
              <Section id="architecture" label="Architecture">
                <div className="space-y-6">
                  {architectureText ? <Paragraphs text={architectureText} /> : null}
                  {diagrams.map((media) => (
                    <figure key={media.id} className="border border-line bg-ink-800/40">
                      {media.media_type === "video" ? (
                        <video
                          src={media.url}
                          controls
                          playsInline
                          preload="metadata"
                          aria-label={media.alt_text}
                          className="w-full"
                        />
                      ) : (
                        <PortfolioImage
                          src={media.url}
                          alt={media.alt_text}
                          aspect="auto"
                          sizes="(max-width: 1024px) 100vw, 70vw"
                        />
                      )}
                      {media.caption ? (
                        <figcaption className="border-t border-line px-4 py-3 text-xs leading-relaxed text-muted">
                          {media.caption}
                        </figcaption>
                      ) : null}
                    </figure>
                  ))}
                </div>
              </Section>
            ) : null}

            {narrative
              .filter((section) =>
                [
                  "research",
                  "design",
                  "solution",
                  "key_features",
                  "implementation",
                  "challenges",
                  "technical_decisions",
                  "testing",
                  "results",
                  "lessons",
                  "future_improvements",
                ].includes(section.id),
              )
              .map((section) => (
                <Section
                  key={section.id}
                  id={section.id}
                  label={section.label}
                  meta={section.id === "results" ? resultsMeta : undefined}
                >
                  <Paragraphs text={section.text as string} />
                </Section>
              ))}

            {gallery.length > 0 ? (
              <Section id="gallery" label="Screenshots and files">
                <ProjectGallery media={gallery} />
              </Section>
            ) : null}

            {techGroups.length > 0 ? (
              <Section id="technology" label="Technologies">
                <div
                  className={`grid gap-px border border-line bg-line sm:grid-cols-2 ${
                    techGroups.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"
                  }`}
                >
                  {techGroups.map((group) => (
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
                      <ul className="mt-4 space-y-2">
                        {group.items.map((technology) => (
                          <li key={technology.id} className="text-sm text-paper">
                            {technology.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <GitHubMeta project={data} />
              </Section>
            ) : (
              <GitHubMeta project={data} />
            )}

            {data.case_study_slug && !study ? (
              <Section id="case-study" label="Case study">
                <div className="flex flex-col items-start gap-5 border border-line bg-ink-800/30 p-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <FileText className="mt-1 size-5 text-signal" aria-hidden="true" />
                    <div>
                      <p className="font-medium text-paper">
                        There is a full case study for this project
                      </p>
                      <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
                        The problem, context, decisions, architecture, implementation and what
                        changed.
                      </p>
                    </div>
                  </div>
                  <Link
                    to={`/case-studies/${data.case_study_slug}`}
                    className={buttonStyles("secondary", "sm", "shrink-0")}
                  >
                    Read the case study
                    <ArrowUpRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </Section>
            ) : null}

            {data.case_study_slug && study && narrative.length > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
                <p className="inline-flex items-center gap-2 text-sm text-muted">
                  <Sparkles className="size-4 text-signal" aria-hidden="true" />
                  This project also has a case study.
                </p>
                <Link
                  to={`/case-studies/${data.case_study_slug}`}
                  className={buttonStyles("secondary", "sm")}
                >
                  Read the case study
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </Link>
              </div>
            ) : null}
          </div>

          {data.related.length > 0 ? (
            <section
              className="mt-16 border-t border-line pt-10"
              aria-labelledby="related-heading"
            >
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted">
                    Related
                  </p>
                  <h2
                    id="related-heading"
                    className="mt-3 text-2xl font-medium tracking-tight text-paper sm:text-3xl"
                  >
                    Related projects
                  </h2>
                </div>
                <Link
                  to={basePath}
                  className="hidden items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted transition-colors hover:text-paper sm:inline-flex"
                >
                  All projects
                  <ArrowUpRight className="size-3" aria-hidden="true" />
                </Link>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {data.related.map((related, index) => (
                  <ProjectCard key={related.id} project={related} index={index + 1} />
                ))}
              </div>
            </section>
          ) : null}

          {(data.previous || data.next) && (
            <nav
              aria-label="Previous and next project"
              className="mt-16 grid border-t border-line pt-6 sm:grid-cols-2"
            >
              {data.previous ? (
                <Link
                  to={`${basePath}/${data.previous.slug}`}
                  className="group flex flex-col gap-2 border-b border-line py-4 pr-6 sm:border-b-0"
                >
                  <span className="inline-flex items-center gap-2 font-mono text-[0.56rem] uppercase tracking-[0.16em] text-muted">
                    <ArrowLeft className="size-3.5" aria-hidden="true" />
                    Previous project
                  </span>
                  <span className="text-lg font-medium tracking-tight text-paper transition-colors group-hover:text-signal-soft">
                    {data.previous.title}
                  </span>
                </Link>
              ) : (
                <span aria-hidden="true" />
              )}
              {data.next ? (
                <Link
                  to={`${basePath}/${data.next.slug}`}
                  className="group flex flex-col gap-2 py-4 sm:items-end sm:text-right"
                >
                  <span className="inline-flex items-center gap-2 font-mono text-[0.56rem] uppercase tracking-[0.16em] text-muted">
                    Next project
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </span>
                  <span className="text-lg font-medium tracking-tight text-paper transition-colors group-hover:text-signal-soft">
                    {data.next.title}
                  </span>
                </Link>
              ) : null}
            </nav>
          )}
        </article>
      </Container>
    </>
  );
}
