import type { Admin } from "@/types/api";

export type AuthStatus =
  | "initializing"
  | "authenticated"
  | "must_change_password"
  | "unauthenticated"
  | "error";

export interface AuthContextValue {
  status: AuthStatus;
  admin: Admin | null;
  error: string | null;
  /** Re-check `/auth/me`; used after login, OTP verification and expiry. */
  refresh: () => Promise<Admin | null>;
  signOut: () => Promise<void>;
}
