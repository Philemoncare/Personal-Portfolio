import { AlertTriangle, Inbox, LoaderCircle, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";

import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/utils/cn";

export function LoadingState({
  label = "Loading content",
  rows = 3,
  className,
}: {
  label?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)} role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-16 animate-pulse border border-line bg-ink-800/60"
          style={{ animationDelay: `${index * 80}ms` }}
        />
      ))}
    </div>
  );
}

export function InlineLoading({
  label = "Loading",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.14em] text-muted",
        className,
      )}
    >
      <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
      {label}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-4 border border-dashed border-line-strong bg-ink-800/30 p-8 sm:p-10",
        className,
      )}
    >
      <Inbox className="size-5 text-muted" aria-hidden="true" />
      <div>
        <p className="text-lg font-medium text-paper">{title}</p>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
  className,
}: {
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-4 border border-signal/30 bg-signal/5 p-8",
        className,
      )}
      role="alert"
    >
      <AlertTriangle className="size-5 text-signal" aria-hidden="true" />
      <div>
        <p className="font-medium text-paper">This section could not load</p>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-paper-dim">{message}</p>
      </div>
      {onRetry ? (
        <button type="button" onClick={onRetry} className={buttonStyles("secondary", "sm")}>
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Try again
        </button>
      ) : null}
    </div>
  );
}
