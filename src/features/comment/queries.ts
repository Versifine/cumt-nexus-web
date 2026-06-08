import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteComment,
  listPostComments,
  listUserComments,
  updateComment,
} from "./api";
import type {
  CommentSort,
  ListCommentsResponse,
  UpdateCommentInput,
} from "./types";

export const commentQueryKeys = {
  postCommentsPrefix: (postId: string) => ["post-comments", postId] as const,
  postComments: (
    postId: string,
    limit: number,
    offset: number,
    view: "flat" | "tree",
    sort: CommentSort,
    maxDepth: number,
  ) => ["post-comments", postId, { limit, offset, maxDepth, sort, view }] as const,
  userCommentsAll: () => ["user-comments"] as const,
  userCommentsPrefix: (username: string) => ["user-comments", username] as const,
  userComments: (username: string, limit: number, offset: number) =>
    ["user-comments", username, { limit, offset }] as const,
};

export function usePostCommentsQuery(
  postId: string,
  limit = 20,
  offset = 0,
  view: "flat" | "tree" = "tree",
  sort: CommentSort = "new",
  maxDepth = 6,
  enabled = true,
  initialData?: ListCommentsResponse,
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
    initialData,
  });
}

export function useUserCommentsQuery(
  username: string,
  limit = 20,
  offset = 0,
  enabled = true,
  initialData?: ListCommentsResponse,
) {
  return useQuery({
    queryKey: commentQueryKeys.userComments(username, limit, offset),
    queryFn: () => listUserComments({ username, limit, offset }),
    enabled: enabled && Boolean(username.trim()),
    initialData,
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
      void queryClient.invalidateQueries({
        queryKey: commentQueryKeys.userCommentsAll(),
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
      void queryClient.invalidateQueries({
        queryKey: commentQueryKeys.userCommentsAll(),
      });
    },
  });
}
