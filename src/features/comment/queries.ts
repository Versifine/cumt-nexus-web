import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  deleteComment,
  listPostComments,
  listUserComments,
} from "./api";
import { DEFAULT_COMMENT_SORT } from "./sort";
import type {
  CommentSort,
  ListCommentsResponse,
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
  postCommentsInfinite: (
    postId: string,
    limit: number,
    view: "flat" | "tree",
    sort: CommentSort,
    maxDepth: number,
  ) =>
    ["post-comments", postId, "infinite", { limit, maxDepth, sort, view }] as const,
  userCommentsAll: () => ["user-comments"] as const,
  userCommentsPrefix: (username: string) => ["user-comments", username] as const,
  userComments: (username: string, limit: number, offset: number) =>
    ["user-comments", username, { limit, offset }] as const,
  userCommentsInfinite: (username: string, limit: number) =>
    ["user-comments", username, "infinite", { limit }] as const,
};

export function usePostCommentsQuery(
  postId: string,
  limit = 20,
  offset = 0,
  view: "flat" | "tree" = "tree",
  sort: CommentSort = DEFAULT_COMMENT_SORT,
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

export function useInfinitePostCommentsQuery(
  postId: string,
  limit = 20,
  view: "flat" | "tree" = "tree",
  sort: CommentSort = DEFAULT_COMMENT_SORT,
  maxDepth = 6,
  enabled = true,
  initialData?: ListCommentsResponse,
) {
  const initialInfiniteData = initialData
    ? ({
        pageParams: [initialData.offset],
        pages: [initialData],
      } satisfies InfiniteData<ListCommentsResponse, number>)
    : undefined;

  return useInfiniteQuery({
    queryKey: commentQueryKeys.postCommentsInfinite(
      postId,
      limit,
      view,
      sort,
      maxDepth,
    ),
    queryFn: ({ pageParam }) =>
      listPostComments({
        maxDepth,
        offset: pageParam,
        postId,
        limit,
        sort,
        view,
      }),
    enabled: enabled && Boolean(postId.trim()),
    initialData: initialInfiniteData,
    initialPageParam: 0,
    getNextPageParam: getNextCommentsPageParam,
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

export function useInfiniteUserCommentsQuery(
  username: string,
  limit = 20,
  enabled = true,
  initialData?: ListCommentsResponse,
) {
  const initialInfiniteData = initialData
    ? ({
        pageParams: [initialData.offset],
        pages: [initialData],
      } satisfies InfiniteData<ListCommentsResponse, number>)
    : undefined;

  return useInfiniteQuery({
    queryKey: commentQueryKeys.userCommentsInfinite(username, limit),
    queryFn: ({ pageParam }) =>
      listUserComments({ username, limit, offset: pageParam }),
    enabled: enabled && Boolean(username.trim()),
    initialData: initialInfiniteData,
    initialPageParam: 0,
    getNextPageParam: getNextCommentsPageParam,
  });
}

function getNextCommentsPageParam(lastPage: ListCommentsResponse) {
  const pageLimit = lastPage.limit || 20;

  if (lastPage.comments.length < pageLimit) {
    return undefined;
  }

  return lastPage.offset + pageLimit;
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
