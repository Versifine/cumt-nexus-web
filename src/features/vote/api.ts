import { apiRequest } from "@/lib/api/client";

import type {
  SetCommentVoteResponse,
  SetPostVoteResponse,
  VoteValue,
} from "./types";

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

export function setCommentVote(commentId: string, value: VoteValue) {
  return apiRequest<SetCommentVoteResponse>(
    `/api/v1/comments/${encodeURIComponent(commentId)}/vote`,
    {
      method: "PUT",
      body: { value },
    },
  );
}

export function deleteCommentVote(commentId: string) {
  return apiRequest<void>(
    `/api/v1/comments/${encodeURIComponent(commentId)}/vote`,
    {
      method: "DELETE",
    },
  );
}
