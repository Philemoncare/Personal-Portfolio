import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ResponsiveMedia } from "@/components/media/ResponsiveMedia";
import type { ProjectMedia } from "@/types/api";
import { cn } from "@/utils/cn";

interface ProjectGalleryProps {
  media: ProjectMedia[];
}

/**
 * Project screenshots and artefacts. Images open in an accessible lightbox;
 * video stays inline with native controls.
 */
export function ProjectGallery({ media }: ProjectGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const active = activeIndex === null ? null : media[activeIndex] ?? null;

  const close = useCallback(() => setActiveIndex(null), []);

  const step = useCallback(
    (direction: -1 | 1) => {
      setActiveIndex((current) => {
        if (current === null) return current;
        const next = (current + direction + media.length) % media.length;
        return next;
      });
    },
    [media.length],
  );

  useEffect(() => {
    if (activeIndex === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeIndex, close, step]);

  if (media.length === 0) return null;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {media.map((item, index) => (
          <figure key={item.id} className="group border border-line bg-surface">
            {item.media_type === "video" ? (
              <ResponsiveMedia
                src={item.url}
                alt={item.alt_text}
                kind="video"
                aspect="wide"
                className="bg-ink-950"
              />
            ) : (
              <button
                type="button"
                onClick={() => setActiveIndex(index)}
                className="block w-full cursor-zoom-in text-left"
                aria-label={`Open ${item.alt_text}`}
              >
                <ResponsiveMedia
                  src={item.url}
                  alt={item.alt_text}
                  aspect="wide"
                  sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 35vw"
                  imageClassName="transition-transform duration-500 group-hover:scale-[1.015]"
                />
              </button>
            )}
            {item.caption ? (
              <figcaption className="border-t border-line px-4 py-3 text-xs leading-relaxed text-muted">
                {item.caption}
              </figcaption>
            ) : null}
          </figure>
        ))}
      </div>

      {active ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.alt_text}
          className="fixed inset-0 z-[70] flex flex-col bg-ink-950/97 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3 text-paper sm:px-6">
            <p className="truncate font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted">
              {activeIndex! + 1} / {media.length}
            </p>
            <button
              type="button"
              onClick={close}
              className="inline-flex size-9 items-center justify-center border border-line-strong text-paper hover:border-paper"
              aria-label="Close image viewer"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center p-4 sm:p-8">
            {active.media_type === "video" ? (
              <video
                src={active.url}
                controls
                autoPlay
                playsInline
                aria-label={active.alt_text}
                className="max-h-full max-w-full"
              />
            ) : (
              <img
                src={active.url}
                alt={active.alt_text}
                className="max-h-full max-w-full object-contain"
              />
            )}
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-line px-4 py-3 sm:px-6">
            <button
              type="button"
              onClick={() => step(-1)}
              className="inline-flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-paper-dim hover:text-paper"
              aria-label="Previous image"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              Previous
            </button>
            {active.caption ? (
              <p className="hidden max-w-xl truncate text-xs text-muted sm:block">
                {active.caption}
              </p>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={() => step(1)}
              className="inline-flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-paper-dim hover:text-paper"
              aria-label="Next image"
            >
              Next
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function galleryFigureClassName(index: number) {
  return cn(
    "border border-line bg-surface",
    index === 0 && "sm:col-span-2",
  );
}
