import type { SiteProfile } from "@/types/api";

import { apiRequest } from "./api";

export const profileService = {
  get(signal?: AbortSignal): Promise<SiteProfile> {
    return apiRequest<SiteProfile>("/api/v1/profile", { signal });
  },
};
