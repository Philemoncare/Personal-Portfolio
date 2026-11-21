import {
  Activity,
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Laptop,
  MessageSquare,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { buttonStyles } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePollingResource } from "@/hooks/usePollingResource";
import {
  getSecurityActivity,
  getSecurityOverview,
  listSmsLogs,
} from "@/services/auth.service";
import type { SmsStatus } from "@/types/api";
import { formatDate, relativeTime } from "@/utils/format";

const POLL_MS = 12_000;
const PAGE_SIZE = 10;
const SMS_PAGE_SIZE = 8;

export const EVENT_LABELS: Record<string, string> = {
  login: "Signed in",
  login_failed: "Failed sign in",
  logout: "Signed out",
  otp_requested: "Verification code requested",
  otp_resent: "Verification code resent",
  otp_verified: "Verification code accepted",
  otp_failed: "Verification failed",
  password_changed: "Password changed",
  password_reset: "Password reset",
  password_reset_requested: "Password reset requested",
  session_revoked: "Session revoked",
  media_uploaded: "Media uploaded",
  media_updated: "Media updated",
  media_deleted: "Media deleted",
  user_created: "User created",
  user_updated: "User updated",
  settings_changed: "Settings changed",
  project_created: "Project created",
  project_updated: "Project updated",
  project_deleted: "Project deleted",
  project_duplicated: "Project duplicated",
  project_published: "Project published",
  project_status_changed: "Project status changed",
  project_reordered: "Projects reordered",
  case_study_created: "Case study created",
  case_study_updated: "Case study updated",
  case_study_deleted: "Case study deleted",
};

const AUTH_EVENTS = [
  "login",
  "login_failed",
  "logout",
  "otp_requested",
  "otp_resent",
  "otp_verified",
  "otp_failed",
  "password_changed",
  "password_reset",
  "password_reset_requested",
  "session_revoked",
];

const SMS_STATUS_OPTIONS: SmsStatus[] = [
  "QUEUED",
  "SENT",
  "DELIVERED",
  "FAILED",
  "EXPIRED",
  "CANCELLED",
];

const PURPOSE_LABELS: Record<string, string> = {
  LOGIN_OTP: "Sign-in code",
  PASSWORD_RESET_OTP: "Password reset",
};

const SMS_STATUS_LABELS: Record<string, string> = {
  QUEUED: "Queued",
  SENT: "Sent",
  DELIVERED: "Delivered",
  FAILED: "Failed",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
};

const STATUS_LABELS: Record<string, string> = {
  SUCCESS: "Success",
  FAILURE: "Failed",
  FAILED: "Failed",
  DELIVERED: "Delivered",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
  QUEUED: "Queued",
  SENT: "Sent",
};

const inputClass =
  "h-10 w-full border border-line bg-ink-950 px-3 text-sm text-paper outline-none transition-colors placeholder:text-faint focus:border-paper";

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="border border-line px-5 py-4">
      <p className="font-mono text-[0.56rem] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-xl font-medium tracking-[-0.02em] text-paper">{value}</p>
      {note ? <p className="mt-1 text-xs text-faint">{note}</p> : null}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const good = normalized === "SUCCESS" || normalized === "DELIVERED";
  const bad = ["FAILURE", "FAILED", "EXPIRED", "CANCELLED"].includes(normalized);
  const Icon = good ? CheckCircle2 : bad ? ShieldAlert : Activity;
  return (
    <span
      className={
        good
          ? "inline-flex items-center gap-1 font-mono text-[0.54rem] uppercase tracking-[0.12em] text-success"
          : bad
            ? "inline-flex items-center gap-1 font-mono text-[0.54rem] uppercase tracking-[0.12em] text-signal"
            : "inline-flex items-center gap-1 font-mono text-[0.54rem] uppercase tracking-[0.12em] text-muted"
      }
    >
      <Icon className="size-3" aria-hidden="true" />
      {STATUS_LABELS[normalized] ?? normalized}
    </span>
  );
}

