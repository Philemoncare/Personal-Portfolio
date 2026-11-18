import { useContext } from "react";

import { AuthContext } from "@/auth/AuthProvider";
import type { AuthContextValue } from "@/auth/authTypes";

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside an AuthProvider.");
  }
  return value;
}
