import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

export function Eyebrow({
  index,
  children,
  className,
}: {
  index?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "flex items-center gap-3 font-mono text-[0.65rem] uppercase tracking-[0.22em] text-muted",
        className,
      )}
    >
      {index ? <span className="text-signal">{index}</span> : null}
      <span className="h-px w-6 bg-line-strong" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
