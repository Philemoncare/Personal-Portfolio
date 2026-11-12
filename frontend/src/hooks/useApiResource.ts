import { useCallback, useEffect, useState } from "react";

import { apiRequest, ApiError } from "@/services/api";

interface ApiResourceState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

/**
 * Fetch a versioned API path with loading, error, abort, and retry handling.
 * Pass null to skip the request (for example while an id is not available).
 */
export function useApiResource<T>(path: string | null) {
  const [state, setState] = useState<ApiResourceState<T>>({
    data: null,
    loading: path !== null,
    error: null,
  });
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (path === null) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    const controller = new AbortController();
    setState((current) => ({ data: current.data, loading: true, error: null }));

    apiRequest<T>(path, { signal: controller.signal })
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
  }, [path, revision]);

  const reload = useCallback(() => setRevision((value) => value + 1), []);

  return { ...state, reload };
}
