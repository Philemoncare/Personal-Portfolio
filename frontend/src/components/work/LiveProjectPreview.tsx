import {
  ArrowUpRight,
  Expand,
  Globe,
  LoaderCircle,
  Minimize2,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/utils/cn";

type PreviewState = "loading" | "ready" | "failed";

const LOAD_TIMEOUT_MS = 15_000;

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/**
 * Honest live preview.
 *
 * `embed_enabled` is the owner's permission to *attempt* an embed — it is not
 * proof that the host allows framing. The browser decides. We show a loading
 * state, a timeout/failure state, and always keep an external fallback. No
 * screenshot or mock UI is generated when embedding is blocked.
 */
export function LiveProjectPreview({
  url,
  title,
  embedEnabled,
  deploymentStatus,
}: {
  url: string | null;
  title: string;
  embedEnabled: boolean;
  deploymentStatus?: string;
}) {
  const [state, setState] = useState<PreviewState>("loading");
  const [expanded, setExpanded] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [userReportedBlock, setUserReportedBlock] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const allowed = Boolean(url && embedEnabled);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    setState("loading");
    setUserReportedBlock(false);
    if (!allowed) return;
    clearTimer();
    timeoutRef.current = window.setTimeout(() => {
      setState((current) => (current === "loading" ? "failed" : current));
    }, LOAD_TIMEOUT_MS);
    return clearTimer;
  }, [allowed, reloadKey, clearTimer]);

  useEffect(() => {
    if (!expanded) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [expanded]);

  const refresh = () => {
    setReloadKey((value) => value + 1);
  };

  const host = useMemo(() => (url ? hostOf(url) : null), [url]);

  if (!url || !embedEnabled) {
    return (
      <div className="border border-line bg-ink-800/30 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-paper">
              This project does not allow embedded viewing.
            </p>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
              {url
                ? "Embedding has not been enabled for this project, so no frame is attempted."
                : deploymentStatus && deploymentStatus !== "not_deployed"
                  ? "No public preview URL is available for this deployment yet."
                  : "No live URL has been published for this project yet."}
            </p>
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noreferrer noopener"
                className={buttonStyles("secondary", "sm", "mt-4")}
              >
                <Globe className="size-3.5" aria-hidden="true" />
                Open externally
                <ArrowUpRight className="size-3" aria-hidden="true" />
              </a>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  const showFailure = userReportedBlock || state === "failed";

  return (
    <div className="border border-line bg-ink-800/20">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Globe className="size-3.5 shrink-0 text-signal" aria-hidden="true" />
          <p className="truncate font-mono text-[0.56rem] uppercase tracking-[0.12em] text-muted">
            {host}
          </p>
          {state === "loading" && !showFailure ? (
            <span className="inline-flex items-center gap-1.5 text-faint">
              <LoaderCircle className="size-3 animate-spin" aria-hidden="true" />
              <span className="font-mono text-[0.52rem] uppercase tracking-[0.1em]">
                Loading
              </span>
            </span>
          ) : showFailure ? (
            <span className="font-mono text-[0.52rem] uppercase tracking-[0.1em] text-warning">
              Preview unavailable
            </span>
          ) : (
            <span className="font-mono text-[0.52rem] uppercase tracking-[0.1em] text-success">
              Frame loaded
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={refresh}
            className={buttonStyles("ghost", "sm", "px-2")}
            aria-label="Reload preview"
          >
            <RefreshCw className="size-3.5" aria-hidden="true" />
            Reload
          </button>
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className={buttonStyles("ghost", "sm", "px-2")}
            aria-label={expanded ? "Exit fullscreen preview" : "Open fullscreen preview"}
            aria-pressed={expanded}
          >
            {expanded ? (
              <Minimize2 className="size-3.5" aria-hidden="true" />
            ) : (
              <Expand className="size-3.5" aria-hidden="true" />
            )}
            {expanded ? "Exit" : "Fullscreen"}
          </button>
          <a
            href={url}
            target="_blank"
            rel="noreferrer noopener"
            className={buttonStyles("secondary", "sm")}
          >
            Open
            <ArrowUpRight className="size-3" aria-hidden="true" />
          </a>
        </div>
      </div>

      <div
        className={cn(
          "relative bg-ink-950",
          expanded
            ? "fixed inset-0 z-[70] flex flex-col"
            : "aspect-[16/10] min-h-[18rem]",
        )}
      >
        {expanded ? (
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <p className="truncate text-sm text-paper">
              {title} — live preview
            </p>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className={buttonStyles("secondary", "sm")}
            >
              <Minimize2 className="size-3.5" aria-hidden="true" />
              Exit fullscreen
            </button>
          </div>
        ) : null}

        <iframe
          key={reloadKey}
          title={`${title} live preview`}
          src={url}
          onLoad={() => {
            clearTimer();
            setState("ready");
          }}
          onError={() => {
            clearTimer();
            setState("failed");
          }}
          referrerPolicy="no-referrer"
          sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
          className={cn(
            "w-full border-0 bg-white",
            expanded ? "min-h-0 flex-1" : "absolute inset-0 h-full",
            showFailure && "opacity-0",
          )}
          aria-hidden={showFailure}
        />

        {showFailure ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 py-10 text-center">
            <ShieldAlert className="size-7 text-warning" aria-hidden="true" />
            <div>
              <p className="text-base font-medium text-paper">
                The preview could not be displayed.
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
                The site may block embedding with a security header, may be offline, or may
                be slow to respond. Nothing is simulated here — open the project directly
                instead.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={refresh}
                className={buttonStyles("secondary", "sm")}
              >
                <RefreshCw className="size-3.5" aria-hidden="true" />
                Try again
              </button>
              <a
                href={url}
                target="_blank"
                rel="noreferrer noopener"
                className={buttonStyles("primary", "sm")}
              >
                Open project
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-2.5">
        <p className="text-[0.68rem] leading-relaxed text-faint">
          Embedding depends on the project host. If the frame is blank, the site does not
          permit it.
        </p>
        {!showFailure ? (
          <button
            type="button"
            onClick={() => setUserReportedBlock(true)}
            className="font-mono text-[0.54rem] uppercase tracking-[0.1em] text-muted underline-offset-4 hover:text-paper hover:underline"
          >
            It isn&apos;t loading
          </button>
        ) : null}
      </div>
    </div>
  );
}
