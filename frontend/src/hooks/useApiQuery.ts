import { useCallback, useEffect, useRef, useState } from "react";
import type { DependencyList } from "react";

import { ApiError } from "@/services/api";

interface ApiQueryState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

/**
 * Runs a typed service function with loading, error, abort, and retry
 * handling. Components should use the content hooks instead of calling
 * services directly.
 */
export function useApiQuery<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: DependencyList = [],
) {
  const [state, setState] = useState<ApiQueryState<T>>({
    data: null,
    loading: true,
    error: null,
  });
  const [revision, setRevision] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    const controller = new AbortController();
    setState((current) => ({ data: current.data, loading: true, error: null }));

    fetcherRef
      .current(controller.signal)
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({
          data: null,
          loading: false,
          error:
            error instanceof ApiError
              ? error
              : new ApiError(0, "Something went wrong while loading this content."),
        });
      });

    return () => controller.abort();
  }, [revision, ...deps]);

  const reload = useCallback(() => setRevision((value) => value + 1), []);

  return { ...state, reload };
}