function SortHeader({
  label,
  field,
  sort,
  order,
  onSort,
}: {
  label: string;
  field: "created_at" | "event" | "status";
  sort: string;
  order: "asc" | "desc";
  onSort: (field: "created_at" | "event" | "status") => void;
}) {
  const active = sort === field;
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={
        active
          ? "inline-flex items-center gap-1 font-mono text-[0.54rem] uppercase tracking-[0.14em] text-paper"
          : "inline-flex items-center gap-1 font-mono text-[0.54rem] uppercase tracking-[0.14em] text-faint hover:text-paper"
      }
    >
      {label}
      <ArrowUpDown className="size-2.5" aria-hidden="true" />
      {active ? (
        <span className="text-signal" aria-hidden="true">
          {order === "asc" ? "↑" : "↓"}
        </span>
      ) : null}
    </button>
  );
}

function Pager({
  total,
  limit,
  offset,
  onChange,
}: {
  total: number;
  limit: number;
  offset: number;
  onChange: (offset: number) => void;
}) {
  const page = Math.floor(offset / limit) + 1;
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
      <span className="font-mono text-[0.54rem] uppercase tracking-[0.12em] text-faint">
        {total === 0
          ? "No records"
          : `${offset + 1}–${Math.min(offset + limit, total)} of ${total}`}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, offset - limit))}
          disabled={page <= 1}
          className={buttonStyles("ghost", "sm", "border border-line disabled:opacity-30")}
        >
          <ChevronLeft className="size-3.5" aria-hidden="true" />
          Previous
        </button>
        <span className="font-mono text-[0.54rem] uppercase tracking-[0.12em] text-muted">
          {page} / {pages}
        </span>
        <button
          type="button"
          onClick={() => onChange(offset + limit)}
          disabled={page >= pages}
          className={buttonStyles("ghost", "sm", "border border-line disabled:opacity-30")}
        >
          Next
          <ChevronRight className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function isoStart(value: string): string | undefined {
  return value ? new Date(`${value}T00:00:00`).toISOString() : undefined;
}

function isoEnd(value: string): string | undefined {
  return value ? new Date(`${value}T23:59:59.999`).toISOString() : undefined;
}

