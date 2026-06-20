import {
  type InfiniteData,
  type QueryClient,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";

import {
  deletePostSave,
  deletePost,
  getPost,
  listCommunityPosts,
  listLatestPosts,
  listSavedPosts,
  listUserPosts,
  savePost,
  updatePost,
} from "./api";
import type {
  GetPostResponse,
  ListPostsResponse,
  PostSort,
  ReadableFeedSource,
  UpdatePostInput,
} from "./types";

const LATEST_POSTS_STALE_TIME_MS = 45_000;

type LatestPostsQueryInput = {
  limit?: number;
  offset?: number;
  sort?: PostSort;
  source?: ReadableFeedSource;
};

export const postQueryKeys = {
  latestPrefix: () => ["latest-posts"] as const,
  latest: (
    limit: number,
    offset: number,
    sort: PostSort,
    source: ReadableFeedSource,
  ) =>
    ["latest-posts", { limit, offset, sort, source }] as const,
  latestInfinite: (
    limit: number,
    sort: PostSort,
    source: ReadableFeedSource,
  ) => ["latest-posts", "infinite", { limit, sort, source }] as const,
  detail: (id: string) => ["post", id] as const,
  communityPostsAll: () => ["community-posts"] as const,
  communityPostsPrefix: (slug: string) => ["community-posts", slug] as const,
  communityPosts: (slug: string, limit: number, offset: number, sort: PostSort) =>
    ["community-posts", slug, { limit, offset, sort }] as const,
  communityPostsInfinite: (slug: string, limit: number, sort: PostSort) =>
    ["community-posts", slug, "infinite", { limit, sort }] as const,
  userPostsAll: () => ["user-posts"] as const,
  userPostsPrefix: (username: string) => ["user-posts", username] as const,
  userPosts: (username: string, limit: number, offset: number, sort: PostSort) =>
    ["user-posts", username, { limit, offset, sort }] as const,
  userPostsInfinite: (username: string, limit: number, sort: PostSort) =>
    ["user-posts", username, "infinite", { limit, sort }] as const,
  savedPostsAll: () => ["saved-posts"] as const,
  savedPosts: (limit: number, offset: number) =>
    ["saved-posts", { limit, offset }] as const,
  savedPostsInfinite: (limit: number) =>
    ["saved-posts", "infinite", { limit }] as const,
};

export function usePostQuery(
  id: string,
  enabled = true,
  initialData?: GetPostResponse,
) {
  return useQuery({
    queryKey: postQueryKeys.detail(id),
    queryFn: () => getPost(id),
    enabled,
    initialData,
  });
}

export function useLatestPostsQuery(
  limit = 20,
  offset = 0,
  enabled = true,
  sort: PostSort = "new",
  source: ReadableFeedSource = "recommended",
  initialData?: ListPostsResponse,
) {
  return useQuery({
    ...getLatestPostsQueryOptions({ limit, offset, sort, source }),
    enabled,
    initialData,
    placeholderData: (previousData, previousQuery) =>
      getLatestPostsQuerySource(previousQuery?.queryKey) === source
        ? previousData
        : undefined,
  });
}

export function prefetchLatestPostsQuery(
  queryClient: QueryClient,
  input: LatestPostsQueryInput = {},
) {
  return queryClient.prefetchQuery(getLatestPostsQueryOptions(input));
}

export function useInfiniteLatestPostsQuery(
  limit = 20,
  enabled = true,
  sort: PostSort = "new",
  source: ReadableFeedSource = "recommended",
  initialData?: ListPostsResponse,
) {
  const initialInfiniteData = initialData
    ? ({
        pageParams: [initialData.offset],
        pages: [initialData],
      } satisfies InfiniteData<ListPostsResponse, number>)
    : undefined;

  return useInfiniteQuery({
    queryKey: postQueryKeys.latestInfinite(limit, sort, source),
    queryFn: ({ pageParam }) =>
      listLatestPosts(limit, pageParam, sort, { source }),
    enabled,
    initialData: initialInfiniteData,
    initialPageParam: 0,
    getNextPageParam: getNextPostsPageParam,
    staleTime: LATEST_POSTS_STALE_TIME_MS,
  });
}

export function prefetchInfiniteLatestPostsQuery(
  queryClient: QueryClient,
  input: LatestPostsQueryInput = {},
) {
  const {
    limit = 20,
    offset = 0,
    sort = "new",
    source = "recommended",
  } = input;

  return queryClient.prefetchInfiniteQuery({
    queryKey: postQueryKeys.latestInfinite(limit, sort, source),
    queryFn: ({ pageParam }) =>
      listLatestPosts(limit, pageParam, sort, { source }),
    initialPageParam: offset,
    getNextPageParam: getNextPostsPageParam,
    staleTime: LATEST_POSTS_STALE_TIME_MS,
  });
}

function getLatestPostsQueryOptions({
  limit = 20,
  offset = 0,
  sort = "new",
  source = "recommended",
}: LatestPostsQueryInput = {}) {
  return {
    queryKey: postQueryKeys.latest(limit, offset, sort, source),
    queryFn: () => listLatestPosts(limit, offset, sort, { source }),
    staleTime: LATEST_POSTS_STALE_TIME_MS,
  };
}

function getNextPostsPageParam(lastPage: ListPostsResponse) {
  const pageLimit = lastPage.limit || 20;

  if (lastPage.posts.length < pageLimit) {
    return undefined;
  }

  return lastPage.offset + pageLimit;
}

function getLatestPostsQuerySource(queryKey: readonly unknown[] | undefined) {
  const params = queryKey?.[1];

  if (
    typeof params === "object" &&
    params !== null &&
    "source" in params
  ) {
    return (params as { source?: ReadableFeedSource }).source;
  }

  return undefined;
}

export function useCommunityPostsQuery(
  slug: string,
  limit = 20,
  offset = 0,
  enabled = true,
  sort: PostSort = "new",
  initialData?: ListPostsResponse,
) {
  return useQuery({
    queryKey: postQueryKeys.communityPosts(slug, limit, offset, sort),
    queryFn: () => listCommunityPosts({ slug, limit, offset, sort }),
    enabled,
    initialData,
  });
}

export function useInfiniteCommunityPostsQuery(
  slug: string,
  limit = 20,
  enabled = true,
  sort: PostSort = "new",
  initialData?: ListPostsResponse,
) {
  const initialInfiniteData = initialData
    ? ({
        pageParams: [initialData.offset],
        pages: [initialData],
      } satisfies InfiniteData<ListPostsResponse, number>)
    : undefined;

  return useInfiniteQuery({
    queryKey: postQueryKeys.communityPostsInfinite(slug, limit, sort),
    queryFn: ({ pageParam }) =>
      listCommunityPosts({ slug, limit, offset: pageParam, sort }),
    enabled: enabled && Boolean(slug.trim()),
    initialData: initialInfiniteData,
    initialPageParam: 0,
    getNextPageParam: getNextPostsPageParam,
  });
}

export function useUserPostsQuery(
  username: string,
  limit = 20,
  offset = 0,
  enabled = true,
  sort: PostSort = "new",
  initialData?: ListPostsResponse,
) {
  return useQuery({
    queryKey: postQueryKeys.userPosts(username, limit, offset, sort),
    queryFn: () => listUserPosts({ username, limit, offset, sort }),
    enabled: enabled && Boolean(username.trim()),
    initialData,
  });
}

export function useInfiniteUserPostsQuery(
  username: string,
  limit = 20,
  enabled = true,
  sort: PostSort = "new",
  initialData?: ListPostsResponse,
) {
  const initialInfiniteData = initialData
    ? ({
        pageParams: [initialData.offset],
        pages: [initialData],
      } satisfies InfiniteData<ListPostsResponse, number>)
    : undefined;

  return useInfiniteQuery({
    queryKey: postQueryKeys.userPostsInfinite(username, limit, sort),
    queryFn: ({ pageParam }) =>
      listUserPosts({ username, limit, offset: pageParam, sort }),
    enabled: enabled && Boolean(username.trim()),
    initialData: initialInfiniteData,
    initialPageParam: 0,
    getNextPageParam: getNextPostsPageParam,
  });
}

export function useSavedPostsQuery(
  limit = 20,
  offset = 0,
  enabled = true,
  initialData?: ListPostsResponse,
) {
  return useQuery({
    queryKey: postQueryKeys.savedPosts(limit, offset),
    queryFn: () => listSavedPosts({ limit, offset }),
    enabled,
    initialData,
  });
}

export function useInfiniteSavedPostsQuery(limit = 20, enabled = true) {
  return useInfiniteQuery({
    queryKey: postQueryKeys.savedPostsInfinite(limit),
    queryFn: ({ pageParam }) => listSavedPosts({ limit, offset: pageParam }),
    enabled,
    initialPageParam: 0,
    getNextPageParam: getNextPostsPageParam,
  });
}

export function useUpdatePostMutation(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdatePostInput) => updatePost(id, input),
    onSuccess: (result) => {
      queryClient.setQueryData(postQueryKeys.detail(id), result);
      void queryClient.invalidateQueries({
        queryKey: postQueryKeys.latestPrefix(),
      });
      void queryClient.invalidateQueries({
        queryKey: postQueryKeys.communityPostsAll(),
      });
      void queryClient.invalidateQueries({
        queryKey: postQueryKeys.userPostsAll(),
      });
    },
  });
}

