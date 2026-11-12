import type { LeadershipEntry } from "@/types/api";

import { apiRequest } from "./api";

export const leadershipService = {
  getEntries(signal?: AbortSignal): Promise<LeadershipEntry[]> {
    return apiRequest<LeadershipEntry[]>("/api/v1/leadership", { signal });
  },
};
