import {
  ArrowUpRight,
  CheckCircle2,
  GitBranch,
  KeyRound,
  Link2,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Unlink,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { AdminPanel } from "@/components/admin/form";
import { buttonStyles } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { useApiQuery } from "@/hooks/useApiQuery";
import { githubService } from "@/services/github.service";
import type { GitHubStatus } from "@/types/api";
import { cn } from "@/utils/cn";
import { relativeTime } from "@/utils/format";

const SETUP_VARIABLES = [
  { name: "GITHUB_CLIENT_ID", hint: "Client ID from your GitHub OAuth app" },
  { name: "GITHUB_CLIENT_SECRET", hint: "Client secret from your GitHub OAuth app" },
  {
    name: "GITHUB_REDIRECT_URI",
    hint: "Must be https://your-api/api/v1/integrations/github/callback",
  },
  {
    name: "GITHUB_ALLOW_PRIVATE_REPOSITORIES",
    hint: "Optional. Also allows access to private repositories.",
  },
];

function StatusPill({ label, tone = "default" }: { label: string; tone?: "default" | "good" | "warn" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center border px-2 py-1 font-mono text-[0.5rem] uppercase tracking-[0.14em]",
        tone === "good" && "border-signal/40 bg-signal/10 text-signal",
        tone === "warn" && "border-warning/40 bg-warning/10 text-warning",
        tone === "default" && "border-line text-muted",
      )}
    >
      {label}
    </span>
  );
}