export function useDeletePostMutation(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deletePost(id),
    onSuccess: () => {
      queryClient.removeQueries({
        queryKey: postQueryKeys.detail(id),
      });
      void queryClient.invalidateQueries({
        queryKey: postQueryKeys.latestPrefix(),
      });
      void queryClient.invalidateQueries({
        queryKey: postQueryKeys.communityPostsAll(),
      });
      void queryClient.invalidateQueries({
        queryKey: postQueryKeys.userPostsAll(),
      });
    },
  });
}

export function useTogglePostSaveMutation(
  options: Pick<
    UseMutationOptions<void, Error, { isSaved: boolean; postId: string }>,
    "onError"
  > = {},
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      isSaved,
      postId,
    }: {
      isSaved: boolean;
      postId: string;
    }) => {
      if (isSaved) {
        await deletePostSave(postId);
        return;
      }

      await savePost(postId);
    },
    onError: options.onError,
    onSuccess: async (_result, { postId }) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: postQueryKeys.detail(postId),
        }),
        queryClient.invalidateQueries({
          queryKey: postQueryKeys.latestPrefix(),
        }),
        queryClient.invalidateQueries({
          queryKey: postQueryKeys.communityPostsAll(),
        }),
        queryClient.invalidateQueries({
          queryKey: postQueryKeys.userPostsAll(),
        }),
        queryClient.invalidateQueries({
          queryKey: postQueryKeys.savedPostsAll(),
        }),
      ]);
    },
  });
}