export default function AdminSecurityPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [event, setEvent] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState<"created_at" | "event" | "status">("created_at");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [offset, setOffset] = useState(0);

  const [smsSearch, setSmsSearch] = useState("");
  const debouncedSmsSearch = useDebouncedValue(smsSearch, 300);
  const [smsStatus, setSmsStatus] = useState("");
  const [smsPurpose, setSmsPurpose] = useState("");
  const [smsOffset, setSmsOffset] = useState(0);

  useEffect(() => {
    setOffset(0);
  }, [debouncedSearch, event, status, dateFrom, dateTo, sort, order]);

  useEffect(() => {
    setSmsOffset(0);
  }, [debouncedSmsSearch, smsStatus, smsPurpose]);

  const overview = usePollingResource(getSecurityOverview, [], POLL_MS);
  const activity = usePollingResource(
    () =>
      getSecurityActivity({
        search: debouncedSearch || undefined,
        event: event || undefined,
        status: status || undefined,
        dateFrom: isoStart(dateFrom),
        dateTo: isoEnd(dateTo),
        sort,
        order,
        limit: PAGE_SIZE,
        offset,
      }),
    [debouncedSearch, event, status, dateFrom, dateTo, sort, order, offset],
    POLL_MS,
  );
  const sms = usePollingResource(
    () =>
      listSmsLogs({
        search: debouncedSmsSearch || undefined,
        status: smsStatus || undefined,
        purpose: smsPurpose || undefined,
        limit: SMS_PAGE_SIZE,
        offset: smsOffset,
      }),
    [debouncedSmsSearch, smsStatus, smsPurpose, smsOffset],
    POLL_MS,
  );

  const refreshing = overview.refreshing || activity.refreshing || sms.refreshing;

  const refreshAll = () => {
    overview.reload();
    activity.reload();
    sms.reload();
  };

  const onSort = (field: "created_at" | "event" | "status") => {
    if (sort === field) {
      setOrder((value) => (value === "asc" ? "desc" : "asc"));
    } else {
      setSort(field);
      setOrder("desc");
    }
  };

  if (overview.loading && !overview.data) {
    return <LoadingState label="Loading security" rows={4} />;
  }

  if (overview.error && !overview.data) {
    return (
      <ErrorState
        message="We couldn't load security details. Please try again."
        onRetry={overview.reload}
      />
    );
  }

  const data = overview.data;
  if (!data) return null;

  const delivery = data.sms_delivery_24h;
  const activeSessions = data.sessions;
  const lastUpdated = overview.lastUpdated;

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="type-meta text-signal">Account</p>
          <h1 className="mt-3 text-2xl font-medium tracking-[-0.02em] text-paper">
            Security
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Sign-ins, verification codes, text message delivery and active sessions. This page
            updates every {POLL_MS / 1000} seconds.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-[0.54rem] uppercase tracking-[0.12em] text-faint">
            {refreshing ? (
              <span className="inline-flex items-center gap-1.5 text-paper-dim">
                <RefreshCw className="size-3 animate-spin" aria-hidden="true" />
                Updating
              </span>
            ) : (
              <>
                Last updated:{" "}
                {lastUpdated
                  ? lastUpdated.toLocaleTimeString(undefined, { hour12: false })
                  : "not yet"}
              </>
            )}
          </span>
          <button
            type="button"
            onClick={refreshAll}
            disabled={refreshing}
            className={buttonStyles("secondary", "sm")}
          >
            <RefreshCw className="size-3.5" aria-hidden="true" />
            Refresh
          </button>
        </div>
      </header>

      {data.sms_provider === "development" ? (
        <div className="border border-signal/40 bg-signal/5 px-5 py-4 text-sm leading-relaxed text-paper-dim">
          <span className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-signal">
            Text messages are not set up
          </span>
          <p className="mt-2">
            No text message provider is set up, so codes are not sent to a phone. To send real
            codes, add your Arkesel details in the server settings.
          </p>
        </div>
      ) : null}

      <section aria-labelledby="health-heading">
        <div className="flex items-center justify-between gap-4 border-b border-line pb-3">
          <h2
            id="health-heading"
            className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-muted"
          >
            Overview
          </h2>
          <span className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-faint">
            Last 24 hours
          </span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Stat
            label="Active sessions"
            value={String(data.active_sessions)}
            note={`${data.revoked_sessions} ended in total`}
          />
          <Stat
            label="Successful sign-ins"
            value={String(data.successful_logins_24h)}
            note="Signed in successfully"
          />
          <Stat
            label="Failed sign-ins"
            value={String(data.failed_logins_24h)}
            note="Wrong details or too many attempts"
          />
          <Stat
            label="Code success rate"
            value={data.otp_success_rate === null ? "—" : `${data.otp_success_rate}%`}
            note={
              data.otp_success_rate === null
                ? "No codes checked yet"
                : `${data.otp_failures_24h} failed attempts`
            }
          />
          <Stat
            label="Text delivery rate"
            value={data.sms_success_rate === null ? "—" : `${data.sms_success_rate}%`}
            note={
              data.sms_success_rate === null
                ? "No delivery confirmations yet"
                : "Delivered out of accepted"
            }
          />
          <Stat
            label="Password age"
            value={data.password_age_days === null ? "Not known" : `${data.password_age_days} days`}
            note={`${data.password_changes_24h} changes in the last 24 hours`}
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section aria-labelledby="sms-heading">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
            <h2
              id="sms-heading"
              className="inline-flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-muted"
            >
              <MessageSquare className="size-3.5" aria-hidden="true" />
              Text messages
            </h2>
            <span className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-faint">
              {sms.data?.total ?? 0} message{(sms.data?.total ?? 0) === 1 ? "" : "s"}
            </span>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            {(
              [
                ["Accepted", delivery.SENT ?? 0, "Accepted by provider"],
                ["Delivered", delivery.DELIVERED ?? 0, "Delivery confirmed"],
                ["Failed", delivery.FAILED ?? 0, "Not delivered"],
                ["Queued", delivery.QUEUED ?? 0, "Waiting to send"],
              ] as const
            ).map(([label, value, note]) => (
              <div key={label} className="border border-line px-3 py-2.5">
                <p className="font-mono text-[0.5rem] uppercase tracking-[0.14em] text-faint">
                  {label}
                </p>
                <p className="mt-1 text-base text-paper">{value}</p>
                <p className="text-[0.65rem] text-faint">{note}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-faint">
            <strong className="font-medium text-paper-dim">Accepted</strong> means the provider has
            taken the message. <strong className="font-medium text-paper-dim">Delivered</strong> is
            only set when the provider confirms it reached the phone. Provider:{" "}
            {data.sms_provider === "arkesel" ? "Arkesel" : "not set up"}.
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <input
              value={smsSearch}
              onChange={(e) => setSmsSearch(e.target.value)}
              className={inputClass}
              placeholder="Search messages"
              aria-label="Search text messages"
            />
            <select
              value={smsStatus}
              onChange={(e) => setSmsStatus(e.target.value)}
              className={inputClass}
              aria-label="Filter messages by status"
            >
              <option value="">All statuses</option>
              {SMS_STATUS_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {SMS_STATUS_LABELS[value] ?? value}
                </option>
              ))}
            </select>
            <select
              value={smsPurpose}
              onChange={(e) => setSmsPurpose(e.target.value)}
              className={inputClass}
              aria-label="Filter messages by type"
            >
              <option value="">All types</option>
              <option value="LOGIN_OTP">Sign-in code</option>
              <option value="PASSWORD_RESET_OTP">Password reset</option>
            </select>
          </div>

          {sms.error && !sms.data ? (
            <div className="mt-4">
              <ErrorState
                message="We couldn't load text messages. Please try again."
                onRetry={sms.reload}
              />
            </div>
          ) : sms.loading && !sms.data ? (
            <div className="mt-4">
              <LoadingState label="Loading text messages" rows={3} />
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[44rem] border-collapse text-left">
                <thead>
                  <tr className="border-b border-line">
                    <th className="py-2 pr-4 text-left font-mono text-[0.54rem] font-normal uppercase tracking-[0.14em] text-faint">
                      Type
                    </th>
                    <th className="py-2 pr-4 text-left font-mono text-[0.54rem] font-normal uppercase tracking-[0.14em] text-faint">
                      Phone
                    </th>
                    <th className="py-2 pr-4 text-left font-mono text-[0.54rem] font-normal uppercase tracking-[0.14em] text-faint">
                      Provider
                    </th>
                    <th className="py-2 pr-4 text-left font-mono text-[0.54rem] font-normal uppercase tracking-[0.14em] text-faint">
                      Status
                    </th>
                    <th className="py-2 pr-4 text-left font-mono text-[0.54rem] font-normal uppercase tracking-[0.14em] text-faint">
                      Message ID
                    </th>
                    <th className="py-2 text-left font-mono text-[0.54rem] font-normal uppercase tracking-[0.14em] text-faint">
                      When
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(sms.data?.items ?? []).map((item) => (
                    <tr key={item.id} className="border-b border-line/70 align-top">
                      <td className="py-3 pr-4 text-sm text-paper">
                        {PURPOSE_LABELS[item.purpose] ?? item.purpose}
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs text-paper-dim">
                        {item.recipient_phone}
                      </td>
                      <td className="py-3 pr-4 text-xs capitalize text-muted">{item.provider}</td>
                      <td className="py-3 pr-4">
                        <StatusBadge status={item.status} />
                        {item.failure_reason ? (
                          <span className="mt-1 block max-w-[12rem] text-[0.65rem] text-signal">
                            {item.failure_reason}
                          </span>
                        ) : null}
                      </td>
                      <td className="max-w-[10rem] truncate py-3 pr-4 font-mono text-[0.6rem] text-faint">
                        {item.provider_message_id ?? "—"}
                      </td>
                      <td className="whitespace-nowrap py-3 font-mono text-[0.56rem] uppercase tracking-[0.1em] text-faint">
                        {relativeTime(item.created_at)}
                      </td>
                    </tr>
                  ))}
                  {(sms.data?.items.length ?? 0) === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-sm text-muted">
                        No messages match this view.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
              <div className="mt-3">
                <Pager
                  total={sms.data?.total ?? 0}
                  limit={SMS_PAGE_SIZE}
                  offset={smsOffset}
                  onChange={setSmsOffset}
                />
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="border border-line p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="inline-flex items-center gap-2 font-mono text-[0.56rem] uppercase tracking-[0.16em] text-muted">
                <Laptop className="size-3.5" aria-hidden="true" />
                Sessions
              </p>
              <Link to="/admin/security/sessions" className="text-xs text-muted hover:text-paper">
                Manage
              </Link>
            </div>
            <ul className="mt-3 space-y-3">
              {activeSessions.slice(0, 3).map((session) => (
                <li key={session.id} className="border-b border-line/60 pb-3 last:border-b-0 last:pb-0">
                  <p className="flex items-center gap-2 truncate text-xs text-paper">
                    {session.user_agent || "Unknown device"}
                    {session.is_current ? (
                      <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[0.48rem] uppercase tracking-[0.12em] text-success">
                        <ShieldCheck className="size-2.5" aria-hidden="true" />
                        Current
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 font-mono text-[0.52rem] uppercase tracking-[0.1em] text-faint">
                    {session.ip_address || "IP not recorded"} · {relativeTime(session.created_at)}
                  </p>
                </li>
              ))}
              {activeSessions.length === 0 ? (
                <li className="text-xs text-muted">No active sessions.</li>
              ) : null}
            </ul>
            <Link
              to="/admin/security/sessions"
              className={buttonStyles("secondary", "sm", "mt-4 w-full")}
            >
              View sessions
            </Link>
          </div>

          <div className="border border-line p-5">
            <p className="font-mono text-[0.56rem] uppercase tracking-[0.16em] text-muted">
              Quick actions
            </p>
            <div className="mt-3 space-y-2">
              <Link
                to="/change-password"
                className={buttonStyles("ghost", "sm", "w-full border border-line")}
              >
                <KeyRound className="size-3.5" aria-hidden="true" />
                Change password
              </Link>
              <Link
                to="/admin/security/sessions"
                className={buttonStyles("ghost", "sm", "w-full border border-line")}
              >
                <ShieldAlert className="size-3.5" aria-hidden="true" />
                Manage sessions
              </Link>
              <a
                href="#activity-heading"
                className={buttonStyles("ghost", "sm", "w-full border border-line")}
              >
                <Activity className="size-3.5" aria-hidden="true" />
                View activity
              </a>
              <a
                href="#sms-heading"
                className={buttonStyles("ghost", "sm", "w-full border border-line")}
              >
                <Send className="size-3.5" aria-hidden="true" />
                View text messages
              </a>
            </div>
          </div>
        </aside>
      </div>

      <section aria-labelledby="activity-heading">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
          <h2
            id="activity-heading"
            className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-muted"
          >
            Recent activity
          </h2>
          <span className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-faint">
            {activity.data?.total ?? 0} event{(activity.data?.total ?? 0) === 1 ? "" : "s"}
          </span>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputClass} xl:col-span-2`}
            placeholder="Search activity"
            aria-label="Search activity"
          />
          <select
            value={event}
            onChange={(e) => setEvent(e.target.value)}
            className={inputClass}
            aria-label="Filter activity by event"
          >
            <option value="">All events</option>
            {AUTH_EVENTS.map((value) => (
              <option key={value} value={value}>
                {EVENT_LABELS[value] ?? value}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={inputClass}
            aria-label="Filter activity by status"
          >
            <option value="">All statuses</option>
            <option value="success">Successful</option>
            <option value="failure">Failed</option>
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className={inputClass}
            aria-label="Activity from date"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className={inputClass}
            aria-label="Activity to date"
          />
        </div>

        {activity.error && !activity.data ? (
          <div className="mt-4">
            <ErrorState
              message="We couldn't load activity. Please try again."
              onRetry={activity.reload}
            />
          </div>
        ) : activity.loading && !activity.data ? (
          <div className="mt-4">
            <LoadingState label="Loading activity" rows={3} />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[48rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-line">
                  <th className="py-2 pr-4">
                    <SortHeader
                      label="Event"
                      field="event"
                      sort={sort}
                      order={order}
                      onSort={onSort}
                    />
                  </th>
                  <th className="py-2 pr-4">
                    <SortHeader
                      label="Status"
                      field="status"
                      sort={sort}
                      order={order}
                      onSort={onSort}
                    />
                  </th>
                  <th className="py-2 pr-4 text-left font-mono text-[0.54rem] font-normal uppercase tracking-[0.14em] text-faint">
                    User
                  </th>
                  <th className="py-2 pr-4 text-left font-mono text-[0.54rem] font-normal uppercase tracking-[0.14em] text-faint">
                    Details
                  </th>
                  <th className="py-2 pr-4 text-left font-mono text-[0.54rem] font-normal uppercase tracking-[0.14em] text-faint">
                    IP
                  </th>
                  <th className="py-2">
                    <SortHeader
                      label="When"
                      field="created_at"
                      sort={sort}
                      order={order}
                      onSort={onSort}
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {(activity.data?.items ?? []).map((entry) => (
                  <tr key={entry.id} className="border-b border-line/70 align-top">
                    <td className="py-3 pr-4 text-sm text-paper">
                      {EVENT_LABELS[entry.event] ?? entry.event}
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={entry.status} />
                    </td>
                    <td className="max-w-[12rem] truncate py-3 pr-4 text-xs text-paper-dim">
                      {entry.identifier || "Not recorded"}
                    </td>
                    <td className="max-w-[16rem] py-3 pr-4 text-xs leading-relaxed text-muted">
                      {entry.detail || "—"}
                    </td>
                    <td className="py-3 pr-4 font-mono text-[0.56rem] text-faint">
                      {entry.ip_address || "—"}
                    </td>
                    <td
                      className="whitespace-nowrap py-3 font-mono text-[0.56rem] uppercase tracking-[0.1em] text-faint"
                      title={formatDate(entry.created_at, { withDay: true })}
                    >
                      {relativeTime(entry.created_at)}
                    </td>
                  </tr>
                ))}
                {(activity.data?.items.length ?? 0) === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8">
                      <p className="inline-flex items-center gap-2 text-sm text-paper">
                        <AlertTriangle className="size-4 text-muted" aria-hidden="true" />
                        No activity matches these filters.
                      </p>
                      <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted">
                        Try clearing the search or the dates.
                      </p>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            <div className="mt-3">
              <Pager
                total={activity.data?.total ?? 0}
                limit={PAGE_SIZE}
                offset={offset}
                onChange={setOffset}
              />
            </div>
          </div>
        )}

        <p className="mt-4 text-xs leading-relaxed text-faint">
          This log never stores passwords, verification codes or session tokens. Phone numbers in
          the message log are partly hidden.
        </p>
      </section>
    </div>
  );
}
