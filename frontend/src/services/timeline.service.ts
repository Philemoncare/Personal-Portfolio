import type { TimelineEntry } from "@/types/api";

import { apiRequest } from "./api";

export const timelineService = {
  getEntries(signal?: AbortSignal): Promise<TimelineEntry[]> {
    return apiRequest<TimelineEntry[]>("/api/v1/timeline", { signal });
  },
};
