import type { ProjectStage } from "@/types/api";
import { cn } from "@/utils/cn";
import { PROJECT_STAGE_DOTS, PROJECT_STAGE_LABELS } from "@/utils/projects";

export function ProjectStatus({
  status,
  className,
  withLabel = true,
}: {
  status: ProjectStage;
  className?: string;
  withLabel?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-muted",
        className,
      )}
    >
      <span
        className={cn("size-1.5 rounded-full", PROJECT_STAGE_DOTS[status] ?? "bg-muted")}
        aria-hidden="true"
      />
      {withLabel ? PROJECT_STAGE_LABELS[status] ?? status : null}
    </span>
  );
}
