import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { deleteComment, listPostComments, updateComment } from "./api";
import type { UpdateCommentInput } from "./types";

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
  enabled = true,
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
    enabled,
  });
}

export function useUpdateCommentMutation(commentId: string, postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateCommentInput) => updateComment(commentId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: commentQueryKeys.postCommentsPrefix(postId),
      });
    },
  });
}

export function useDeleteCommentMutation(commentId: string, postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteComment(commentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: commentQueryKeys.postCommentsPrefix(postId),
      });
    },
  });
}
