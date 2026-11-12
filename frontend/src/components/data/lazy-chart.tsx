import { Suspense, lazy } from "react";

import { LoadingState } from "@/components/ui/states";
import type { DataVisualization } from "@/types/api";

const Chart = lazy(() =>
  import("@/components/data/data-chart").then((module) => ({
    default: module.DataChart,
  })),
);

export function LazyDataChart({
  visualization,
  isDemo,
  compact,
}: {
  visualization: DataVisualization;
  isDemo?: boolean;
  compact?: boolean;
}) {
  return (
    <Suspense
      fallback={<LoadingState rows={1} label="Loading visualization" className="min-h-[18rem]" />}
    >
      <Chart visualization={visualization} isDemo={isDemo} compact={compact} />
    </Suspense>
  );
}
