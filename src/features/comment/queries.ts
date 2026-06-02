import { useQuery } from "@tanstack/react-query";

import { listPostComments } from "./api";

export const commentQueryKeys = {
  postCommentsPrefix: (postId: string) => ["post-comments", postId] as const,
  postComments: (
    postId: string,
    limit: number,
    offset: number,
    view: "flat" | "tree",
    sort: "new" | "old",
    maxDepth: number,
  ) => ["post-comments", postId, { limit, offset, maxDepth, sort, view }] as const,
};

export function usePostCommentsQuery(
  postId: string,
  limit = 20,
  offset = 0,
  view: "flat" | "tree" = "tree",
  sort: "new" | "old" = "new",
  maxDepth = 6,
) {
  return useQuery({
    queryKey: commentQueryKeys.postComments(
      postId,
      limit,
      offset,
      view,
      sort,
      maxDepth,
    ),
    queryFn: () => listPostComments({ maxDepth, offset, postId, limit, sort, view }),
  });
}
