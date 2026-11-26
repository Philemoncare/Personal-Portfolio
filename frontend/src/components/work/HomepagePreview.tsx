import { ArrowUpRight, Globe } from "lucide-react";

import type { ProjectSummary } from "@/types/api";
import { cn } from "@/utils/cn";

type PreviewProject = Pick<
  ProjectSummary,
  | "title"
  | "preview_image"
  | "preview_status"
  | "preview_source_url"
  | "live_url"
>;

export function hasHomepagePreview(project: PreviewProject): boolean {
  return project.preview_status === "generated" && Boolean(project.preview_image);
}

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

/**
 * The verified homepage screenshot captured by the backend browser runner.
 *
 * When no genuine capture exists this renders an honest unavailable state and
 * links to the verified live site - it never falls back to a repository image.
 */
export function HomepagePreview({
  project,
  className,
  priority = false,
  interactive = true,
}: {
  project: PreviewProject;
  className?: string;
  priority?: boolean;
  interactive?: boolean;
}) {
  const liveUrl = project.preview_source_url || project.live_url;
  const host = hostOf(liveUrl);

  if (hasHomepagePreview(project)) {
    const image = (
      <img
        src={project.preview_image ?? undefined}
        alt={`Captured homepage of ${project.title}`}
        loading={priority ? "eager" : "lazy"}
        className="aspect-[16/10] w-full bg-ink object-cover object-top"
      />
    );
    return (
      <figure className={cn("relative overflow-hidden border border-line bg-ink", className)}>
        {liveUrl && interactive ? (
          <a
            href={liveUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="group/shot block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
            aria-label={`Open the live website for ${project.title}`}
          >
            {image}
            <span
              className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-line-strong"
              aria-hidden="true"
            />
            <span className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1.5 border border-line-strong bg-background/90 px-2 py-1 font-mono text-[0.52rem] uppercase tracking-[0.12em] text-paper opacity-0 transition-opacity group-hover/shot:opacity-100">
              Open live site
              <ArrowUpRight className="size-3" aria-hidden="true" />
            </span>
          </a>
        ) : (
          image
        )}
        {host ? (
          <figcaption className="flex items-center gap-2 border-t border-line px-4 py-2.5 font-mono text-[0.52rem] uppercase tracking-[0.12em] text-muted">
            <Globe className="size-3 text-signal" aria-hidden="true" />
            Captured homepage · {host}
          </figcaption>
        ) : null}
      </figure>
    );
  }

  return (
    <div
      className={cn(
        "flex aspect-[16/10] flex-col justify-end border border-dashed border-line bg-ink-800/40 p-6",
        className,
      )}
    >
      <Globe className="size-5 text-faint" aria-hidden="true" />
      <p className="mt-3 text-sm font-medium text-paper">
        Homepage preview unavailable
      </p>
      <p className="mt-1 max-w-md text-xs leading-relaxed text-muted">
        No verified screenshot of the deployed website is stored for this
        project. Nothing is substituted in its place.
      </p>
      {liveUrl ? (
        <a
          href={liveUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-4 inline-flex w-fit items-center gap-1.5 font-mono text-[0.56rem] uppercase tracking-[0.14em] text-signal hover:text-signal-soft"
        >
          Open live site
          <ArrowUpRight className="size-3" aria-hidden="true" />
        </a>
      ) : null}
    </div>
  );
}
