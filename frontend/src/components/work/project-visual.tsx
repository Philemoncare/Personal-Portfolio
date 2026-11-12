import { ArrowUpRight } from "lucide-react";

import { cn } from "@/utils/cn";

export function ProjectVisual({
  title,
  index,
  imageUrl,
  imageAlt,
  aspect = "landscape",
  className,
}: {
  title: string;
  index: number;
  imageUrl?: string | null;
  imageAlt?: string;
  aspect?: "landscape" | "portrait" | "square";
  className?: string;
}) {
  const aspectClass = {
    landscape: "aspect-[4/3]",
    portrait: "aspect-[4/5]",
    square: "aspect-square",
  }[aspect];

  if (imageUrl) {
    return (
      <div
        className={cn(
          "relative overflow-hidden border border-line bg-surface",
          aspectClass,
          className,
        )}
      >
        <img
          src={imageUrl}
          alt={imageAlt ?? `${title} project visual`}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
        />
        <span
          className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-line-strong"
          aria-hidden="true"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex flex-col justify-between overflow-hidden border border-line bg-surface",
        aspectClass,
        className,
      )}
    >
      <div className="technical-grid absolute inset-0 opacity-60" aria-hidden="true" />
      <span
        className="absolute left-4 top-4 size-2 border-l border-t border-signal"
        aria-hidden="true"
      />
      <span
        className="absolute right-4 top-4 size-2 border-r border-t border-signal"
        aria-hidden="true"
      />
      <span
        className="absolute bottom-4 left-4 size-2 border-b border-l border-signal"
        aria-hidden="true"
      />
      <span
        className="absolute bottom-4 right-4 size-2 border-b border-r border-signal"
        aria-hidden="true"
      />

      <div className="relative flex items-center justify-between gap-4 p-5">
        <span className="type-meta text-muted">Project visual</span>
        <span className="type-meta text-faint">Plate / {String(index).padStart(2, "0")}</span>
      </div>

      <div className="relative grid flex-1 place-items-center px-6">
        <span
          className="select-none font-mono text-[clamp(5rem,12vw,10rem)] leading-none tracking-[-0.08em] text-paper/[0.055]"
          aria-hidden="true"
        >
          {String(index).padStart(2, "0")}
        </span>
        <div className="absolute inset-x-6 top-1/2 h-px bg-line/70" aria-hidden="true" />
        <div className="absolute inset-y-6 left-1/2 w-px bg-line/70" aria-hidden="true" />
        <span className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 bg-signal" aria-hidden="true" />
      </div>

      <div className="relative flex items-end justify-between gap-4 p-5">
        <div>
          <p className="type-meta text-muted">Media pending</p>
          <p className="mt-1 max-w-[18rem] text-xs leading-relaxed text-paper-dim">
            A real screenshot, dashboard, or architecture diagram has not been uploaded for this
            project yet.
          </p>
        </div>
        <ArrowUpRight className="size-4 shrink-0 text-muted" aria-hidden="true" />
      </div>
    </div>
  );
}
