import type { SiteSettings } from "@/types/api";

import { apiRequest } from "./api";

export const settingsService = {
  getPublic(signal?: AbortSignal): Promise<SiteSettings> {
    return apiRequest<SiteSettings>("/api/v1/site-settings/public", { signal });
  },
};
