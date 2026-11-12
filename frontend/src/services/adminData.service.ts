import type {
  AdminDataProject,
  DataCategory,
  DataProjectInput,
  DataProjectStatus,
  DataReference,
  DataTool,
} from "@/types/api";

import { apiRequest } from "./api";

export interface DataTaxonomyInput {
  name: string;
  description?: string | null;
  kind?: string;
  sort_order?: number;
}

function query(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const serialised = search.toString();
  return serialised ? `?${serialised}` : "";
}

export const adminDataService = {
  reference(signal?: AbortSignal): Promise<DataReference> {
    return apiRequest<DataReference>("/api/v1/admin/data/reference", { signal });
  },

  listProjects(
    params: { status?: DataProjectStatus; search?: string } = {},
    signal?: AbortSignal,
  ): Promise<AdminDataProject[]> {
    return apiRequest<AdminDataProject[]>(
      `/api/v1/admin/data-projects${query({
        status: params.status,
        search: params.search?.trim(),
      })}`,
      { signal },
    );
  },

  getProject(id: string, signal?: AbortSignal): Promise<AdminDataProject> {
    return apiRequest<AdminDataProject>(`/api/v1/admin/data-projects/${id}`, {
      signal,
    });
  },

  createProject(payload: DataProjectInput): Promise<AdminDataProject> {
    return apiRequest<AdminDataProject>("/api/v1/admin/data-projects", {
      method: "POST",
      body: payload,
    });
  },

  updateProject(id: string, payload: DataProjectInput): Promise<AdminDataProject> {
    return apiRequest<AdminDataProject>(`/api/v1/admin/data-projects/${id}`, {
      method: "PUT",
      body: payload,
    });
  },

  deleteProject(id: string): Promise<void> {
    return apiRequest<void>(`/api/v1/admin/data-projects/${id}`, {
      method: "DELETE",
    });
  },

  setStatus(id: string, status: DataProjectStatus): Promise<AdminDataProject> {
    return apiRequest<AdminDataProject>(
      `/api/v1/admin/data-projects/${id}/status`,
      { method: "PATCH", body: { status } },
    );
  },

  createCategory(payload: DataTaxonomyInput): Promise<DataCategory> {
    return apiRequest<DataCategory>("/api/v1/admin/data/categories", {
      method: "POST",
      body: payload,
    });
  },

  createTool(payload: DataTaxonomyInput): Promise<DataTool> {
    return apiRequest<DataTool>("/api/v1/admin/data/tools", {
      method: "POST",
      body: payload,
    });
  },
};
