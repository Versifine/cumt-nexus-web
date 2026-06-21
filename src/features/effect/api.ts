import { apiRequest } from "@/lib/api/client";

import type {
  ApplyCommentEffectInput,
  ApplyCommentEffectResponse,
  ApplyPostEffectInput,
  ApplyPostEffectResponse,
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

export function applyPostEffect(postId: string, input: ApplyPostEffectInput) {
  return apiRequest<ApplyPostEffectResponse>(
    `/api/v1/posts/${encodeURIComponent(postId)}/effects`,
    {
      method: "POST",
      body: input,
    },
  );
}
