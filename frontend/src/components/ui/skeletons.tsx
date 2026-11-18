import { cn } from "@/utils/cn";

function SkeletonBar({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-surface-raised/70", className)} />;
}

export function PageSkeleton({
  label = "Loading page",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("border-b border-line", className)} role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="mx-auto max-w-[80rem] px-5 py-14 sm:px-8 sm:py-20">
        <SkeletonBar className="h-3 w-24" />
        <SkeletonBar className="mt-7 h-14 w-full max-w-2xl" />
        <SkeletonBar className="mt-4 h-14 w-3/5 max-w-xl" />
        <SkeletonBar className="mt-8 h-4 w-full max-w-xl" />
        <SkeletonBar className="mt-3 h-4 w-4/5 max-w-lg" />
      </div>
    </div>
  );
}

export function CardSkeleton({
  count = 3,
  label = "Loading cards",
  className,
}: {
  count?: number;
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3", className)}
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="space-y-4 bg-surface p-6">
          <SkeletonBar className="h-3 w-20" />
          <SkeletonBar className="h-6 w-4/5" />
          <SkeletonBar className="h-4 w-full" />
          <SkeletonBar className="h-4 w-2/3" />
          <SkeletonBar className="mt-6 h-24 w-full" />
        </div>
      ))}
    </div>
  );
}

export function TimelineSkeleton({
  rows = 4,
  label = "Loading timeline",
  className,
}: {
  rows?: number;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-8", className)} role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="grid gap-4 border-t border-line pt-6 sm:grid-cols-[8rem_1fr]">
          <SkeletonBar className="h-3 w-16" />
          <div className="space-y-3">
            <SkeletonBar className="h-5 w-2/3" />
            <SkeletonBar className="h-4 w-full max-w-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DetailSkeleton({
  label = "Loading details",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-6", className)} role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <SkeletonBar className="h-3 w-28" />
      <SkeletonBar className="h-10 w-3/4 max-w-xl" />
      <SkeletonBar className="h-4 w-full max-w-2xl" />
      <SkeletonBar className="h-4 w-5/6 max-w-xl" />
      <div className="grid gap-6 pt-6 sm:grid-cols-2">
        <SkeletonBar className="h-40 w-full" />
        <SkeletonBar className="h-40 w-full" />
      </div>
    </div>
  );
}

export function FormSkeleton({
  fields = 5,
  label = "Loading form",
  className,
}: {
  fields?: number;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-5", className)} role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="space-y-2">
          <SkeletonBar className="h-3 w-24" />
          <SkeletonBar className="h-11 w-full" />
        </div>
      ))}
      <SkeletonBar className="h-11 w-40" />
    </div>
  );
}
