import { ApiError, apiRequest } from "@/lib/api/client";

import type {
  GetPostResponse,
  ListPostsResponse,
  PostSort,
  PublishPostInput,
  PublishPostResponse,
  ReadableFeedSource,
  UpdatePostInput,
  UpdatePostResponse,
} from "./types";

type ListCommunityPostsInput = {
  slug: string;
  limit?: number;
  offset?: number;
  sort?: PostSort;
  cache?: RequestCache;
  fallbackSort?: PostSort | null;
  timeoutMs?: number;
  token?: string | null;
};

type ListUserPostsInput = {
  username: string;
  limit?: number;
  offset?: number;
  sort?: PostSort;
  cache?: RequestCache;
  fallbackSort?: PostSort | null;
  timeoutMs?: number;
  token?: string | null;
};

type GetPostOptions = {
  cache?: RequestCache;
  timeoutMs?: number;
  token?: string | null;
};

type ListLatestPostsOptions = {
  cache?: RequestCache;
  fallbackSort?: PostSort | null;
  source?: ReadableFeedSource;
  timeoutMs?: number;
  token?: string | null;
};

type ListLatestPostsPathInput = {
  limit?: number;
  offset?: number;
  sort?: PostSort;
  source?: ReadableFeedSource;
};

type ListSavedPostsInput = {
  cache?: RequestCache;
  limit?: number;
  offset?: number;
  timeoutMs?: number;
  token?: string | null;
};

const DEFAULT_SORT_FALLBACK: PostSort = "new";

export function listCommunityPosts({
  cache,
  fallbackSort = DEFAULT_SORT_FALLBACK,
  slug,
  limit = 20,
  offset = 0,
  sort = "new",
  timeoutMs,
  token,
}: ListCommunityPostsInput) {
  return listPostsWithSortFallback({
    fallbackSort,
    request: (effectiveSort) => {
      const params = createListPostsParams(limit, offset, effectiveSort);

      return apiRequest<ListPostsResponse>(
        `/api/v1/communities/${encodeURIComponent(slug)}/posts?${params.toString()}`,
        {
          cache,
          timeoutMs,
          token,
        },
      );
    },
    sort,
    source: "all",
  });
}

export function listLatestPosts(
  limit = 20,
  offset = 0,
  sort: PostSort = "new",
  options: ListLatestPostsOptions = {},
) {
  const source: ReadableFeedSource = options.source ?? "recommended";

  return listPostsWithSortFallback({
    fallbackSort: options.fallbackSort ?? DEFAULT_SORT_FALLBACK,
    request: (effectiveSort) => {
      return apiRequest<ListPostsResponse>(createLatestPostsPath({
        limit,
        offset,
        sort: effectiveSort,
        source,
      }), {
        cache: options.cache,
        timeoutMs: options.timeoutMs,
        token: options.token,
      });
    },
    sort,
    source,
  });
}

export function createLatestPostsPath({
  limit = 20,
  offset = 0,
  sort = "new",
  source = "recommended",
}: ListLatestPostsPathInput = {}) {
  const params = createListPostsParams(limit, offset, sort);
  params.set("source", source);

  return `/api/v1/posts?${params.toString()}`;
}

export function listUserPosts({
  cache,
  fallbackSort = DEFAULT_SORT_FALLBACK,
  username,
  limit = 20,
  offset = 0,
  sort = "new",
  timeoutMs,
  token,
}: ListUserPostsInput) {
  return listPostsWithSortFallback({
    fallbackSort,
    request: (effectiveSort) => {
      const params = createListPostsParams(limit, offset, effectiveSort);

      return apiRequest<ListPostsResponse>(
        `/api/v1/users/${encodeURIComponent(username)}/posts?${params.toString()}`,
        {
          cache,
          timeoutMs,
          token,
        },
      );
    },
    sort,
    source: "all",
  });
}

export function listSavedPosts({
  cache,
  limit = 20,
  offset = 0,
  timeoutMs,
  token,
}: ListSavedPostsInput = {}) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  return apiRequest<ListPostsResponse>(
    `/api/v1/me/saved-posts?${params.toString()}`,
    {
      cache,
      timeoutMs,
      token,
    },
  );
}

async function listPostsWithSortFallback({
  fallbackSort,
  request,
  sort,
  source,
}: {
  fallbackSort: PostSort | null;
  request: (sort: PostSort) => Promise<ListPostsResponse>;
  sort: PostSort;
  source: ReadableFeedSource;
}) {
  try {
    const result = await request(sort);

    return withSortMeta(result, {
      effectiveSort: sort,
      requestedSort: sort,
      source,
    });
  } catch (error) {
    if (!shouldFallbackSort(error, sort, fallbackSort)) {
      throw error;
    }

    const fallbackResult = await request(fallbackSort);

    return withSortMeta(fallbackResult, {
      effectiveSort: fallbackSort,
      requestedSort: sort,
      source,
    });
  }
}

function createListPostsParams(limit: number, offset: number, sort: PostSort) {
  return new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    sort,
  });
}

function withSortMeta(
  result: ListPostsResponse,
  {
    effectiveSort,
    requestedSort,
    source,
  }: {
    effectiveSort: PostSort;
    requestedSort: PostSort;
    source: ReadableFeedSource;
  },
) {
  return {
    ...result,
    effective_sort: effectiveSort,
    is_sort_fallback: requestedSort !== effectiveSort,
    requested_sort: requestedSort,
    source,
  };
}

function shouldFallbackSort(
  error: unknown,
  sort: PostSort,
  fallbackSort: PostSort | null,
): fallbackSort is PostSort {
  return (
    Boolean(fallbackSort) &&
    sort !== fallbackSort &&
    error instanceof ApiError &&
    error.status === 400 &&
    error.code === "invalid_argument"
  );
}

export function publishPost(slug: string, input: PublishPostInput) {
  return apiRequest<PublishPostResponse>(
    `/api/v1/communities/${encodeURIComponent(slug)}/posts`,
    {
      method: "POST",
      body: input,
    },
  );
}

export function getPost(id: string, options: GetPostOptions = {}) {
  return apiRequest<GetPostResponse>(
    `/api/v1/posts/${encodeURIComponent(id)}`,
    {
      cache: options.cache,
      timeoutMs: options.timeoutMs,
      token: options.token,
    },
  );
}

export function updatePost(id: string, input: UpdatePostInput) {
  return apiRequest<UpdatePostResponse>(`/api/v1/posts/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: input,
  });
}

export function deletePost(id: string) {
  return apiRequest<void>(`/api/v1/posts/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function savePost(id: string) {
  return apiRequest<void>(`/api/v1/posts/${encodeURIComponent(id)}/save`, {
    method: "POST",
  });
}

export function deletePostSave(id: string) {
  return apiRequest<void>(`/api/v1/posts/${encodeURIComponent(id)}/save`, {
    method: "DELETE",
  });
}
