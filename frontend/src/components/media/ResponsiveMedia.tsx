import { PortfolioImage } from "@/components/media/PortfolioImage";
import { cn } from "@/utils/cn";

type Aspect = number | "auto" | "square" | "portrait" | "landscape" | "wide";

export interface ResponsiveMediaProps {
  src: string;
  alt: string;
  kind?: "image" | "video";
  aspect?: Aspect;
  fit?: "cover" | "contain";
  sizes?: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
  controls?: boolean;
  onClick?: () => void;
}

/**
 * Content media that keeps a stable aspect ratio, lazy-loads images, and
 * never claims to render a file that is missing or unreachable.
 */
export function ResponsiveMedia({
  src,
  alt,
  kind = "image",
  aspect = "wide",
  fit = "cover",
  sizes = "(max-width: 640px) 100vw, (max-width: 1280px) 60vw, 45vw",
  priority = false,
  className,
  imageClassName,
  controls = true,
  onClick,
}: ResponsiveMediaProps) {
  if (kind === "video") {
    return (
      <div className={cn("relative overflow-hidden bg-surface", className)}>
        <video
          src={src}
          controls={controls}
          playsInline
          preload="metadata"
          aria-label={alt}
          onClick={onClick}
          className="h-full w-full object-contain"
        />
      </div>
    );
  }

  return (
    <div className={cn("relative", className)} onClick={onClick}>
      <PortfolioImage
        src={src}
        alt={alt}
        aspect={aspect}
        fit={fit}
        sizes={sizes}
        priority={priority}
        imageClassName={imageClassName}
      />
    </div>
  );
}
