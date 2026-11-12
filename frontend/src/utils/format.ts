const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Dates from the API are ISO date strings (YYYY-MM-DD) or timestamps.
 * The local SQLite fallback stores UTC timestamps without an offset, so treat
 * timezone-less values as UTC instead of letting the browser assume local time.
 */
function parseApiDate(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00Z`);
  }
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  return new Date(hasZone ? value : `${value}Z`);
}

export function formatDate(value: string | null, options?: { withDay?: boolean }): string {
  if (!value) return "";
  const date = parseApiDate(value);
  if (Number.isNaN(date.getTime())) return value;
  const month = MONTHS[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  return options?.withDay ? `${month} ${date.getUTCDate()}, ${year}` : `${month} ${year}`;
}

export function formatRange(
  start: string | null,
  end: string | null,
  isCurrent = false,
): string {
  if (!start && !end) return "Dates not added";
  const startLabel = start ? formatDate(start) : "Undated";
  if (isCurrent) return `${startLabel} — Present`;
  const endLabel = end ? formatDate(end) : "Present";
  return `${startLabel} — ${endLabel}`;
}

export function relativeTime(value: string): string {
  const date = parseApiDate(value);
  if (Number.isNaN(date.getTime())) return value;
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value, { withDay: true });
}

export function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatMonthYear(year: number, month: number | null): string {
  if (!month || month < 1 || month > 12) return String(year);
  return `${MONTHS[month - 1]} ${year}`;
}
