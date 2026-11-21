import { Link } from "react-router-dom";

import { useSiteSettings } from "@/app/SiteSettingsProvider";
import { useProfile } from "@/hooks/useContent";
import { cn } from "@/utils/cn";

const MARK_SIZES = {
  sm: "size-7",
  md: "size-8",
  lg: "size-11",
} as const;

const MARK_TEXT_SIZES = {
  sm: "text-[0.68rem]",
  md: "text-[0.78rem]",
  lg: "text-[1.05rem]",
} as const;

export function IdentityMark({
  size = "md",
  className,
}: {
  size?: keyof typeof MARK_SIZES;
  className?: string;
}) {
  const settings = useSiteSettings();
  const initial = (settings.settings?.wordmark?.trim() || "P").charAt(0).toUpperCase();
  return (
    <span
      className={cn(
        "relative inline-grid shrink-0 place-items-center border border-line-strong bg-surface text-paper",
        MARK_SIZES[size],
        className,
      )}
      aria-hidden="true"
    >
      <span className={cn("font-mono leading-none tracking-[-0.08em]", MARK_TEXT_SIZES[size])}>
        {initial}
      </span>
      <span className="absolute -bottom-px -right-px size-1.5 bg-signal" />
    </span>
  );
}

export function Wordmark({
  compact = false,
  className,
  showName = true,
}: {
  compact?: boolean;
  className?: string;
  showName?: boolean;
}) {
  const settings = useSiteSettings();
  const profile = useProfile();
  const wordmark = settings.settings?.wordmark?.trim() || "Phill";
  const name = profile.data?.display_name || profile.data?.name || "";
  // Avoid printing the same name twice when the wordmark already matches it.
  const subline = name.trim().toLowerCase() === wordmark.toLowerCase() ? "" : name;
  return (
    <Link
      to="/"
      className={cn("group inline-flex items-center gap-3", className)}
    >
      <IdentityMark
        size={compact ? "sm" : "md"}
        className="transition-colors duration-200 group-hover:border-paper"
      />
      <span className="flex flex-col">
        <span
          className={cn(
            "font-semibold uppercase leading-none tracking-[-0.03em] text-paper",
            compact ? "text-sm" : "text-base",
          )}
        >
          {wordmark}
        </span>
        {showName && subline ? (
          <span className="mt-1 font-mono text-[0.46rem] uppercase tracking-[0.22em] text-muted">
            {subline}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
