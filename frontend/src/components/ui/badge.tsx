import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

type BadgeTone = "outline" | "placeholder" | "signal" | "muted";

const tones: Record<BadgeTone, string> = {
  outline: "border-line-strong text-paper-dim",
  placeholder: "border-signal/45 bg-signal/8 text-signal-soft",
  signal: "border-signal bg-signal text-ink-950",
  muted: "border-line text-muted",
};

export function Badge({
  children,
  tone = "outline",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[0.6rem] uppercase leading-none tracking-[0.16em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
