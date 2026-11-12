import type { NowItem } from "@/types/api";

import { apiRequest } from "./api";

export const nowService = {
  getCurrentItems(signal?: AbortSignal): Promise<NowItem[]> {
    return apiRequest<NowItem[]>("/api/v1/now", { signal });
  },
};
