import { apiRequest } from "@/lib/api/client";

import type {
  ListCommentsResponse,
  PublishCommentInput,
  PublishCommentResponse,
} from "./types";

type ListPostCommentsInput = {
  postId: string;
  limit?: number;
  offset?: number;
};

export function listPostComments({
  postId,
  limit = 20,
  offset = 0,
}: ListPostCommentsInput) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  return apiRequest<ListCommentsResponse>(
    `/api/v1/posts/${encodeURIComponent(postId)}/comments?${params.toString()}`,
  );
}

export function publishComment(postId: string, input: PublishCommentInput) {
  return apiRequest<PublishCommentResponse>(
    `/api/v1/posts/${encodeURIComponent(postId)}/comments`,
    {
      method: "POST",
      body: input,
    },
  );
}