function AccountPanel({ status }: { status: GitHubStatus }) {
  const connection = status.connection;
  const connected = status.connected && connection;

  if (!connected) {
    return (
      <div className="flex flex-col gap-4">
        <p className="max-w-2xl text-sm leading-relaxed text-paper-dim">
          Connect a GitHub account to browse repositories and create draft projects. The
          connection is stored encrypted on the server, and the access token is never sent to
          this browser.
        </p>
        {!status.configured ? (
          <div className="border border-warning/40 bg-warning/10 p-4 text-sm leading-relaxed text-paper-dim">
            GitHub sign-in is not set up on the server. Add the settings below to
            <code className="mx-1 border border-line bg-ink-950 px-1.5 py-0.5 font-mono text-[0.7em]">
              backend/.env
            </code>
            and restart the server. Never put these values in frontend code.
          </div>
        ) : null}
        <ul className="divide-y divide-line border border-line">
          {SETUP_VARIABLES.map((item) => (
            <li key={item.name} className="grid gap-1 px-4 py-3 sm:grid-cols-[16rem_minmax(0,1fr)]">
              <code className="font-mono text-[0.68rem] text-paper">{item.name}</code>
              <span className="text-xs text-muted">{item.hint}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border border-line bg-ink-800/40 p-4">
        <div className="flex items-center gap-4">
          {connection.avatar_url ? (
            <img
              src={connection.avatar_url}
              alt=""
              className="size-14 border border-line object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="flex size-14 items-center justify-center border border-line text-muted">
              <GitBranch className="size-6" aria-hidden="true" />
            </span>
          )}
          <div>
            <p className="text-lg font-medium text-paper">
              {connection.display_name || connection.username}
            </p>
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted">
              @{connection.username}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill label="Connected" tone="good" />
          <StatusPill
            label={connection.private_repository_access ? "Public + private" : "Public only"}
            tone={connection.private_repository_access ? "warn" : "default"}
          />
        </div>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <dt className="font-mono text-[0.54rem] uppercase tracking-[0.14em] text-muted">
            Repositories
          </dt>
          <dd className="mt-1 text-sm text-paper">
            {connection.repository_count === null
              ? "Not counted yet"
              : connection.repository_count.toLocaleString()}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[0.54rem] uppercase tracking-[0.14em] text-muted">
            Repository access
          </dt>
          <dd className="mt-1 text-sm text-paper">
            {connection.repository_access === "public_and_private"
              ? "Public and private"
              : "Public only"}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[0.54rem] uppercase tracking-[0.14em] text-muted">
            Connected
          </dt>
          <dd className="mt-1 text-sm text-paper">
            {connection.connected_at ? relativeTime(connection.connected_at) : "—"}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[0.54rem] uppercase tracking-[0.14em] text-muted">
            Updated
          </dt>
          <dd className="mt-1 text-sm text-paper">
            {connection.updated_at ? relativeTime(connection.updated_at) : "Unknown"}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[0.54rem] uppercase tracking-[0.14em] text-muted">
            Permissions
          </dt>
          <dd className="mt-1 flex flex-wrap gap-1">
            {connection.scopes.length > 0 ? (
              connection.scopes.map((scope) => (
                <code
                  key={scope}
                  className="border border-line bg-ink-950 px-1.5 py-0.5 font-mono text-[0.62rem] text-paper-dim"
                >
                  {scope}
                </code>
              ))
            ) : (
              <span className="text-sm text-muted">No permissions listed</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[0.54rem] uppercase tracking-[0.14em] text-muted">
            Account
          </dt>
          <dd className="mt-1 text-sm">
            {connection.account_url ? (
              <a
                href={connection.account_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-signal hover:underline"
              >
                Open on GitHub
                <ArrowUpRight className="size-3" aria-hidden="true" />
              </a>
            ) : (
              <span className="text-muted">Unknown</span>
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function ImportHistory() {
  const logs = useApiQuery((signal) => githubService.logs({ limit: 8 }, signal), []);
  const items = logs.data?.items ?? [];

  return (
    <AdminPanel
      title="Recent imports"
      description="Successful and failed imports, syncs and disconnects."
    >
      {logs.loading ? <LoadingState rows={2} label="Loading import history" /> : null}
      {!logs.loading && logs.error ? (
        <ErrorState message="We couldn't load the import history." onRetry={logs.reload} />
      ) : null}
      {!logs.loading && !logs.error && items.length === 0 ? (
        <p className="text-sm text-muted">No imports yet.</p>
      ) : null}
      {items.length > 0 ? (
        <ul className="divide-y divide-line">
          {items.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-paper">
                    {entry.action}
                  </span>
                  <span
                    className={cn(
                      "font-mono text-[0.5rem] uppercase tracking-[0.14em]",
                      entry.status === "success"
                        ? "text-signal"
                        : entry.status === "failed"
                          ? "text-error"
                          : "text-warning",
                    )}
                  >
                    {entry.status}
                  </span>
                  <span className="truncate font-mono text-[0.58rem] text-muted">
                    {entry.repository_full_name}
                  </span>
                  {entry.user_email ? (
                    <span className="truncate font-mono text-[0.54rem] text-faint">
                      by {entry.user_email}
                    </span>
                  ) : null}
                </div>
                {entry.summary ? (
                  <p className="mt-1 text-xs leading-relaxed text-paper-dim">{entry.summary}</p>
                ) : null}
                {entry.error_message ? (
                  <p className="mt-1 text-xs leading-relaxed text-error">{entry.error_message}</p>
                ) : null}
              </div>
              <span className="font-mono text-[0.54rem] uppercase tracking-[0.12em] text-faint">
                {relativeTime(entry.created_at)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </AdminPanel>
  );
}

export default function AdminGitHubIntegrationPage() {
  const [params, setParams] = useSearchParams();
  const status = useApiQuery((signal) => githubService.status(signal), []);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const oauthResult = params.get("github");
  const oauthReason = params.get("reason");

  const oauthBanner = useMemo(() => {
    if (oauthResult === "connected") {
      return { tone: "good" as const, message: "GitHub connected successfully." };
    }
    if (oauthResult === "error") {
      return {
        tone: "warn" as const,
        message: oauthReason || "GitHub authorization did not complete.",
      };
    }
    return null;
  }, [oauthResult, oauthReason]);

  const dismissOauthBanner = () => {
    const next = new URLSearchParams(params);
    next.delete("github");
    next.delete("reason");
    setParams(next, { replace: true });
  };

  const run = async (key: string, action: () => Promise<unknown>, message: string) => {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await action();
      status.reload();
      setNotice(message);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const connect = async () => {
    setBusy("connect");
    setError(null);
    try {
      const result = await githubService.connect();
      window.location.assign(result.authorize_url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn't start the GitHub connection. Please try again.");
      setBusy(null);
    }
  };

  const disconnect = () => {
    const confirmed = window.confirm(
      "Disconnect GitHub? Existing projects keep their imported content and links. Import history is kept.",
    );
    if (!confirmed) return;
    void run(
      "disconnect",
      () => githubService.disconnect(),
      "GitHub disconnected. Existing projects were not changed.",
    );
  };

  const refresh = () => {
    void run(
      "refresh",
      () => githubService.refreshConnection(),
      "GitHub account details refreshed.",
    );
  };

  const configured = status.data?.configured ?? false;
  const connected = status.data?.connected ?? false;

  return (
    <>
      <div className="flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-signal">
            Integrations
          </p>
          <h1 className="mt-3 text-3xl font-medium tracking-tight text-paper sm:text-4xl">
            GitHub
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            Browse repositories you have allowed, read their documentation, and create draft
            projects. Imports never publish automatically, and private repository content stays
            private.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/github" className={buttonStyles("secondary", "md")}>
            <GitBranch className="size-4" aria-hidden="true" />
            Browse repositories
          </Link>
        </div>
      </div>

      {oauthBanner ? (
        <div
          role="status"
          className={cn(
            "mt-5 flex items-start justify-between gap-4 border px-4 py-3 text-sm",
            oauthBanner.tone === "good"
              ? "border-signal/40 bg-signal/10 text-paper-dim"
              : "border-warning/40 bg-warning/10 text-paper-dim",
          )}
        >
          <span className="flex items-start gap-2">
            {oauthBanner.tone === "good" ? (
              <CheckCircle2 className="mt-0.5 size-4 text-signal" aria-hidden="true" />
            ) : (
              <KeyRound className="mt-0.5 size-4 text-warning" aria-hidden="true" />
            )}
            {oauthBanner.message}
          </span>
          <button
            type="button"
            onClick={dismissOauthBanner}
            aria-label="Dismiss"
            className="text-muted hover:text-paper"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      {notice ? (
        <p role="status" className="mt-4 border border-line bg-ink-800/60 px-4 py-3 text-sm text-paper-dim">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-4 border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </p>
      ) : null}

      <div className="mt-6 space-y-6">
        <AdminPanel
          title="Connection"
          description="Sign in with GitHub. You do not need to paste an access token."
          actions={
            status.data ? (
              <div className="flex flex-wrap items-center gap-2">
                {connected ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void connect()}
                      disabled={busy !== null}
                      className={buttonStyles("outline", "sm")}
                    >
                      {busy === "connect" ? (
                        <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <KeyRound className="size-3.5" aria-hidden="true" />
                      )}
                      Reconnect
                    </button>
                    <button
                      type="button"
                      onClick={refresh}
                      disabled={busy !== null}
                      className={buttonStyles("outline", "sm")}
                    >
                      <RefreshCw
                        className={cn("size-3.5", busy === "refresh" && "animate-spin")}
                        aria-hidden="true"
                      />
                      Refresh
                    </button>
                    <button
                      type="button"
                      onClick={disconnect}
                      disabled={busy !== null}
                      className={buttonStyles("danger", "sm")}
                    >
                      <Unlink className="size-3.5" aria-hidden="true" />
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => void connect()}
                    disabled={busy !== null || !configured}
                    className={buttonStyles("primary", "sm")}
                  >
                    {busy === "connect" ? (
                      <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <GitBranch className="size-3.5" aria-hidden="true" />
                    )}
                    Connect GitHub
                  </button>
                )}
              </div>
            ) : null
          }
        >
          {status.loading ? <LoadingState rows={2} label="Loading GitHub connection" /> : null}
          {!status.loading && status.error ? (
            <ErrorState
              message="We couldn't load the GitHub connection. Please try again."
              onRetry={status.reload}
            />
          ) : null}
          {!status.loading && status.data ? (
            <div className="space-y-5">
              <AccountPanel status={status.data} />
              {status.data.message ? (
                <p className="text-xs leading-relaxed text-muted">{status.data.message}</p>
              ) : null}
            </div>
          ) : null}
        </AdminPanel>

        <AdminPanel
          title="How your data is protected"
          description="What the integration does to keep repository access safe."
        >
          <ul className="grid gap-4 text-sm leading-relaxed text-paper-dim sm:grid-cols-2">
            <li className="flex gap-3">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden="true" />
              <span>
                Access tokens are stored encrypted and are never written to logs or sent to this
                browser.
              </span>
            </li>
            <li className="flex gap-3">
              <Link2 className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden="true" />
              <span>
                Only a fixed list of documentation and setup files is read. Files such as
                <code className="mx-1 font-mono text-[0.72em]">.env</code>, keys and credentials
                are blocked before any request is made.
              </span>
            </li>
            <li className="flex gap-3">
              <GitBranch className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden="true" />
              <span>
                Only the permissions needed are requested. Private repositories need the wider
                <code className="mx-1 font-mono text-[0.72em]">repo</code> permission and must be
                enabled on the server.
              </span>
            </li>
            <li className="flex gap-3">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden="true" />
              <span>
                An import always creates a draft. You decide whether to publish it, and you
                edit the categories, case study and images.
              </span>
            </li>
          </ul>
        </AdminPanel>

        <ImportHistory />
      </div>
    </>
  );
}
