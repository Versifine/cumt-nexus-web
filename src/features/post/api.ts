import { ApiError, apiRequest } from "@/lib/api/client";

import type {
  FeedSource,
  GetPostResponse,
  ListPostsResponse,
  PostSort,
  PublishPostInput,
  PublishPostResponse,
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
  token?: string | null;
};

type ListUserPostsInput = {
  username: string;
  limit?: number;
  offset?: number;
  sort?: PostSort;
  cache?: RequestCache;
  fallbackSort?: PostSort | null;
  token?: string | null;
};

type GetPostOptions = {
  cache?: RequestCache;
  token?: string | null;
};

type ListLatestPostsOptions = {
  cache?: RequestCache;
  fallbackSort?: PostSort | null;
  source?: FeedSource;
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
  const source = options.source ?? "recommended";

  return listPostsWithSortFallback({
    fallbackSort: options.fallbackSort ?? DEFAULT_SORT_FALLBACK,
    request: (effectiveSort) => {
      const params = createListPostsParams(limit, offset, effectiveSort);
      params.set("source", source);

      return apiRequest<ListPostsResponse>(`/api/v1/posts?${params.toString()}`, {
        cache: options.cache,
        token: options.token,
      });
    },
    sort,
    source,
  });
}

export function listUserPosts({
  cache,
  fallbackSort = DEFAULT_SORT_FALLBACK,
  username,
  limit = 20,
  offset = 0,
  sort = "new",
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
          token,
        },
      );
    },
    sort,
    source: "all",
  });
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
  source: FeedSource;
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
    source: FeedSource;
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
