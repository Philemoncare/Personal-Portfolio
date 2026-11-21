import { ArrowLeft, Laptop, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { buttonStyles } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { useApiResource } from "@/hooks/useApiResource";
import { usePollingResource } from "@/hooks/usePollingResource";
import { ApiError } from "@/services/api";
import {
  getSecuritySessions,
  revokeAdminSession,
  revokeAllSessions,
} from "@/services/auth.service";
import type { Admin, AdminSession } from "@/types/api";
import { formatDate, relativeTime } from "@/utils/format";

const POLL_MS = 10_000;

function describeDevice(userAgent: string | null): string {
  if (!userAgent) return "Unknown device";
  const ua = userAgent;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Browser";
  const platform = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad/.test(ua)
        ? "iOS"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "Unknown OS";
  return `${browser} on ${platform}`;
}

function statusTone(status: AdminSession["status"]): string {
  if (status === "active") return "text-success";
  if (status === "revoked") return "text-signal";
  return "text-muted";
}

export default function AdminSecuritySessionsPage() {
  const { data: admin } = useApiResource<Admin>("/api/v1/auth/me");
  const sessions = usePollingResource(getSecuritySessions, [], POLL_MS);

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);

  const onRevoke = async (session: AdminSession) => {
    setBusy(session.id);
    setError(null);
    setNotice(null);
    try {
      const result = await revokeAdminSession(session.id);
      setNotice(result.message);
      sessions.reload();
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.detail : "We couldn't end this session. Please try again.",
      );
    } finally {
      setBusy(null);
    }
  };

  const onRevokeAll = async () => {
    setBusy("all");
    setError(null);
    setNotice(null);
    try {
      const result = await revokeAllSessions(true);
      setNotice(result.message);
      setConfirmAll(false);
      sessions.reload();
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.detail : "We couldn't end the other sessions. Please try again.",
      );
    } finally {
      setBusy(null);
    }
  };

  if (sessions.loading && !sessions.data) {
    return <LoadingState label="Loading sessions" rows={4} />;
  }

  if (sessions.error && !sessions.data) {
    return (
      <ErrorState
        message="We couldn't load your sessions. Please try again."
        onRetry={sessions.reload}
      />
    );
  }

  const items = sessions.data ?? [];
  const active = items.filter((item) => item.status === "active");
  const otherActive = active.filter((item) => !item.is_current).length;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            to="/admin/security"
            className="inline-flex items-center gap-2 font-mono text-[0.56rem] uppercase tracking-[0.14em] text-muted hover:text-paper"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Security
          </Link>
          <h1 className="mt-3 text-2xl font-medium tracking-[-0.02em] text-paper">
            Sessions
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            {admin ? `${admin.email}. ` : ""}
            Each browser where you are signed in appears here. You can end any session except the
            one you are using now.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-[0.54rem] uppercase tracking-[0.12em] text-faint">
            {sessions.refreshing ? (
              <span className="inline-flex items-center gap-1.5 text-paper-dim">
                <RefreshCw className="size-3 animate-spin" aria-hidden="true" />
                Updating
              </span>
            ) : (
              <>
                Last updated:{" "}
                {sessions.lastUpdated
                  ? sessions.lastUpdated.toLocaleTimeString(undefined, { hour12: false })
                  : "not yet"}
              </>
            )}
          </span>
          <button
            type="button"
            onClick={sessions.reload}
            disabled={sessions.refreshing}
            className={buttonStyles("secondary", "sm")}
          >
            <RefreshCw className="size-3.5" aria-hidden="true" />
            Refresh
          </button>
        </div>
      </header>

      {notice ? (
        <div
          className="border border-success/40 bg-success/5 px-5 py-3 text-sm text-paper"
          role="status"
        >
          {notice}
        </div>
      ) : null}

      {error ? (
        <div
          className="border border-signal/40 bg-signal/5 px-5 py-3 text-sm text-paper"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <section aria-labelledby="sessions-heading">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
          <h2
            id="sessions-heading"
            className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-muted"
          >
            {active.length} active · {otherActive} other device
            {otherActive === 1 ? "" : "s"}
          </h2>

          {confirmAll ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onRevokeAll}
                disabled={busy === "all"}
                className={buttonStyles("secondary", "sm", "border-signal text-signal")}
              >
                {busy === "all" ? "Ending..." : "Yes, end all other sessions"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmAll(false)}
                className={buttonStyles("ghost", "sm")}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmAll(true)}
              disabled={otherActive === 0 || busy !== null}
              className={buttonStyles("ghost", "sm", "border border-line disabled:opacity-30")}
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              End all other sessions
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-line">
                {["Device", "IP address", "Status", "Started", "Last active", "Expires", ""].map(
                  (label) => (
                    <th
                      key={label || "actions"}
                      className="py-2 pr-4 font-mono text-[0.54rem] font-normal uppercase tracking-[0.14em] text-faint"
                    >
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {items.map((session) => (
                <tr key={session.id} className="border-b border-line/70 align-top">
                  <td className="py-3 pr-4">
                    <p className="flex items-center gap-2 text-sm text-paper">
                      <Laptop className="size-3.5 shrink-0 text-muted" aria-hidden="true" />
                      <span className="max-w-[16rem] truncate">
                        {describeDevice(session.user_agent)}
                      </span>
                      {session.is_current ? (
                        <span className="inline-flex shrink-0 items-center gap-1 border border-success/40 px-1.5 py-0.5 font-mono text-[0.48rem] uppercase tracking-[0.12em] text-success">
                          <ShieldCheck className="size-2.5" aria-hidden="true" />
                          This device
                        </span>
                      ) : null}
                    </p>
                    <p
                      className="mt-1 max-w-[18rem] truncate font-mono text-[0.52rem] text-faint"
                      title={session.user_agent ?? undefined}
                    >
                      {session.user_agent || "Browser details not recorded"}
                    </p>
                  </td>
                  <td className="py-3 pr-4 font-mono text-[0.6rem] text-paper-dim">
                    {session.ip_address || "—"}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`font-mono text-[0.54rem] uppercase tracking-[0.12em] ${statusTone(
                        session.status,
                      )}`}
                    >
                      {session.status === "active"
                        ? "Active"
                        : session.status === "revoked"
                          ? "Ended"
                          : "Expired"}
                    </span>
                    {session.revoked_at ? (
                      <p className="mt-1 font-mono text-[0.5rem] uppercase tracking-[0.1em] text-faint">
                        {relativeTime(session.revoked_at)}
                      </p>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap py-3 pr-4 font-mono text-[0.56rem] uppercase tracking-[0.1em] text-faint">
                    {formatDate(session.created_at, { withDay: true })}
                  </td>
                  <td className="whitespace-nowrap py-3 pr-4 font-mono text-[0.56rem] uppercase tracking-[0.1em] text-faint">
                    {relativeTime(session.last_used_at)}
                  </td>
                  <td className="whitespace-nowrap py-3 pr-4 font-mono text-[0.56rem] uppercase tracking-[0.1em] text-faint">
                    {formatDate(session.expires_at, { withDay: true })}
                  </td>
                  <td className="py-3">
                    {session.is_current ? (
                      <span className="font-mono text-[0.52rem] uppercase tracking-[0.12em] text-faint">
                        Current
                      </span>
                    ) : session.status === "active" ? (
                      <button
                        type="button"
                        onClick={() => onRevoke(session)}
                        disabled={busy === session.id}
                        className={buttonStyles(
                          "ghost",
                          "sm",
                          "border border-line disabled:opacity-30",
                        )}
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                        {busy === session.id ? "Ending..." : "End session"}
                      </button>
                    ) : (
                      <span className="font-mono text-[0.52rem] uppercase tracking-[0.12em] text-faint">
                        Ended
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-sm text-muted">
                    No sessions yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-faint">
          Ending a session signs that browser out straight away. To end this session, sign out
          instead, so you don't lock yourself out by accident.
        </p>
      </section>
    </div>
  );
}
