import type {
  DataChartType,
  DataProjectStatus,
  DataProjectType,
  DataResourceType,
  DataRow,
  DataVisualization,
} from "@/types/api";

export const DATA_PROJECT_TYPE_LABELS: Record<DataProjectType, string> = {
  eda: "Exploratory analysis",
  sql: "SQL analysis",
  excel: "Excel analysis",
  dashboard: "Dashboard",
  bi: "Business intelligence",
  statistical: "Statistical analysis",
  cleaning: "Data cleaning",
  research: "Research",
  visualization: "Chart",
};

export const DATA_PROJECT_STATUS_LABELS: Record<DataProjectStatus, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
  experiment: "Experiment",
};

export const DATA_CHART_TYPE_LABELS: Record<DataChartType, string> = {
  bar: "Bar chart",
  line: "Line chart",
  area: "Area chart",
  pie: "Pie chart",
  donut: "Donut chart",
  scatter: "Scatter plot",
  histogram: "Histogram",
  heatmap: "Heatmap",
  table: "Table",
  kpi: "Key numbers",
};

export const DATA_RESOURCE_TYPE_LABELS: Record<DataResourceType, string> = {
  dataset: "Dataset",
  notebook: "Notebook",
  sql: "SQL file",
  excel: "Excel workbook",
  pdf: "PDF report",
  dashboard: "Dashboard",
  github: "GitHub repository",
  external: "External source",
};

export const CHART_PALETTE = [
  "#ff4e1f",
  "#e9e5dc",
  "#5ea77a",
  "#d9a441",
  "#8b8a84",
  "#c4c0b7",
] as const;

export function formatCompactNumber(value: number): string {
  if (!Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("en", {
    notation: Math.abs(value) >= 10000 ? "compact" : "standard",
    maximumFractionDigits: Math.abs(value) >= 1000 ? 1 : 2,
  }).format(value);
}

export function numericValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function displayValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "number") return formatCompactNumber(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

/**
 * Validate chart configuration at the render boundary. The API validates on
 * save, but stored JSON can still be edited directly, so the public page must
 * fail softly rather than letting Recharts throw.
 */
export function visualizationIssue(
  visualization: DataVisualization | null | undefined,
): string | null {
  if (!visualization) return "This chart is not set up yet.";
  const chartTypes: DataChartType[] = [
    "bar",
    "line",
    "area",
    "pie",
    "donut",
    "scatter",
    "histogram",
    "heatmap",
    "table",
    "kpi",
  ];
  if (!chartTypes.includes(visualization.chart_type)) {
    return "This chart type is not supported.";
  }
  if (!Array.isArray(visualization.data) || visualization.data.length === 0) {
    return "This chart has no data.";
  }
  if (visualization.data.length > 500) {
    return "This chart has too many rows to display.";
  }
  const hasKey = (key: string | null) =>
    Boolean(key && visualization.data.some((row) => key in row));

  if (["bar", "line", "area", "pie", "donut", "histogram"].includes(visualization.chart_type)) {
    if (!visualization.x_axis || !hasKey(visualization.x_axis)) {
      return "The category column is missing.";
    }
    if (visualization.series.length === 0 && !visualization.y_axis) {
      return "No value column is selected.";
    }
    if (visualization.y_axis && !hasKey(visualization.y_axis)) {
      return "The value column is missing.";
    }
    if (visualization.series.some((key) => !hasKey(key))) {
      return "One or more series columns are missing.";
    }
  }
  if (visualization.chart_type === "scatter") {
    if (!hasKey(visualization.x_axis) || !hasKey(visualization.y_axis)) {
      return "The scatter axes are missing.";
    }
  }
  if (visualization.chart_type === "heatmap") {
    if (!hasKey(visualization.x_axis) || !hasKey(visualization.y_axis)) {
      return "The heatmap axes are missing.";
    }
    if (visualization.series.length !== 1 || !hasKey(visualization.series[0])) {
      return "The heatmap needs one numeric value column.";
    }
  }
  return null;
}

export function valueKeys(visualization: DataVisualization): string[] {
  if (visualization.series.length > 0) return visualization.series;
  return visualization.y_axis ? [visualization.y_axis] : [];
}

export function tableColumns(rows: DataRow[]): string[] {
  const columns: string[] = [];
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!columns.includes(key)) columns.push(key);
    }
  }
  return columns;
}

export function humanizeKey(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
