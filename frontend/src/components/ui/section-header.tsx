import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

import { Eyebrow } from "./eyebrow";

export function SectionHeader({
  index,
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  index?: string;
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-7 border-t border-line pt-6 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="max-w-3xl">
        <Eyebrow index={index}>{eyebrow}</Eyebrow>
        <h2 className="mt-5 text-balance text-[clamp(2rem,4.2vw,3.75rem)] font-medium leading-[0.98] tracking-[-0.035em] text-paper">
          {title}
        </h2>
        {description ? (
          <p className="mt-5 max-w-xl text-pretty text-sm leading-relaxed text-paper-dim sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
