import { apiRequest } from "@/services/api";
import type {
  ActivityList,
  Admin,
  AdminSession,
  AuthChallenge,
  AuthSession,
  ForgotPasswordResponse,
  LoginResponse,
  MediaAsset,
  MediaList,
  MediaUsage,
  SecurityOverview,
  SmsLogEntry,
  SmsLogList,
} from "@/types/api";

/** Returns the current admin, or throws ApiError (401/403). */
export function getCurrentAdmin(signal?: AbortSignal): Promise<Admin> {
  return apiRequest<Admin>("/api/v1/auth/me", { signal });
}

export function login(identifier: string, password: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/api/v1/auth/login", {
    method: "POST",
    body: { identifier, password },
  });
}

export function verifyOtp(challengeId: string, code: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/api/v1/auth/verify-otp", {
    method: "POST",
    body: { challenge_id: challengeId, code },
  });
}

export function resendOtp(challengeId: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/api/v1/auth/resend-otp", {
    method: "POST",
    body: { challenge_id: challengeId },
  });
}

export function logout(): Promise<{ message: string }> {
  return apiRequest<{ message: string }>("/api/v1/auth/logout", { method: "POST" });
}

export function forgotPassword(identifier: string): Promise<ForgotPasswordResponse> {
  return apiRequest<ForgotPasswordResponse>("/api/v1/auth/forgot-password", {
    method: "POST",
    body: { identifier },
  });
}

export function resetPassword(
  challengeId: string,
  code: string,
  newPassword: string,
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>("/api/v1/auth/reset-password", {
    method: "POST",
    body: { challenge_id: challengeId, code, new_password: newPassword },
  });
}

export function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>("/api/v1/auth/change-password", {
    method: "POST",
    body: { current_password: currentPassword, new_password: newPassword },
  });
}

export function getSessions(): Promise<AuthSession[]> {
  return apiRequest<AuthSession[]>("/api/v1/auth/sessions");
}

export function revokeSession(sessionId: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/v1/auth/sessions/${sessionId}`, {
    method: "DELETE",
  });
}

export function getSecurityOverview(): Promise<SecurityOverview> {
  return apiRequest<SecurityOverview>("/api/v1/auth/security");
}

// --- Admin security and SMS APIs ----------------------------------------

function withQuery(path: string, params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  const suffix = query.toString();
  return suffix ? `${path}?${suffix}` : path;
}

export interface ActivityQuery {
  search?: string;
  event?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: "created_at" | "event" | "status";
  order?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export function getSecurityActivity(params: ActivityQuery = {}): Promise<ActivityList> {
  return apiRequest<ActivityList>(
    withQuery("/api/v1/admin/security/activity", {
      search: params.search,
      event: params.event,
      status: params.status,
      date_from: params.dateFrom,
      date_to: params.dateTo,
      sort: params.sort,
      order: params.order,
      limit: params.limit,
      offset: params.offset,
    }),
  );
}

export function getSecuritySessions(): Promise<AdminSession[]> {
  return apiRequest<AdminSession[]>("/api/v1/admin/security/sessions");
}

export function revokeAdminSession(sessionId: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>("/api/v1/admin/security/sessions/revoke", {
    method: "POST",
    body: { session_id: sessionId },
  });
}

export function revokeAllSessions(keepCurrent = true): Promise<{ message: string }> {
  return apiRequest<{ message: string }>("/api/v1/admin/security/sessions/revoke-all", {
    method: "POST",
    body: { keep_current: keepCurrent },
  });
}

export interface SmsQuery {
  search?: string;
  status?: string;
  purpose?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: "created_at" | "status" | "sent_at";
  order?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export function listSmsLogs(params: SmsQuery = {}): Promise<SmsLogList> {
  return apiRequest<SmsLogList>(
    withQuery("/api/v1/admin/sms", {
      search: params.search,
      status: params.status,
      purpose: params.purpose,
      date_from: params.dateFrom,
      date_to: params.dateTo,
      sort: params.sort,
      order: params.order,
      limit: params.limit,
      offset: params.offset,
    }),
  );
}

export function getSmsLog(id: string): Promise<SmsLogEntry> {
  return apiRequest<SmsLogEntry>(`/api/v1/admin/sms/${id}`);
}

// --- Media library -------------------------------------------------------

/** Mirrors the backend MEDIA_FOLDERS constant. */
export const MEDIA_FOLDERS = [
  "brand",
  "profile",
  "projects",
  "data-lab",
  "build-lab",
  "case-studies",
  "leadership",
  "experience",
  "timeline",
  "articles",
  "pages",
  "social",
  "blog",
  "documents",
  "ui",
  "misc",
] as const;

export function listMedia(params: {
  search?: string;
  kind?: string;
  folder?: string;
  attachedToType?: string;
  limit?: number;
  offset?: number;
} = {}, signal?: AbortSignal): Promise<MediaList> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.kind) query.set("kind", params.kind);
  if (params.folder) query.set("folder", params.folder);
  if (params.attachedToType) query.set("attached_to_type", params.attachedToType);
  if (params.limit) query.set("limit", String(params.limit));
  if (params.offset) query.set("offset", String(params.offset));
  const suffix = query.toString();
  return apiRequest<MediaList>(`/api/v1/admin/media${suffix ? `?${suffix}` : ""}`, {
    signal,
  });
}

export function uploadMedia(form: FormData): Promise<MediaAsset> {
  return apiRequest<MediaAsset>("/api/v1/admin/media", {
    method: "POST",
    body: form,
  });
}

export function updateMedia(
  id: string,
  values: Partial<
    Pick<MediaAsset, "title" | "alt_text" | "caption" | "folder" | "attached_to_type" | "attached_to_id">
  >,
): Promise<MediaAsset> {
  return apiRequest<MediaAsset>(`/api/v1/admin/media/${id}`, {
    method: "PATCH",
    body: values,
  });
}

export function getMediaUsage(id: string): Promise<MediaUsage> {
  return apiRequest<MediaUsage>(`/api/v1/admin/media/${id}/usage`);
}

export function replaceMedia(id: string, file: File): Promise<MediaAsset> {
  const form = new FormData();
  form.set("file", file);
  return apiRequest<MediaAsset>(`/api/v1/admin/media/${id}/replace`, {
    method: "POST",
    body: form,
  });
}

export function deleteMedia(id: string, force = false): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(
    `/api/v1/admin/media/${id}${force ? "?force=true" : ""}`,
    { method: "DELETE" },
  );
}

export type { AuthChallenge };
