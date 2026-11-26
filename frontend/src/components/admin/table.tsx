import { Search } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

export interface AdminColumn<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  /** Shown above the cell when the table collapses into mobile cards. */
  mobileLabel?: string;
  className?: string;
}

interface AdminTableProps<T> {
  columns: AdminColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Tailwind grid template applied at `lg` and above. */
  gridClassName: string;
  caption: string;
  selectedKey?: string | null;
  onRowActivate?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
  isLoading?: boolean;
  emptyState?: ReactNode;
}

/**
 * One shared table surface for every admin index. Desktop renders a grid;
 * below `lg` each row becomes a stacked card so 390-1024px stay readable.
 */
export function AdminTable<T>({
  columns,
  rows,
  rowKey,
  gridClassName,
  caption,
  selectedKey,
  onRowActivate,
  rowClassName,
  isLoading = false,
  emptyState,
}: AdminTableProps<T>) {
  return (
    <div className="overflow-hidden border border-line bg-surface/50">
      <div
        className={cn(
          "hidden gap-4 border-b border-line bg-surface-raised/80 px-4 py-3 font-mono text-[0.56rem] uppercase tracking-[0.15em] text-muted lg:grid select-none",
          gridClassName,
        )}
        aria-hidden="true"
      >
        {columns.map((column) => (
          <span key={column.key} className={cn("truncate", column.className)}>
            {column.header}
          </span>
        ))}
      </div>

      {isLoading ? (
        <div className="divide-y divide-line p-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 w-full animate-pulse bg-surface-raised/40 rounded-none" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="p-8 text-center">
          {emptyState || (
            <div className="py-6">
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">
                No items found
              </p>
              <p className="mt-1 text-xs text-faint">
                Try adjusting your search or filters.
              </p>
            </div>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((row) => {
            const key = rowKey(row);
            const selected = selectedKey === key;
            const content = (
              <>
                {columns.map((column, index) => (
                  <div
                    key={column.key}
                    className={cn(
                      "min-w-0",
                      index > 0 && "flex items-start justify-between gap-4 lg:block",
                      column.className,
                    )}
                  >
                    {column.mobileLabel && index > 0 ? (
                      <span className="shrink-0 font-mono text-[0.52rem] uppercase tracking-[0.12em] text-faint lg:hidden">
                        {column.mobileLabel}
                      </span>
                    ) : null}
                    <div className={cn(index > 0 && "text-right lg:text-left")}>
                      {column.render(row)}
                    </div>
                  </div>
                ))}
              </>
            );

            return (
              <li key={key}>
                {onRowActivate ? (
                  <button
                    type="button"
                    onClick={() => onRowActivate(row)}
                    aria-pressed={selected}
                    className={cn(
                      "grid w-full min-h-[52px] gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-hover/80",
                      "lg:items-center lg:gap-4",
                      gridClassName,
                      selected && "bg-surface-raised border-l-2 border-l-signal",
                      rowClassName?.(row),
                    )}
                  >
                    {content}
                  </button>
                ) : (
                  <div
                    className={cn(
                      "grid min-h-[52px] gap-3 px-4 py-3.5 transition-colors",
                      "lg:items-center lg:gap-4",
                      gridClassName,
                      selected && "bg-surface-raised border-l-2 border-l-signal",
                      rowClassName?.(row),
                    )}
                  >
                    {content}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <span className="sr-only">{caption}</span>
    </div>
  );
}

export function AdminTableToolbar({
  children,
  status,
  className,
}: {
  children: ReactNode;
  status?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-line pb-4 lg:flex-row lg:items-center lg:justify-between",
        className,
      )}
    >
      {children}
      {status ? (
        <span className="font-mono text-[0.54rem] uppercase tracking-[0.12em] text-faint">
          {status}
        </span>
      ) : null}
    </div>
  );
}

export function AdminSearchInput({
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("relative w-full lg:max-w-xs", className)}>
      <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-faint pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="h-10 w-full border border-line bg-background pl-9 pr-3.5 text-sm text-paper placeholder:text-faint focus:border-line-strong focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
      />
    </div>
  );
}

export function AdminStatusTabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; count?: number }>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
      {options.map((option) => (
        <button
          key={option.value || "all"}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "border px-3 py-2 font-mono text-[0.58rem] uppercase tracking-[0.14em] transition-colors",
            value === option.value
              ? "border-paper bg-paper text-ink-950 font-semibold"
              : "border-line bg-surface text-paper-dim hover:border-line-strong hover:text-paper",
          )}
        >
          {option.label}
          {option.count !== undefined ? (
            <span className="ml-1.5 text-[0.52rem] opacity-75">({option.count})</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
