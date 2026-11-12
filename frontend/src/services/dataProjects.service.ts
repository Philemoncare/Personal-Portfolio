import type {
  DataCategory,
  DataProjectDetail,
  DataProjectSummary,
  DataProjectType,
  DataTool,
  ListResponse,
} from "@/types/api";

import { apiRequest } from "./api";

export interface DataProjectListParams {
  category?: string;
  tool?: string;
  projectType?: DataProjectType;
  featured?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  const serialised = query.toString();
  return serialised ? `?${serialised}` : "";
}

export const dataProjectsService = {
  list(
    params: DataProjectListParams = {},
    signal?: AbortSignal,
  ): Promise<ListResponse<DataProjectSummary>> {
    return apiRequest<ListResponse<DataProjectSummary>>(
      `/api/v1/data-projects${buildQuery({
        category: params.category,
        tool: params.tool,
        project_type: params.projectType,
        featured: params.featured,
        search: params.search,
        limit: params.limit,
        offset: params.offset,
      })}`,
      { signal },
    );
  },

  getFeatured(limit = 3, signal?: AbortSignal): Promise<ListResponse<DataProjectSummary>> {
    return apiRequest<ListResponse<DataProjectSummary>>(
      `/api/v1/data-projects/featured${buildQuery({ limit })}`,
      { signal },
    );
  },

  getBySlug(slug: string, signal?: AbortSignal): Promise<DataProjectDetail> {
    return apiRequest<DataProjectDetail>(
      `/api/v1/data-projects/${encodeURIComponent(slug)}`,
      { signal },
    );
  },

  getCategories(signal?: AbortSignal): Promise<DataCategory[]> {
    return apiRequest<DataCategory[]>("/api/v1/data-projects/categories", { signal });
  },

  getTools(signal?: AbortSignal): Promise<DataTool[]> {
    return apiRequest<DataTool[]>("/api/v1/data-projects/tools", { signal });
  },
};
