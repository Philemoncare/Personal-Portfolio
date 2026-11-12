import { Link } from "react-router-dom";

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
        P
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
  return (
    <Link
      to="/"
      className={cn("group inline-flex items-center gap-3", className)}
      aria-label="Phill — home"
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
          Phill
        </span>
        {showName ? (
          <span className="mt-1 font-mono text-[0.46rem] uppercase tracking-[0.22em] text-muted">
            Philemon Melabah
          </span>
        ) : null}
      </span>
    </Link>
  );
}
