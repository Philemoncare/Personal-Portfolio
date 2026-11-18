import type { ExperienceEntry, LeadershipEntry } from "@/types/api";

import { apiRequest } from "./api";

export const experienceService = {
  getEntries(signal?: AbortSignal): Promise<ExperienceEntry[]> {
    return apiRequest<ExperienceEntry[]>("/api/v1/experience", { signal });
  },
  getBySlug(slug: string, signal?: AbortSignal): Promise<ExperienceEntry> {
    return apiRequest<ExperienceEntry>(
      `/api/v1/experience/${encodeURIComponent(slug)}`,
      { signal },
    );
  },
};

export const leadershipDetailService = {
  getBySlug(slug: string, signal?: AbortSignal): Promise<LeadershipEntry> {
    return apiRequest<LeadershipEntry>(
      `/api/v1/leadership/${encodeURIComponent(slug)}`,
      { signal },
    );
  },
};
