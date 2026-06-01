import { useQuery } from "@tanstack/react-query";

import { listPostComments } from "./api";

export const commentQueryKeys = {
  postCommentsPrefix: (postId: string) => ["post-comments", postId] as const,
  postComments: (postId: string, limit: number, offset: number) =>
    ["post-comments", postId, { limit, offset }] as const,
};

export function usePostCommentsQuery(postId: string, limit = 20, offset = 0) {
  return useQuery({
    queryKey: commentQueryKeys.postComments(postId, limit, offset),
    queryFn: () => listPostComments({ postId, limit, offset }),
  });
}
