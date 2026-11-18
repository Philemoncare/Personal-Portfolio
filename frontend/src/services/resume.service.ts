import type { ResumePublic } from "@/types/api";

import { apiRequest } from "./api";

export const resumeService = {
  getCurrent(signal?: AbortSignal): Promise<ResumePublic | null> {
    return apiRequest<ResumePublic>("/api/v1/resume/current", { signal }).catch(
      (error: unknown) => {
        // A missing resume is a normal, honest empty state on the public site.
        if (
          error &&
          typeof error === "object" &&
          "status" in error &&
          (error as { status?: number }).status === 404
        ) {
          return null;
        }
        throw error;
      },
    );
  },
  downloadHref(resume: ResumePublic): string {
    return resume.download_url;
  },
};
