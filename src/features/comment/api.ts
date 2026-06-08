import { ApiError, apiRequest } from "@/lib/api/client";

import type {
  CommentSort,
  ListCommentsResponse,
  PublishCommentInput,
  PublishCommentResponse,
  UpdateCommentInput,
  UpdateCommentResponse,
} from "./types";

type ListPostCommentsInput = {
  postId: string;
  limit?: number;
  offset?: number;
  view?: "flat" | "tree";
  sort?: CommentSort;
  fallbackSort?: CommentSort | null;
  maxDepth?: number;
  cache?: RequestCache;
  timeoutMs?: number;
  token?: string | null;
};

type ListUserCommentsInput = {
  username: string;
  limit?: number;
  offset?: number;
  cache?: RequestCache;
  timeoutMs?: number;
  token?: string | null;
};

export function listPostComments({
  fallbackSort = "new",
  postId,
  limit = 20,
  offset = 0,
  view = "tree",
  sort = "new",
  maxDepth = 6,
  cache,
  timeoutMs,
  token,
}: ListPostCommentsInput) {
  return listCommentsWithSortFallback({
    fallbackSort,
    request: (effectiveSort) => {
      const params = createListCommentsParams({
        limit,
        maxDepth,
        offset,
        sort: effectiveSort,
        view,
      });

      return apiRequest<ListCommentsResponse>(
        `/api/v1/posts/${encodeURIComponent(postId)}/comments?${params.toString()}`,
        {
          cache,
          timeoutMs,
          token,
        },
      );
    },
    sort,
    view,
  });
}

function createListCommentsParams({
  limit,
  maxDepth,
  offset,
  sort,
  view,
}: {
  limit: number;
  maxDepth: number;
  offset: number;
  sort: CommentSort;
  view: "flat" | "tree";
}) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    view,
    sort,
    max_depth: String(maxDepth),
  });

  return params;
}

async function listCommentsWithSortFallback({
  fallbackSort,
  request,
  sort,
  view,
}: {
  fallbackSort: CommentSort | null;
  request: (sort: CommentSort) => Promise<ListCommentsResponse>;
  sort: CommentSort;
  view: "flat" | "tree";
}) {
  try {
    const result = await request(sort);

    return withCommentSortMeta(result, {
      effectiveSort: sort,
      requestedSort: sort,
      view,
    });
  } catch (error) {
    if (!shouldFallbackSort(error, sort, fallbackSort)) {
      throw error;
    }

    const fallbackResult = await request(fallbackSort);

    return withCommentSortMeta(fallbackResult, {
      effectiveSort: fallbackSort,
      requestedSort: sort,
      view,
    });
  }
}

function withCommentSortMeta(
  result: ListCommentsResponse,
  {
    effectiveSort,
    requestedSort,
    view,
  }: {
    effectiveSort: CommentSort;
    requestedSort: CommentSort;
    view: "flat" | "tree";
  },
) {
  return {
    ...result,
    effective_sort: effectiveSort,
    is_sort_fallback: requestedSort !== effectiveSort,
    requested_sort: requestedSort,
    sort: effectiveSort,
    view,
  };
}

function shouldFallbackSort(
  error: unknown,
  sort: CommentSort,
  fallbackSort: CommentSort | null,
): fallbackSort is CommentSort {
  return (
    Boolean(fallbackSort) &&
    sort !== fallbackSort &&
    error instanceof ApiError &&
    error.status === 400 &&
    error.code === "invalid_argument"
  );
}

export function listUserComments({
  username,
  limit = 20,
  offset = 0,
  cache,
  timeoutMs,
  token,
}: ListUserCommentsInput) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  return apiRequest<ListCommentsResponse>(
    `/api/v1/users/${encodeURIComponent(username)}/comments?${params.toString()}`,
    {
      cache,
      timeoutMs,
      token,
    },
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

export function updateComment(id: string, input: UpdateCommentInput) {
  return apiRequest<UpdateCommentResponse>(
    `/api/v1/comments/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: input,
    },
  );
}

export function deleteComment(id: string) {
  return apiRequest<void>(`/api/v1/comments/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
