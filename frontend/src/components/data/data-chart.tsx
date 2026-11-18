import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { DataTable } from "@/components/data/data-table";
import { KpiGrid } from "@/components/data/kpi-grid";
import type { DataVisualization } from "@/types/api";
import {
  CHART_PALETTE,
  displayValue,
  formatCompactNumber,
  humanizeKey,
  numericValue,
  valueKeys,
  visualizationIssue,
} from "@/utils/data";
import { cn } from "@/utils/cn";

interface TooltipPayloadItem {
  name?: string;
  dataKey?: string;
  value?: unknown;
  color?: string;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ReadonlyArray<TooltipPayloadItem>;
  label?: unknown;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="border border-line-strong bg-surface/95 px-3 py-2 shadow-overlay backdrop-blur-sm">
      <p className="font-mono text-[0.54rem] uppercase tracking-[0.14em] text-muted">
        {displayValue(label)}
      </p>
      <ul className="mt-2 space-y-1.5">
        {payload.map((item, index) => (
          <li key={`${item.dataKey ?? item.name ?? index}`} className="flex items-center gap-2 text-xs">
            <span
              className="size-2 shrink-0"
              style={{ backgroundColor: item.color ?? CHART_PALETTE[index % CHART_PALETTE.length] }}
              aria-hidden="true"
            />
            <span className="text-paper-dim">{humanizeKey(String(item.dataKey ?? item.name ?? ""))}</span>
            <span className="ml-auto tabular-nums text-paper font-medium">{displayValue(item.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const AXIS_TICK = {
  fill: "var(--color-foreground-muted)",
  fontSize: 10,
  fontFamily: "JetBrains Mono Variable, monospace",
};

const GRID_STROKE = "var(--grid-line-strong)";

function ChartBody({ visualization }: { visualization: DataVisualization }) {
  const rows = visualization.data;
  const xKey = visualization.x_axis ?? Object.keys(rows[0] ?? {})[0] ?? "label";
  const keys = valueKeys(visualization);
  const chartType = visualization.chart_type;

  if (chartType === "kpi") {
    return <KpiGrid rows={rows} caption={visualization.source_note} />;
  }

  if (chartType === "table") {
    return (
      <DataTable
        rows={rows}
        caption={visualization.title}
        pageSize={8}
        searchable
        columnToggle
      />
    );
  }

  if (chartType === "heatmap") {
    const valueKey = visualization.series[0] ?? keys[0];
    const xValues = Array.from(new Set(rows.map((row) => displayValue(row[xKey]))));
    const yKey = visualization.y_axis ?? "";
    const yValues = Array.from(new Set(rows.map((row) => displayValue(row[yKey]))));
    const values = rows
      .map((row) => numericValue(row[valueKey]))
      .filter((value): value is number => value !== null);
    const min = values.length > 0 ? Math.min(...values) : 0;
    const max = values.length > 0 ? Math.max(...values) : 1;
    const lookup = new Map<string, number | null>();
    for (const row of rows) {
      lookup.set(`${displayValue(row[yKey])}::${displayValue(row[xKey])}`, numericValue(row[valueKey]));
    }
    return (
      <div className="scrollbar-none overflow-x-auto">
        <div className="min-w-[32rem]">
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: `minmax(5rem, auto) repeat(${xValues.length}, minmax(2.6rem, 1fr))` }}
          >
            <span aria-hidden="true" />
            {xValues.map((x) => (
              <span
                key={`x-${x}`}
                className="pb-1 text-center font-mono text-[0.5rem] uppercase tracking-[0.08em] text-faint"
              >
                {x}
              </span>
            ))}
            {yValues.map((y) => (
              <div key={`y-${y}`} className="contents">
                <span className="flex items-center pr-2 font-mono text-[0.52rem] uppercase tracking-[0.08em] text-muted">
                  {y}
                </span>
                {xValues.map((x) => {
                  const value = lookup.get(`${y}::${x}`) ?? null;
                  const intensity =
                    value === null || max === min ? 0.18 : 0.12 + ((value - min) / (max - min)) * 0.75;
                  return (
                    <span
                      key={`${y}-${x}`}
                      className="flex h-10 items-center justify-center border border-line text-[0.6rem] tabular-nums text-paper"
                      style={{ backgroundColor: `rgba(255, 78, 31, ${intensity.toFixed(2)})` }}
                      title={`${y} / ${x}: ${displayValue(value)}`}
                    >
                      {value === null ? "—" : formatCompactNumber(value)}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between gap-4 font-mono text-[0.5rem] uppercase tracking-[0.1em] text-faint">
            <span>Lower / {formatCompactNumber(min)}</span>
            <span>Higher / {formatCompactNumber(max)}</span>
          </div>
        </div>
      </div>
    );
  }

  if (chartType === "scatter") {
    const scatterRows = rows
      .map((row) => {
        const x = numericValue(row[xKey]);
        const y = numericValue(row[visualization.y_axis ?? ""]);
        return x !== null && y !== null ? { x, y, name: displayValue(row[xKey]) } : null;
      })
      .filter((row): row is { x: number; y: number; name: string } => row !== null);
    return (
      <div className="h-[300px] w-full sm:h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid stroke={GRID_STROKE} />
            <XAxis
              type="number"
              dataKey="x"
              name={humanizeKey(xKey)}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: GRID_STROKE }}
              tickFormatter={(value: number) => formatCompactNumber(value)}
            />
            <YAxis
              type="number"
              dataKey="y"
              name={humanizeKey(visualization.y_axis ?? "")}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: GRID_STROKE }}
              tickFormatter={(value: number) => formatCompactNumber(value)}
              width={52}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ strokeDasharray: "3 3" }} />
            <Scatter
              data={scatterRows}
              fill={CHART_PALETTE[0]}
              isAnimationActive={false}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (chartType === "pie" || chartType === "donut") {
    const valueKey = keys[0] ?? visualization.y_axis ?? "";
    const pieRows = rows
      .map((row) => ({
        name: displayValue(row[xKey]),
        value: numericValue(row[valueKey]) ?? 0,
      }))
      .filter((row) => row.value !== 0);
    return (
      <div className="h-[300px] w-full sm:h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieRows}
              dataKey="value"
              nameKey="name"
              innerRadius={chartType === "donut" ? "52%" : 0}
              outerRadius="82%"
              paddingAngle={chartType === "donut" ? 2 : 0}
              isAnimationActive={false}
              stroke="var(--color-surface)"
              strokeWidth={2}
            >
              {pieRows.map((row, index) => (
                <Cell key={row.name} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
            <Legend
              formatter={(value: string) => (
                <span className="text-xs text-paper-dim">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const chartData = rows.map((row) => {
    const item: Record<string, string | number | null> = {
      __label: displayValue(row[xKey]),
    };
    for (const key of keys) {
      item[key] = numericValue(row[key]);
    }
    return item;
  });
  const seriesKeys = keys.length > 0 ? keys : [visualization.y_axis ?? "value"];
  const shared = {
    data: chartData,
    margin: { top: 8, right: 16, bottom: 4, left: 0 },
  };

  return (
    <div className="h-[300px] w-full sm:h-[340px]">
      <ResponsiveContainer width="100%" height="100%">
        {chartType === "line" ? (
          <LineChart {...shared}>
            <CartesianGrid stroke={GRID_STROKE} vertical={false} />
            <XAxis dataKey="__label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID_STROKE }} interval="preserveStartEnd" />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID_STROKE }} tickFormatter={(value: number) => formatCompactNumber(value)} width={52} />
            <Tooltip content={<ChartTooltip />} />
            <Legend formatter={(value: string) => <span className="text-xs text-paper-dim">{humanizeKey(value)}</span>} />
            {seriesKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={humanizeKey(key)}
                stroke={CHART_PALETTE[index % CHART_PALETTE.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        ) : chartType === "area" ? (
          <AreaChart {...shared}>
            <CartesianGrid stroke={GRID_STROKE} vertical={false} />
            <XAxis dataKey="__label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID_STROKE }} interval="preserveStartEnd" />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID_STROKE }} tickFormatter={(value: number) => formatCompactNumber(value)} width={52} />
            <Tooltip content={<ChartTooltip />} />
            <Legend formatter={(value: string) => <span className="text-xs text-paper-dim">{humanizeKey(value)}</span>} />
            {seriesKeys.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                name={humanizeKey(key)}
                stroke={CHART_PALETTE[index % CHART_PALETTE.length]}
                fill={CHART_PALETTE[index % CHART_PALETTE.length]}
                fillOpacity={0.18}
                strokeWidth={2}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        ) : (
          <BarChart {...shared} barGap={2}>
            <CartesianGrid stroke={GRID_STROKE} vertical={false} />
            <XAxis dataKey="__label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID_STROKE }} interval={0} angle={chartData.length > 8 ? -25 : 0} textAnchor={chartData.length > 8 ? "end" : "middle"} height={chartData.length > 8 ? 48 : 30} />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID_STROKE }} tickFormatter={(value: number) => formatCompactNumber(value)} width={52} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--grid-line)" }} />
            <Legend formatter={(value: string) => <span className="text-xs text-paper-dim">{humanizeKey(value)}</span>} />
            {seriesKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                name={humanizeKey(key)}
                fill={CHART_PALETTE[index % CHART_PALETTE.length]}
                maxBarSize={26}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export function DataChart({
  visualization,
  isDemo = false,
  compact = false,
  className,
}: {
  visualization: DataVisualization;
  isDemo?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const issue = visualizationIssue(visualization);

  return (
    <figure className={cn("border border-line bg-surface/70", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <div>
          <figcaption className="text-sm font-medium text-paper">{visualization.title}</figcaption>
          {!compact && visualization.description ? (
            <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-muted">
              {visualization.description}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {isDemo ? (
            <span className="border border-signal/40 bg-signal/5 px-2 py-1 font-mono text-[0.5rem] uppercase tracking-[0.14em] text-signal-soft">
              Demo data
            </span>
          ) : null}
          <span className="font-mono text-[0.5rem] uppercase tracking-[0.12em] text-faint">
            {humanizeKey(visualization.chart_type)}
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {issue ? (
          <div className="border border-warning/30 bg-warning/5 px-4 py-5">
            <p className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-warning">
              Visualization unavailable
            </p>
            <p className="mt-2 text-sm text-paper-dim">{issue}</p>
          </div>
        ) : (
          <ChartBody visualization={visualization} />
        )}
      </div>

      {!issue && visualization.chart_type !== "table" && visualization.chart_type !== "kpi" ? (
        <details className="border-t border-line px-4 py-3 sm:px-5">
          <summary className="cursor-pointer font-mono text-[0.54rem] uppercase tracking-[0.12em] text-muted hover:text-paper">
            View data table
          </summary>
          <div className="mt-3">
            <DataTable
              rows={visualization.data}
              caption={visualization.title}
              pageSize={6}
              searchable={false}
              columnToggle={false}
            />
          </div>
        </details>
      ) : null}

      {visualization.source_note ? (
        <p className="border-t border-line px-4 py-2.5 font-mono text-[0.5rem] uppercase tracking-[0.1em] text-faint sm:px-5">
          {visualization.source_note}
        </p>
      ) : null}
    </figure>
  );
}
