import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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

export const postQueryKeys = {
  latestPrefix: () => ["latest-posts"] as const,
  latest: (
    limit: number,
    offset: number,
    sort: PostSort,
    source: ReadableFeedSource,
  ) =>
    ["latest-posts", { limit, offset, sort, source }] as const,
  detail: (id: string) => ["post", id] as const,
  communityPostsAll: () => ["community-posts"] as const,
  communityPostsPrefix: (slug: string) => ["community-posts", slug] as const,
  communityPosts: (slug: string, limit: number, offset: number, sort: PostSort) =>
    ["community-posts", slug, { limit, offset, sort }] as const,
  userPostsAll: () => ["user-posts"] as const,
  userPostsPrefix: (username: string) => ["user-posts", username] as const,
  userPosts: (username: string, limit: number, offset: number, sort: PostSort) =>
    ["user-posts", username, { limit, offset, sort }] as const,
  savedPostsAll: () => ["saved-posts"] as const,
  savedPosts: (limit: number, offset: number) =>
    ["saved-posts", { limit, offset }] as const,
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
    queryKey: postQueryKeys.latest(limit, offset, sort, source),
    queryFn: () => listLatestPosts(limit, offset, sort, { source }),
    enabled,
    initialData,
  });
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

export function useTogglePostSaveMutation() {
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
