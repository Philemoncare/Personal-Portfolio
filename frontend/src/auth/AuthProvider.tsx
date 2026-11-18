import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { ApiError, AUTH_EXPIRED_EVENT } from "@/services/api";
import { getCurrentAdmin, logout } from "@/services/auth.service";
import type { Admin } from "@/types/api";
import type { AuthContextValue, AuthStatus } from "@/auth/authTypes";

export const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthState {
  status: AuthStatus;
  admin: Admin | null;
  error: string | null;
}

const INITIAL: AuthState = { status: "initializing", admin: null, error: null };

/**
 * Single source of frontend authentication state.
 *
 * The cookie is the credential; this provider only mirrors what the backend
 * reports at `/auth/me`. Nothing here is persisted to localStorage.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(INITIAL);

  const refresh = useCallback(async (): Promise<Admin | null> => {
    try {
      const admin = await getCurrentAdmin();
      setState({
        status: admin.must_change_password ? "must_change_password" : "authenticated",
        admin,
        error: null,
      });
      return admin;
    } catch (cause) {
      if (
        cause instanceof ApiError &&
        cause.status === 403 &&
        /password change required/i.test(cause.detail)
      ) {
        setState({ status: "must_change_password", admin: null, error: cause.detail });
        return null;
      }
      if (cause instanceof ApiError && cause.status === 401) {
        setState({ status: "unauthenticated", admin: null, error: null });
        return null;
      }
      setState({
        status: "error",
        admin: null,
        error:
          cause instanceof ApiError
            ? cause.detail
            : "The administrator session could not be checked.",
      });
      return null;
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onExpired = () =>
      setState({
        status: "unauthenticated",
        admin: null,
        error: "Your session expired. Sign in again.",
      });
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logout();
    } finally {
      setState({ status: "unauthenticated", admin: null, error: null });
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, refresh, signOut }),
    [state, refresh, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
