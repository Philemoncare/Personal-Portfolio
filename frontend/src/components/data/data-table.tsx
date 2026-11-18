import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Columns3, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { cn } from "@/utils/cn";
import { displayValue, humanizeKey, numericValue, tableColumns } from "@/utils/data";
import type { DataRow } from "@/types/api";

type SortDirection = "asc" | "desc";

export function DataTable({
  rows,
  caption,
  columns,
  pageSize = 8,
  searchable = true,
  columnToggle = true,
  className,
}: {
  rows: DataRow[];
  caption?: string;
  columns?: string[];
  pageSize?: number;
  searchable?: boolean;
  columnToggle?: boolean;
  className?: string;
}) {
  const allColumns = useMemo(() => columns ?? tableColumns(rows), [columns, rows]);
  const [visible, setVisible] = useState<string[]>(allColumns);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(allColumns[0] ?? null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(0);

  const activeColumns = allColumns.filter((column) => visible.includes(column));

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      Object.values(row).some((value) => displayValue(value).toLowerCase().includes(term)),
    );
  }, [rows, search]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const left = a[sortKey];
      const right = b[sortKey];
      const leftNumber = numericValue(left);
      const rightNumber = numericValue(right);
      let comparison: number;
      if (leftNumber !== null && rightNumber !== null) {
        comparison = leftNumber - rightNumber;
      } else {
        comparison = displayValue(left).localeCompare(displayValue(right));
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filtered, sortDirection, sortKey]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const toggleSort = (column: string) => {
    if (sortKey === column) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(column);
      setSortDirection("asc");
    }
    setPage(0);
  };

  const toggleColumn = (column: string) => {
    setVisible((current) => {
      if (current.includes(column)) {
        if (current.length === 1) return current;
        return current.filter((item) => item !== column);
      }
      return [...current, column];
    });
  };

  return (
    <div className={cn("border border-line bg-surface/50", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="type-meta text-muted">{sorted.length} rows</span>
          {caption ? <span className="type-meta text-faint">/ {caption}</span> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {searchable ? (
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(0);
                }}
                placeholder="Search rows"
                aria-label="Search table rows"
                className="h-8 w-40 border border-line bg-background pl-8 pr-2 text-xs text-paper placeholder:text-faint focus:border-line-strong focus:outline-none"
              />
            </div>
          ) : null}
          {columnToggle ? (
            <details className="relative">
              <summary className="inline-flex h-8 cursor-pointer list-none items-center gap-1.5 border border-line bg-surface px-2 font-mono text-[0.52rem] uppercase tracking-[0.12em] text-muted hover:border-paper hover:text-paper">
                <Columns3 className="size-3" aria-hidden="true" />
                Columns
              </summary>
              <div className="absolute right-0 z-20 mt-1 w-52 border border-line bg-surface p-2 shadow-overlay">
                {allColumns.map((column) => (
                  <label
                    key={column}
                    className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-xs text-paper-dim hover:bg-surface-raised"
                  >
                    <input
                      type="checkbox"
                      checked={visible.includes(column)}
                      onChange={() => toggleColumn(column)}
                      className="size-3.5 accent-signal"
                    />
                    {humanizeKey(column)}
                  </label>
                ))}
              </div>
            </details>
          ) : null}
        </div>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[32rem] border-collapse text-left">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr className="border-b border-line bg-surface-raised/40">
              {activeColumns.map((column) => {
                const active = sortKey === column;
                return (
                  <th
                    key={column}
                    scope="col"
                    aria-sort={active ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                    className="px-4 py-3 font-mono text-[0.52rem] font-normal uppercase tracking-[0.14em] text-muted select-none"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(column)}
                      className="inline-flex items-center gap-1.5 hover:text-paper"
                    >
                      {humanizeKey(column)}
                      {active ? (
                        sortDirection === "asc" ? (
                          <ArrowUp className="size-3" aria-hidden="true" />
                        ) : (
                          <ArrowDown className="size-3" aria-hidden="true" />
                        )
                      ) : null}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {pageRows.map((row, rowIndex) => (
              <tr key={rowIndex} className="transition-colors hover:bg-surface-raised/40">
                {activeColumns.map((column) => (
                  <td
                    key={column}
                    className={cn(
                      "max-w-[20rem] truncate px-4 py-3 text-sm text-paper-dim",
                      numericValue(row[column]) !== null && "tabular-nums text-paper",
                    )}
                  >
                    {displayValue(row[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden">
        <ul className="divide-y divide-line">
          {pageRows.map((row, rowIndex) => (
            <li key={rowIndex} className="px-4 py-3">
              <dl className="space-y-2">
                {activeColumns.map((column) => (
                  <div key={column} className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-3">
                    <dt className="font-mono text-[0.5rem] uppercase tracking-[0.12em] text-faint">
                      {humanizeKey(column)}
                    </dt>
                    <dd className="text-right text-xs break-words text-paper-dim">
                      {displayValue(row[column])}
                    </dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      </div>

      {pageCount > 1 ? (
        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
          <span className="font-mono text-[0.52rem] uppercase tracking-[0.12em] text-faint">
            Page {safePage + 1} of {pageCount}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              disabled={safePage === 0}
              className="inline-flex size-7 items-center justify-center border border-line bg-surface text-muted hover:border-paper hover:text-paper disabled:opacity-30"
              aria-label="Previous page"
            >
              <ChevronLeft className="size-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
              disabled={safePage >= pageCount - 1}
              className="inline-flex size-7 items-center justify-center border border-line bg-surface text-muted hover:border-paper hover:text-paper disabled:opacity-30"
              aria-label="Next page"
            >
              <ChevronRight className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
