import { createContext, useContext } from "react";
import type { ReactNode } from "react";

import { useApiQuery } from "@/hooks/useApiQuery";
import { settingsService } from "@/services/settings.service";
import type { SiteSettings } from "@/types/api";

interface SiteSettingsContextValue {
  settings: SiteSettings | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

const SiteSettingsContext = createContext<SiteSettingsContextValue | null>(null);

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const { data, loading, error, reload } = useApiQuery<SiteSettings>(
    (signal) => settingsService.getPublic(signal),
    [],
  );

  return (
    <SiteSettingsContext.Provider
      value={{
        settings: data,
        loading,
        error: error?.detail ?? null,
        reload,
      }}
    >
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings(): SiteSettingsContextValue {
  const context = useContext(SiteSettingsContext);
  if (!context) {
    throw new Error("useSiteSettings must be used within SiteSettingsProvider");
  }
  return context;
}
