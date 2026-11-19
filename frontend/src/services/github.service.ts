import type {
  GitHubConnectResult,
  GitHubConnection,
  GitHubContents,
  GitHubImages,
  GitHubImportLogList,
  GitHubImportRequest,
  GitHubImportResult,
  GitHubProjectLink,
  GitHubReadme,
  GitHubRepository,
  GitHubRepositoryList,
  GitHubStatus,
  GitHubSyncResult,
  RepositoryInspection,
} from "@/types/api";

import { apiRequest } from "./api";

export interface RepositoryQuery {
  search?: string;
  visibility?: "public" | "private";
  archived?: "true" | "false";
  fork?: "true" | "false";
  language?: string;
  page?: number;
  per_page?: number;
  refresh?: boolean;
}

function repositoryQuery(params: RepositoryQuery): string {
  const query = new URLSearchParams();
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.visibility) query.set("visibility", params.visibility);
  if (params.archived) query.set("archived", params.archived);
  if (params.fork) query.set("fork", params.fork);
  if (params.language) query.set("language", params.language);
  if (params.page) query.set("page", String(params.page));
  if (params.per_page) query.set("per_page", String(params.per_page));
  if (params.refresh) query.set("refresh", "true");
  return query.toString();
}

export const githubService = {
  status(signal?: AbortSignal): Promise<GitHubStatus> {
    return apiRequest<GitHubStatus>("/api/v1/integrations/github/status", { signal });
  },

  connect(): Promise<GitHubConnectResult> {
    return apiRequest<GitHubConnectResult>("/api/v1/integrations/github/connect");
  },

  disconnect(): Promise<GitHubStatus> {
    return apiRequest<GitHubStatus>("/api/v1/integrations/github/disconnect", {
      method: "POST",
    });
  },

  refreshConnection(): Promise<GitHubConnection> {
    return apiRequest<GitHubConnection>("/api/v1/integrations/github/refresh", {
      method: "POST",
    });
  },

  listRepositories(
    params: RepositoryQuery = {},
    signal?: AbortSignal,
  ): Promise<GitHubRepositoryList> {
    const suffix = repositoryQuery(params);
    return apiRequest<GitHubRepositoryList>(
      `/api/v1/github/repositories${suffix ? `?${suffix}` : ""}`,
      { signal },
    );
  },

  getRepository(id: string, signal?: AbortSignal): Promise<GitHubRepository> {
    return apiRequest<GitHubRepository>(`/api/v1/github/repositories/${id}`, { signal });
  },

  getContents(
    id: string,
    path = "",
    signal?: AbortSignal,
  ): Promise<GitHubContents> {
    const suffix = path ? `?path=${encodeURIComponent(path)}` : "";
    return apiRequest<GitHubContents>(
      `/api/v1/github/repositories/${id}/contents${suffix}`,
      { signal },
    );
  },

  getReadme(id: string, signal?: AbortSignal): Promise<GitHubReadme> {
    return apiRequest<GitHubReadme>(`/api/v1/github/repositories/${id}/readme`, {
      signal,
    });
  },

  getImages(id: string, signal?: AbortSignal): Promise<GitHubImages> {
    return apiRequest<GitHubImages>(`/api/v1/github/repositories/${id}/images`, {
      signal,
    });
  },

  getInspection(id: string, signal?: AbortSignal): Promise<RepositoryInspection> {
    return apiRequest<RepositoryInspection>(
      `/api/v1/github/repositories/${id}/inspection`,
      { signal },
    );
  },

  importRepository(
    id: string,
    payload: GitHubImportRequest,
  ): Promise<GitHubImportResult> {
    return apiRequest<GitHubImportResult>(
      `/api/v1/admin/projects/import/github/${id}`,
      { method: "POST", body: payload },
    );
  },

  projectLink(projectId: string, signal?: AbortSignal): Promise<GitHubProjectLink> {
    return apiRequest<GitHubProjectLink>(`/api/v1/admin/projects/${projectId}/github`, {
      signal,
    });
  },

  syncProject(projectId: string): Promise<GitHubSyncResult> {
    return apiRequest<GitHubSyncResult>(
      `/api/v1/admin/projects/${projectId}/github-sync`,
      { method: "POST" },
    );
  },

  disconnectProject(projectId: string): Promise<GitHubProjectLink> {
    return apiRequest<GitHubProjectLink>(
      `/api/v1/admin/projects/${projectId}/github-disconnect`,
      { method: "POST" },
    );
  },

  logs(
    params: { limit?: number; offset?: number } = {},
    signal?: AbortSignal,
  ): Promise<GitHubImportLogList> {
    const query = new URLSearchParams();
    if (params.limit) query.set("limit", String(params.limit));
    if (params.offset) query.set("offset", String(params.offset));
    const suffix = query.toString() ? `?${query}` : "";
    return apiRequest<GitHubImportLogList>(
      `/api/v1/admin/integrations/github/logs${suffix}`,
      { signal },
    );
  },
};
