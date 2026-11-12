import type {
  ListResponse,
  ProjectCategory,
  ProjectDetail,
  ProjectStage,
  ProjectSummary,
  Technology,
  WorkMode,
} from "@/types/api";

import { apiRequest } from "./api";

export interface ProjectListParams {
  category?: string;
  technology?: string;
  status?: ProjectStage;
  mode?: WorkMode;
  featured?: boolean;
  search?: string;
  includeArchived?: boolean;
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

export const projectsService = {
  list(
    params: ProjectListParams = {},
    signal?: AbortSignal,
  ): Promise<ListResponse<ProjectSummary>> {
    return apiRequest<ListResponse<ProjectSummary>>(
      `/api/v1/projects${buildQuery({
        category: params.category,
        technology: params.technology,
        status: params.status,
        mode: params.mode,
        featured: params.featured,
        search: params.search,
        include_archived: params.includeArchived,
        limit: params.limit,
        offset: params.offset,
      })}`,
      { signal },
    );
  },

  getFeatured(limit = 4, signal?: AbortSignal): Promise<ListResponse<ProjectSummary>> {
    return apiRequest<ListResponse<ProjectSummary>>(
      `/api/v1/projects/featured${buildQuery({ limit })}`,
      { signal },
    );
  },

  getBySlug(slug: string, signal?: AbortSignal): Promise<ProjectDetail> {
    return apiRequest<ProjectDetail>(`/api/v1/projects/${encodeURIComponent(slug)}`, {
      signal,
    });
  },

  /** @deprecated Use getBySlug; retained so older imports keep working. */
  getById(slug: string, signal?: AbortSignal): Promise<ProjectDetail> {
    return projectsService.getBySlug(slug, signal);
  },

  getCategories(signal?: AbortSignal): Promise<ProjectCategory[]> {
    return apiRequest<ProjectCategory[]>("/api/v1/projects/categories", { signal });
  },

  getTechnologies(signal?: AbortSignal): Promise<Technology[]> {
    return apiRequest<Technology[]>("/api/v1/projects/technologies", { signal });
  },
};
