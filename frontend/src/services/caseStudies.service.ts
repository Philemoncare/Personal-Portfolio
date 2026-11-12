import type { CaseStudyDetail, CaseStudySummary, ListResponse } from "@/types/api";

import { apiRequest } from "./api";

export const caseStudiesService = {
  list(signal?: AbortSignal): Promise<ListResponse<CaseStudySummary>> {
    return apiRequest<ListResponse<CaseStudySummary>>("/api/v1/case-studies", {
      signal,
    });
  },

  getBySlug(slug: string, signal?: AbortSignal): Promise<CaseStudyDetail> {
    return apiRequest<CaseStudyDetail>(
      `/api/v1/case-studies/${encodeURIComponent(slug)}`,
      { signal },
    );
  },
};
