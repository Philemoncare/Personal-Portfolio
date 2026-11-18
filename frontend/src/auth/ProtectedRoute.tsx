import { Navigate, Outlet, useLocation } from "react-router-dom";

import { ErrorState, LoadingState } from "@/components/ui/states";
import { useAuth } from "@/auth/useAuth";

/** Blocks protected pages until `/auth/me` has resolved. */
export function ProtectedRoute() {
  const { status, admin, error, refresh } = useAuth();
  const location = useLocation();

  if (status === "initializing") {
    return (
      <div className="mx-auto max-w-2xl px-5 py-24">
        <LoadingState label="Checking administrator session" rows={2} />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto max-w-2xl px-5 py-24">
        <ErrorState
          message={error ?? "The administrator session could not be checked."}
          onRetry={refresh}
        />
      </div>
    );
  }

  if (status === "must_change_password") {
    return <Navigate to="/change-password" replace />;
  }

  if (!admin) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname, message: error ?? undefined }}
      />
    );
  }

  return <Outlet context={admin} />;
}
