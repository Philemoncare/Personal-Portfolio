import type {
  AdminMessageList,
  AdminSettings,
  AdminSettingsInput,
  ArticleAdmin,
  ArticleInput,
  ContentReference,
  NowAdminItem,
  NowInput,
  ProfileAdmin,
  ProfileInput,
  ResumeAdmin,
  ResumePatch,
  SiteSettingsAdmin,
  TimelineAdminEntry,
  TimelineInput,
} from "@/types/api";

import { apiRequest } from "./api";

export const adminContentService = {
  // --- Profile ----------------------------------------------------------
  getProfile(signal?: AbortSignal): Promise<ProfileAdmin> {
    return apiRequest<ProfileAdmin>("/api/v1/admin/profile", { signal });
  },
  updateProfile(payload: ProfileInput): Promise<ProfileAdmin> {
    return apiRequest<ProfileAdmin>("/api/v1/admin/profile", {
      method: "PUT",
      body: payload,
    });
  },

  // --- Settings ---------------------------------------------------------
  getSettings(signal?: AbortSignal): Promise<AdminSettings> {
    return apiRequest<AdminSettings>("/api/v1/admin/settings", { signal });
  },
  updateSettings(payload: AdminSettingsInput): Promise<AdminSettings> {
    return apiRequest<AdminSettings>("/api/v1/admin/settings", {
      method: "PUT",
      body: payload,
    });
  },
  updateSiteSettings(payload: AdminSettings): Promise<SiteSettingsAdmin> {
    return apiRequest<AdminSettings>("/api/v1/admin/settings", {
      method: "PUT",
      body: {
        profile: toProfileInput(payload.profile),
        site: toSiteInput(payload.site),
      },
    }).then((result) => result.site);
  },

  // --- Reference data ---------------------------------------------------
  getReference(signal?: AbortSignal): Promise<ContentReference> {
    return apiRequest<ContentReference>("/api/v1/admin/content-reference", {
      signal,
    });
  },

  // --- Now --------------------------------------------------------------
  listNow(signal?: AbortSignal): Promise<NowAdminItem[]> {
    return apiRequest<NowAdminItem[]>("/api/v1/admin/now", { signal });
  },
  createNow(payload: NowInput): Promise<NowAdminItem> {
    return apiRequest<NowAdminItem>("/api/v1/admin/now", {
      method: "POST",
      body: payload,
    });
  },
  updateNow(id: string, payload: NowInput): Promise<NowAdminItem> {
    return apiRequest<NowAdminItem>(`/api/v1/admin/now/${id}`, {
      method: "PUT",
      body: payload,
    });
  },
  deleteNow(id: string): Promise<void> {
    return apiRequest<void>(`/api/v1/admin/now/${id}`, { method: "DELETE" });
  },

  // --- Timeline ---------------------------------------------------------
  listTimeline(signal?: AbortSignal): Promise<TimelineAdminEntry[]> {
    return apiRequest<TimelineAdminEntry[]>("/api/v1/admin/timeline", { signal });
  },
  createTimeline(payload: TimelineInput): Promise<TimelineAdminEntry> {
    return apiRequest<TimelineAdminEntry>("/api/v1/admin/timeline", {
      method: "POST",
      body: payload,
    });
  },
  updateTimeline(id: string, payload: TimelineInput): Promise<TimelineAdminEntry> {
    return apiRequest<TimelineAdminEntry>(`/api/v1/admin/timeline/${id}`, {
      method: "PUT",
      body: payload,
    });
  },
  deleteTimeline(id: string): Promise<void> {
    return apiRequest<void>(`/api/v1/admin/timeline/${id}`, { method: "DELETE" });
  },

  // --- Articles ---------------------------------------------------------
  listArticles(signal?: AbortSignal): Promise<ArticleAdmin[]> {
    return apiRequest<ArticleAdmin[]>("/api/v1/admin/articles", { signal });
  },
  getArticle(id: string, signal?: AbortSignal): Promise<ArticleAdmin> {
    return apiRequest<ArticleAdmin>(`/api/v1/admin/articles/${id}`, { signal });
  },
  createArticle(payload: ArticleInput): Promise<ArticleAdmin> {
    return apiRequest<ArticleAdmin>("/api/v1/admin/articles", {
      method: "POST",
      body: payload,
    });
  },
  updateArticle(id: string, payload: ArticleInput): Promise<ArticleAdmin> {
    return apiRequest<ArticleAdmin>(`/api/v1/admin/articles/${id}`, {
      method: "PUT",
      body: payload,
    });
  },
  reorderArticles(ids: string[]): Promise<{ updated: number }> {
    return apiRequest<{ updated: number }>("/api/v1/admin/articles/reorder", {
      method: "POST",
      body: { ids },
    });
  },
  deleteArticle(id: string): Promise<void> {
    return apiRequest<void>(`/api/v1/admin/articles/${id}`, { method: "DELETE" });
  },

  // --- Resume -----------------------------------------------------------
  listResumes(signal?: AbortSignal): Promise<ResumeAdmin[]> {
    return apiRequest<ResumeAdmin[]>("/api/v1/admin/resume", { signal });
  },
  uploadResume(
    file: File,
    fields: {
      title: string;
      version_label: string;
      publish_status: string;
      is_current: boolean;
    },
  ): Promise<ResumeAdmin> {
    const body = new FormData();
    body.append("title", fields.title);
    body.append("version_label", fields.version_label);
    body.append("publish_status", fields.publish_status);
    body.append("is_current", String(fields.is_current));
    body.append("file", file);
    return apiRequest<ResumeAdmin>("/api/v1/admin/resume", {
      method: "POST",
      body,
    });
  },
  patchResume(id: string, payload: ResumePatch): Promise<ResumeAdmin> {
    return apiRequest<ResumeAdmin>(`/api/v1/admin/resume/${id}`, {
      method: "PATCH",
      body: payload,
    });
  },
  deleteResume(id: string): Promise<void> {
    return apiRequest<void>(`/api/v1/admin/resume/${id}`, { method: "DELETE" });
  },

  // --- Messages ---------------------------------------------------------
  listMessages(
    params: { status?: string; search?: string } = {},
    signal?: AbortSignal,
  ): Promise<AdminMessageList> {
    const query = new URLSearchParams();
    if (params.status) query.set("status", params.status);
    if (params.search) query.set("search", params.search);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return apiRequest<AdminMessageList>(`/api/v1/admin/messages${suffix}`, {
      signal,
    });
  },
  setMessageStatus(
    id: string,
    status: "new" | "read" | "replied" | "archived" | "spam",
  ): Promise<void> {
    return apiRequest<void>(`/api/v1/admin/messages/${id}/status`, {
      method: "PATCH",
      body: { status },
    });
  },
  deleteMessage(id: string): Promise<void> {
    return apiRequest<void>(`/api/v1/admin/messages/${id}`, { method: "DELETE" });
  },
};

function toProfileInput(profile: ProfileAdmin | AdminSettings["profile"]): ProfileInput {
  return {
    name: profile.name,
    display_name: profile.display_name,
    professional_title: profile.professional_title,
    short_bio: profile.short_bio,
    long_bio: profile.long_bio,
    what_i_build: profile.what_i_build,
    how_i_work: profile.how_i_work,
    current_direction: profile.current_direction,
    personal_interests: profile.personal_interests,
    profile_image: profile.profile_image,
    location: profile.location,
    email: profile.email,
    phone: profile.phone,
    availability: profile.availability,
    resume_url: profile.resume_url,
    github_url: profile.github_url,
    linkedin_url: profile.linkedin_url,
    website_url: profile.website_url,
    is_placeholder: profile.is_placeholder,
  };
}

function toSiteInput(site: SiteSettingsAdmin): AdminSettingsInput["site"] {
  return {
    site_name: site.site_name,
    site_description: site.site_description,
    wordmark: site.wordmark,
    accent: site.accent,
    footer_text: site.footer_text,
    copyright_text: site.copyright_text,
    social_image: site.social_image,
    favicon: site.favicon,
    seo_title: site.seo_title,
    seo_description: site.seo_description,
  };
}

export { toProfileInput, toSiteInput };
