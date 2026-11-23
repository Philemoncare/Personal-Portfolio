import { apiPath, apiRequest } from "@/services/api";
import type {
  AnalyticsCollectInput,
  AnalyticsDevices,
  AnalyticsLocations,
  AnalyticsOverview,
  AnalyticsPages,
  AnalyticsRecent,
  AnalyticsSources,
  AnalyticsTrends,
} from "@/types/api";

export type AnalyticsPeriod = "today" | "7d" | "30d" | "12m";

export const analyticsService = {
  async collect(payload: AnalyticsCollectInput): Promise<{ recorded: boolean }> {
    try {
      return await apiRequest<{ recorded: boolean }>("/api/v1/analytics/collect", {
        method: "POST",
        body: payload,
      });
    } catch {
      return { recorded: false };
    }
  },

  async overview(period: AnalyticsPeriod = "30d", signal?: AbortSignal): Promise<AnalyticsOverview> {
    return apiRequest<AnalyticsOverview>(`/api/v1/admin/analytics/overview?period=${period}`, {
      signal,
    });
  },

  async trends(period: AnalyticsPeriod = "7d", signal?: AbortSignal): Promise<AnalyticsTrends> {
    return apiRequest<AnalyticsTrends>(`/api/v1/admin/analytics/trends?period=${period}`, {
      signal,
    });
  },

  async pages(period: AnalyticsPeriod = "30d", limit = 20, signal?: AbortSignal): Promise<AnalyticsPages> {
    return apiRequest<AnalyticsPages>(
      `/api/v1/admin/analytics/pages?period=${period}&limit=${limit}`,
      { signal },
    );
  },

  async sources(period: AnalyticsPeriod = "30d", signal?: AbortSignal): Promise<AnalyticsSources> {
    return apiRequest<AnalyticsSources>(`/api/v1/admin/analytics/sources?period=${period}`, {
      signal,
    });
  },

  async devices(period: AnalyticsPeriod = "30d", signal?: AbortSignal): Promise<AnalyticsDevices> {
    return apiRequest<AnalyticsDevices>(`/api/v1/admin/analytics/devices?period=${period}`, {
      signal,
    });
  },

  async locations(period: AnalyticsPeriod = "30d", signal?: AbortSignal): Promise<AnalyticsLocations> {
    return apiRequest<AnalyticsLocations>(`/api/v1/admin/analytics/locations?period=${period}`, {
      signal,
    });
  },

  async recent(limit = 20, signal?: AbortSignal): Promise<AnalyticsRecent> {
    return apiRequest<AnalyticsRecent>(`/api/v1/admin/analytics/recent?limit=${limit}`, {
      signal,
    });
  },

  exportUrl(period: AnalyticsPeriod = "30d", format: "csv" | "json" = "csv"): string {
    return apiPath(`/api/v1/admin/analytics/export?period=${period}&format=${format}`);
  },
};
