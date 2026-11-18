import type { ContactPayload, ContactReceipt } from "@/types/api";

import { apiRequest } from "./api";

export const contactService = {
  submit(payload: ContactPayload, signal?: AbortSignal): Promise<ContactReceipt> {
    return apiRequest<ContactReceipt>("/api/v1/contact", {
      method: "POST",
      body: payload,
      signal,
    });
  },
};
