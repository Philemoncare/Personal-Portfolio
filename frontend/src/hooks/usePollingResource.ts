import { useCallback, useEffect, useRef, useState } from "react";
import type { DependencyList } from "react";

import { ApiError } from "@/services/api";

interface PolledState<T> {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: ApiError | null;
  lastUpdated: Date | null;
}

/**
 * Fetch on mount, on demand, and on an interval.
 *
 * Polling is deliberate: the security dashboard must reflect new events
 * without a page reload, and a 10-15 second cadence is sufficient without
 * adding WebSocket infrastructure.
 */
export function usePollingResource<T>(
  fetcher: () => Promise<T>,
  deps: DependencyList = [],
  intervalMs = 12_000,
) {
  const [state, setState] = useState<PolledState<T>>({
    data: null,
    loading: true,
    refreshing: false,
    error: null,
    lastUpdated: null,
  });
  const [revision, setRevision] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let active = true;
    let timer: number | undefined;

    const run = async (initial: boolean) => {
      setState((current) => ({
        ...current,
        loading: initial && !current.data,
        refreshing: !initial || Boolean(current.data),
        error: initial ? null : current.error,
      }));

      try {
        const data = await fetcherRef.current();
        if (!active) return;
        setState({
          data,
          loading: false,
          refreshing: false,
          error: null,
          lastUpdated: new Date(),
        });
      } catch (cause) {
        if (!active) return;
        setState((current) => ({
          ...current,
          loading: false,
          refreshing: false,
          error:
            cause instanceof ApiError
              ? cause
              : new ApiError(0, "The security data could not be loaded."),
        }));
      }
    };

    void run(true);
    timer = window.setInterval(() => void run(false), intervalMs);

    return () => {
      active = false;
      if (timer) window.clearInterval(timer);
    };
    // The fetcher ref always points at the latest closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, revision, ...deps]);

  const reload = useCallback(() => setRevision((value) => value + 1), []);

  return { ...state, reload };
}
