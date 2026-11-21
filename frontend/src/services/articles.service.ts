import type { ArticleDetail, ArticleSummary } from "@/types/api";

import { apiRequest } from "./api";

export const articlesService = {
  list(signal?: AbortSignal): Promise<ArticleSummary[]> {
    return apiRequest<ArticleSummary[]>("/api/v1/articles", { signal });
  },
  getBySlug(slug: string, signal?: AbortSignal): Promise<ArticleDetail> {
    return apiRequest<ArticleDetail>(`/api/v1/articles/${encodeURIComponent(slug)}`, {
      signal,
    });
  },
};
