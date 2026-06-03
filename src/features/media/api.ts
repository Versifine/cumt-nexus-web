import { apiRequest } from "@/lib/api/client";

import type { UploadImageInput, UploadImageResponse } from "./types";

export function uploadImage(input: UploadImageInput) {
  const formData = new FormData();
  formData.set("file", input.file);

  if (input.alt_text !== undefined) {
    formData.set("alt_text", input.alt_text);
  }

  return apiRequest<UploadImageResponse>("/api/v1/uploads/images", {
    method: "POST",
    body: formData,
  });
}
