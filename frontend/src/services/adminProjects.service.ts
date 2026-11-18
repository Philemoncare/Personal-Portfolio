import type {
  AdminCaseStudy,
  AdminProject,
  AdminReference,
  CaseStudySectionKey,
  PublishStatus,
  ProjectInput,
} from "@/types/api";

import { apiRequest } from "./api";

export interface AdminCaseStudyInput {
  project_id: string | null;
  title: string;
  slug: string | null;
  summary: string | null;
  overview: string | null;
  problem: string | null;
  context: string | null;
  goals: string | null;
  idea: string | null;
  research: string | null;
  planning: string | null;
  design: string | null;
  solution: string | null;
  role: string | null;
  architecture: string | null;
  technology: string | null;
  key_features: string | null;
  technical_decisions: string | null;
  challenges: string | null;
  implementation: string | null;
  testing: string | null;
  results: string | null;
  result_type: string | null;
  lessons: string | null;
  future_improvements: string | null;
  hidden_sections: CaseStudySectionKey[];
  featured: boolean;
  sort_order: number;
  status: PublishStatus;
  is_placeholder: boolean;
}

export const adminProjectsService = {
  reference(signal?: AbortSignal): Promise<AdminReference> {
    return apiRequest<AdminReference>("/api/v1/admin/reference", { signal });
  },

  listProjects(
    params: { status?: PublishStatus; search?: string } = {},
    signal?: AbortSignal,
  ): Promise<AdminProject[]> {
    const query = new URLSearchParams();
    if (params.status) query.set("status", params.status);
    if (params.search?.trim()) query.set("search", params.search.trim());
    const suffix = query.toString() ? `?${query}` : "";
    return apiRequest<AdminProject[]>(`/api/v1/admin/projects${suffix}`, { signal });
  },

  getProject(id: string, signal?: AbortSignal): Promise<AdminProject> {
    return apiRequest<AdminProject>(`/api/v1/admin/projects/${id}`, { signal });
  },

  createProject(payload: ProjectInput): Promise<AdminProject> {
    return apiRequest<AdminProject>("/api/v1/admin/projects", {
      method: "POST",
      body: payload,
    });
  },

  updateProject(id: string, payload: ProjectInput): Promise<AdminProject> {
    return apiRequest<AdminProject>(`/api/v1/admin/projects/${id}`, {
      method: "PUT",
      body: payload,
    });
  },

  deleteProject(id: string): Promise<void> {
    return apiRequest<void>(`/api/v1/admin/projects/${id}`, { method: "DELETE" });
  },

  refreshGitHub(id: string): Promise<AdminProject> {
    return apiRequest<AdminProject>(`/api/v1/admin/projects/${id}/github`, {
      method: "POST",
    });
  },

  duplicateProject(id: string): Promise<AdminProject> {
    return apiRequest<AdminProject>(`/api/v1/admin/projects/${id}/duplicate`, {
      method: "POST",
    });
  },

  setProjectStatus(id: string, status: PublishStatus): Promise<AdminProject> {
    return apiRequest<AdminProject>(`/api/v1/admin/projects/${id}/status`, {
      method: "PATCH",
      body: { status },
    });
  },

  reorderProjects(ids: string[]): Promise<{ updated: number }> {
    return apiRequest<{ updated: number }>("/api/v1/admin/projects/reorder", {
      method: "POST",
      body: { ids },
    });
  },

  listCaseStudies(signal?: AbortSignal): Promise<AdminCaseStudy[]> {
    return apiRequest<AdminCaseStudy[]>("/api/v1/admin/case-studies", { signal });
  },

  getCaseStudy(id: string, signal?: AbortSignal): Promise<AdminCaseStudy> {
    return apiRequest<AdminCaseStudy>(`/api/v1/admin/case-studies/${id}`, { signal });
  },

  createCaseStudy(payload: AdminCaseStudyInput): Promise<AdminCaseStudy> {
    return apiRequest<AdminCaseStudy>("/api/v1/admin/case-studies", {
      method: "POST",
      body: payload,
    });
  },

  updateCaseStudy(id: string, payload: AdminCaseStudyInput): Promise<AdminCaseStudy> {
    return apiRequest<AdminCaseStudy>(`/api/v1/admin/case-studies/${id}`, {
      method: "PUT",
      body: payload,
    });
  },

  deleteCaseStudy(id: string): Promise<void> {
    return apiRequest<void>(`/api/v1/admin/case-studies/${id}`, { method: "DELETE" });
  },
};
