import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Code2,
  Download,
  ExternalLink,
  FileText,
  Globe,
  Layers,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { PageIntro } from "@/components/layout/PageIntro";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/states";
import { ProjectCard } from "@/components/work/project-card";
import { ProjectStatus } from "@/components/work/project-status";
import type { ProjectDetail, ProjectMedia } from "@/types/api";
import { groupTechnologies } from "@/utils/projects";

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
  className,
}: {
  id: string;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className={`scroll-mt-28 border-t border-line pt-8 ${className ?? ""}`}
    >
      <h2
        id={`${id}-heading`}
        className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted"
      >
        {label}
      </h2>
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

function ProjectLinks({ project }: { project: ProjectDetail }) {
  const links = [
    project.live_url
      ? { href: project.live_url, label: "Live demo", icon: Globe }
      : null,
    project.repository_url
      ? { href: project.repository_url, label: "GitHub", icon: Code2 }
      : null,
    project.documentation_url
      ? { href: project.documentation_url, label: "Documentation", icon: FileText }
      : null,
    project.download_url
      ? { href: project.download_url, label: "Download", icon: Download }
      : null,
    project.external_url
      ? { href: project.external_url, label: "External resource", icon: ExternalLink }
      : null,
  ].filter(Boolean) as Array<{ href: string; label: string; icon: typeof Globe }>;

  if (links.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-2">
      {links.map((link) => (
        <li key={link.label}>
          <a
            href={link.href}
            target="_blank"
            rel="noreferrer noopener"
            className={buttonStyles("secondary", "sm")}
          >
            <link.icon className="size-3.5" aria-hidden="true" />
            {link.label}
            <ArrowUpRight className="size-3" aria-hidden="true" />
          </a>
        </li>
      ))}
    </ul>
  );
}

function MediaFigure({ media, eager = false }: { media: ProjectMedia; eager?: boolean }) {
  return (
    <figure className="border border-line bg-ink-800/40">
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
        <img
          src={media.url}
          alt={media.alt_text}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          className="w-full"
        />
      )}
      {media.caption ? (
        <figcaption className="border-t border-line px-4 py-3 text-xs leading-relaxed text-muted">
          {media.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

interface ProjectDetailContentProps {
  data: ProjectDetail;
  backTo?: string;
  backLabel?: string;
  preview?: boolean;
}

export function ProjectDetailContent({
  data,
  backTo = "/work",
  backLabel = "Back to work",
  preview = false,
}: ProjectDetailContentProps) {
  const diagrams = data.media.filter((item) => item.media_type === "diagram");
  const gallery = data.media.filter(
    (item) =>
      item.media_type !== "diagram" &&
      !(data.cover_image_url && item.url === data.cover_image_url),
  );
  const techGroups = groupTechnologies(data.technologies);

  return (
    <>
      <PageIntro
        eyebrow={`Work / ${data.category.name}`}
        title={data.title}
        description={data.summary ?? undefined}
        aside={
          <div className="border-t border-line pt-4">
            <ProjectStatus status={data.project_status} />
            <div className="mt-3 flex items-center justify-between gap-4 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted">
              <span>{data.year ?? data.published_at?.slice(0, 4) ?? "Not recorded"}</span>
              <span>
                {preview ? "Preview" : data.is_placeholder ? "Draft content" : "Published"}
              </span>
            </div>
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
          {data.cover_image_url ? (
            <figure className="overflow-hidden border border-line bg-surface">
              <img
                src={data.cover_image_url}
                alt={`${data.title} project cover`}
                loading="eager"
                decoding="async"
                className="max-h-[38rem] w-full object-cover"
              />
            </figure>
          ) : null}

          <dl className="mt-8 grid gap-6 border-y border-line py-6 sm:grid-cols-2 lg:grid-cols-4">
            <MetaItem label="Discipline">
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

          <div className="mt-6 flex flex-col gap-4 border-b border-line pb-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="font-mono text-[0.56rem] uppercase tracking-[0.18em] text-muted">
                Stack
              </span>
              {data.technologies.length > 0 ? (
                data.technologies.map((technology) => (
                  <span
                    key={technology.id}
                    className="border border-line px-2 py-1 font-mono text-[0.56rem] uppercase tracking-[0.1em] text-paper-dim"
                  >
                    {technology.name}
                  </span>
                ))
              ) : (
                <span className="text-sm text-muted">Not documented yet</span>
              )}
            </div>
            <ProjectLinks project={data} />
          </div>

          {data.is_placeholder ? (
            <div className="mt-8 border border-signal/30 bg-signal/5 p-5 sm:p-6">
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-signal">
                Record still being written
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-paper-dim">
                The structure, link slots, and media system are live. The summary and
                technical details will be replaced with verified project information from
                the admin panel.
              </p>
            </div>
          ) : null}

          <div className="mt-12 space-y-12">
            <Section id="overview" label="Overview">
              {data.body ? (
                <Paragraphs text={data.body} />
              ) : (
                <EmptyState
                  title="Overview pending"
                  description="There is no long-form project description yet. The case-study system is ready for the real problem, decisions, and results."
                />
              )}
            </Section>

            {diagrams.length > 0 ? (
              <Section id="architecture" label="Architecture">
                <div className="space-y-6">
                  {diagrams.map((media) => (
                    <MediaFigure key={media.id} media={media} />
                  ))}
                </div>
              </Section>
            ) : null}

            {gallery.length > 0 ? (
              <Section id="gallery" label="Screens and artefacts">
                <div className="grid gap-5 md:grid-cols-2">
                  {gallery.map((media) => (
                    <MediaFigure key={media.id} media={media} />
                  ))}
                </div>
              </Section>
            ) : null}

            {techGroups.length > 0 ? (
              <Section id="technology" label="Technology">
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
              </Section>
            ) : null}

            <Section id="case-study" label="Case study">
              {data.case_study_slug ? (
                <div className="flex flex-col items-start gap-5 border border-line bg-ink-800/30 p-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <FileText className="mt-1 size-5 text-signal" aria-hidden="true" />
                    <div>
                      <p className="font-medium text-paper">
                        The longer engineering story is available
                      </p>
                      <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
                        Problem, context, decisions, architecture, implementation, and what
                        changed.
                      </p>
                    </div>
                  </div>
                  <Link
                    to={`/case-studies/${data.case_study_slug}`}
                    className={buttonStyles("secondary", "sm", "shrink-0")}
                  >
                    Read case study
                    <ArrowUpRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </div>
              ) : (
                <p className="max-w-2xl text-sm leading-relaxed text-muted">
                  No case study has been published for this project yet. The long-form
                  record appears here once it is written and published.
                </p>
              )}
            </Section>
          </div>

          {data.related.length > 0 ? (
            <section
              className="mt-16 border-t border-line pt-10"
              aria-labelledby="related-heading"
            >
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted">
                    More work
                  </p>
                  <h2
                    id="related-heading"
                    className="mt-3 text-2xl font-medium tracking-tight text-paper sm:text-3xl"
                  >
                    Related projects
                  </h2>
                </div>
                <Link
                  to="/work"
                  className="hidden items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted transition-colors hover:text-paper sm:inline-flex"
                >
                  Full index
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
                  to={`/work/${data.previous.slug}`}
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
                  to={`/work/${data.next.slug}`}
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
