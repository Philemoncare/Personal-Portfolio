import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import { getImage, type ImageId } from "@/assets/registry";
import { cn } from "@/utils/cn";

type Aspect = number | "auto" | "square" | "portrait" | "landscape" | "wide";

const ASPECT_VALUES: Record<string, number> = {
  square: 1,
  portrait: 4 / 5,
  landscape: 4 / 3,
  wide: 16 / 9,
};

export interface PortfolioImageProps {
  /** Registry asset id. Preferred over `src`. */
  assetId?: ImageId;
  /** External or CMS-managed URL. Used when the image is not in the registry. */
  src?: string | null;
  /** Required for meaningful images. Ignored when `decorative` is true. */
  alt?: string;
  sizes?: string;
  aspect?: Aspect;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
  objectPosition?: string;
  /** Decorative images are hidden from assistive technology and use empty alt. */
  decorative?: boolean;
  /** How the image fills its box. Defaults to cover. */
  fit?: "cover" | "contain";
  /** Rendered when the image is missing or fails to load. */
  fallback?: ReactNode;
}

function aspectStyle(aspect: Aspect): CSSProperties {
  if (aspect === "auto") return {};
  if (typeof aspect === "number") return { aspectRatio: String(aspect) };
  return { aspectRatio: String(ASPECT_VALUES[aspect] ?? 1) };
}

/**
 * Single entry point for content imagery.
 *
 * - serves WebP with a JPEG/PNG fallback
 * - supplies a responsive `srcset` and `sizes`
 * - reserves space with an aspect ratio to avoid layout shift
 * - lazy-loads by default, eager-loads only when `priority` is set
 * - shows a quiet loading state and an optional fallback on error
 */
export function PortfolioImage({
  assetId,
  src,
  alt,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 60vw, 45vw",
  aspect,
  priority = false,
  className,
  imageClassName,
  objectPosition,
  decorative = false,
  fit = "cover",
  fallback = null,
}: PortfolioImageProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");

  const asset = assetId ? getImage(assetId) : null;
  const resolvedSrc = asset?.src ?? src ?? null;

  if (!resolvedSrc || status === "error") {
    if (fallback) return <>{fallback}</>;
    return null;
  }

  const resolvedAlt = decorative ? "" : (alt ?? asset?.alt ?? "");
  const resolvedAspect = aspect ?? asset?.aspect ?? "auto";
  const position = objectPosition ?? asset?.position ?? "50% 50%";
  const dominantColor = asset?.dominantColor;

  return (
    <span
      className={cn("relative block overflow-hidden bg-surface", className)}
      style={aspectStyle(resolvedAspect)}
    >
      {dominantColor ? (
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-0 transition-opacity duration-500",
            status === "loaded" ? "opacity-0" : "opacity-100",
          )}
          style={{ backgroundColor: dominantColor }}
        />
      ) : null}

      <picture>
        {asset?.webpSrcSet ? (
          <source type="image/webp" srcSet={asset.webpSrcSet} sizes={sizes} />
        ) : null}
        <img
          src={resolvedSrc}
          srcSet={asset?.fallbackSrcSet || undefined}
          sizes={asset ? sizes : undefined}
          alt={resolvedAlt}
          width={asset?.width}
          height={asset?.height}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          draggable={false}
          aria-hidden={decorative ? "true" : undefined}
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
          style={{ objectPosition: position, objectFit: fit }}
          className={cn(
            "h-full w-full transition-[opacity,transform] duration-500 ease-out",
            status === "loaded" ? "opacity-100" : "opacity-0",
            imageClassName,
          )}
        />
      </picture>
    </span>
  );
}
