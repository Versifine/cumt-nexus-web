import { apiRequest } from "@/lib/api/client";

import type {
  ApplyCommentEffectInput,
  ApplyCommentEffectResponse,
  ListEffectsCatalogResponse,
} from "./types";

export function listEffectsCatalog() {
  return apiRequest<ListEffectsCatalogResponse>("/api/v1/effects/catalog");
}

export function applyCommentEffect(
  commentId: string,
  input: ApplyCommentEffectInput,
) {
  return apiRequest<ApplyCommentEffectResponse>(
    `/api/v1/comments/${encodeURIComponent(commentId)}/effects`,
    {
      method: "POST",
      body: input,
    },
  );
}
