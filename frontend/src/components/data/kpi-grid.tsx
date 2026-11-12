import type { DataRow } from "@/types/api";
import { displayValue, numericValue } from "@/utils/data";

function KpiValue({ value }: { value: unknown }) {
  const numeric = numericValue(value);
  if (numeric !== null) {
    return (
      <span className="tabular-nums">
        {numeric.toLocaleString("en", { maximumFractionDigits: 2 })}
      </span>
    );
  }
  return <span className="text-[clamp(1.4rem,2.4vw,2rem)]">{displayValue(value)}</span>;
}

export function KpiGrid({ rows, caption }: { rows: DataRow[]; caption?: string | null }) {
  if (rows.length === 0) return null;

  return (
    <div>
      {caption ? <p className="mb-3 type-meta text-faint">{caption}</p> : null}
      <dl className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((row, index) => {
          const label = String(row.label ?? row.name ?? `Metric ${index + 1}`);
          const value = row.value ?? row.metric ?? row.total ?? null;
          return (
            <div key={`${label}-${index}`} className="bg-ink-900 p-5">
              <dt className="font-mono text-[0.54rem] uppercase tracking-[0.14em] text-muted">
                {label}
              </dt>
              <dd className="mt-4 text-[clamp(1.7rem,3vw,2.4rem)] font-medium leading-none tracking-tight text-paper">
                <KpiValue value={value} />
              </dd>
              {row.note ? (
                <p className="mt-3 text-[0.68rem] leading-relaxed text-faint">
                  {displayValue(row.note)}
                </p>
              ) : null}
            </div>
          );
        })}
      </dl>
    </div>
  );
}
