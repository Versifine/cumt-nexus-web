import { apiRequest } from "@/lib/api/client";

import type { SetPostVoteResponse, VoteValue } from "./types";

export function setPostVote(postId: string, value: VoteValue) {
  return apiRequest<SetPostVoteResponse>(
    `/api/v1/posts/${encodeURIComponent(postId)}/vote`,
    {
      method: "PUT",
      body: { value },
    },
  );
}

export function deletePostVote(postId: string) {
  return apiRequest<void>(`/api/v1/posts/${encodeURIComponent(postId)}/vote`, {
    method: "DELETE",
  });
}
