import type {
  ExperienceAdmin,
  ExperienceInput,
  LeadershipAdmin,
  LeadershipInput,
  PageContent,
  PageContentAdmin,
  PageContentInput,
  SocialLink,
  SocialLinkAdmin,
  SocialLinkInput,
} from "@/types/api";

import { apiRequest } from "./api";

export const siteService = {
  // --- Public ----------------------------------------------------------
  listSocialLinks(signal?: AbortSignal): Promise<SocialLink[]> {
    return apiRequest<SocialLink[]>("/api/v1/social-links", { signal });
  },
  listPages(signal?: AbortSignal): Promise<PageContent[]> {
    return apiRequest<PageContent[]>("/api/v1/pages", { signal });
  },
  getPage(pageKey: string, signal?: AbortSignal): Promise<PageContent> {
    return apiRequest<PageContent>(`/api/v1/pages/${encodeURIComponent(pageKey)}`, {
      signal,
    });
  },

  // --- Admin: social links ---------------------------------------------
  listSocialLinksAdmin(signal?: AbortSignal): Promise<SocialLinkAdmin[]> {
    return apiRequest<SocialLinkAdmin[]>("/api/v1/admin/social-links", { signal });
  },
  createSocialLink(payload: SocialLinkInput): Promise<SocialLinkAdmin> {
    return apiRequest<SocialLinkAdmin>("/api/v1/admin/social-links", {
      method: "POST",
      body: payload,
    });
  },
  updateSocialLink(id: string, payload: SocialLinkInput): Promise<SocialLinkAdmin> {
    return apiRequest<SocialLinkAdmin>(`/api/v1/admin/social-links/${id}`, {
      method: "PUT",
      body: payload,
    });
  },
  deleteSocialLink(id: string): Promise<void> {
    return apiRequest<void>(`/api/v1/admin/social-links/${id}`, { method: "DELETE" });
  },

  // --- Admin: editable pages -------------------------------------------
  listPagesAdmin(signal?: AbortSignal): Promise<PageContentAdmin[]> {
    return apiRequest<PageContentAdmin[]>("/api/v1/admin/pages", { signal });
  },
  savePage(pageKey: string, payload: PageContentInput): Promise<PageContentAdmin> {
    return apiRequest<PageContentAdmin>(`/api/v1/admin/pages/${encodeURIComponent(pageKey)}`, {
      method: "PUT",
      body: payload,
    });
  },

  // --- Admin: experience ------------------------------------------------
  listExperienceAdmin(signal?: AbortSignal): Promise<ExperienceAdmin[]> {
    return apiRequest<ExperienceAdmin[]>("/api/v1/admin/experience", { signal });
  },
  createExperience(payload: ExperienceInput): Promise<ExperienceAdmin> {
    return apiRequest<ExperienceAdmin>("/api/v1/admin/experience", {
      method: "POST",
      body: payload,
    });
  },
  updateExperience(id: string, payload: ExperienceInput): Promise<ExperienceAdmin> {
    return apiRequest<ExperienceAdmin>(`/api/v1/admin/experience/${id}`, {
      method: "PUT",
      body: payload,
    });
  },
  deleteExperience(id: string): Promise<void> {
    return apiRequest<void>(`/api/v1/admin/experience/${id}`, { method: "DELETE" });
  },

  // --- Admin: leadership ------------------------------------------------
  listLeadershipAdmin(signal?: AbortSignal): Promise<LeadershipAdmin[]> {
    return apiRequest<LeadershipAdmin[]>("/api/v1/admin/leadership", { signal });
  },
  createLeadership(payload: LeadershipInput): Promise<LeadershipAdmin> {
    return apiRequest<LeadershipAdmin>("/api/v1/admin/leadership", {
      method: "POST",
      body: payload,
    });
  },
  updateLeadership(id: string, payload: LeadershipInput): Promise<LeadershipAdmin> {
    return apiRequest<LeadershipAdmin>(`/api/v1/admin/leadership/${id}`, {
      method: "PUT",
      body: payload,
    });
  },
  deleteLeadership(id: string): Promise<void> {
    return apiRequest<void>(`/api/v1/admin/leadership/${id}`, { method: "DELETE" });
  },
};

export interface PageKeyMeta {
  key: string;
  label: string;
  path: string;
}

/** Mirrors the backend PAGE_KEYS / PAGE_KEY_LABELS constants. */
export const PAGE_KEYS: PageKeyMeta[] = [
  { key: "home", label: "Home", path: "/" },
  { key: "work", label: "Work", path: "/work" },
  { key: "data-lab", label: "Data Lab", path: "/data-lab" },
  { key: "build-lab", label: "Build Lab", path: "/build-lab" },
  { key: "leadership", label: "Leadership", path: "/leadership" },
  { key: "experience", label: "Experience", path: "/experience" },
  { key: "articles", label: "Articles", path: "/articles" },
  { key: "about", label: "About", path: "/about" },
  { key: "now", label: "Now", path: "/now" },
  { key: "timeline", label: "Timeline", path: "/timeline" },
  { key: "resume", label: "Resume", path: "/resume" },
  { key: "contact", label: "Contact", path: "/contact" },
];

export const SOCIAL_PLATFORMS = [
  "github",
  "linkedin",
  "x",
  "instagram",
  "youtube",
  "behance",
  "dribbble",
  "whatsapp",
  "email",
  "phone",
  "website",
  "other",
];
