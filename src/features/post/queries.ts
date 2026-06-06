import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deletePost,
  getPost,
  listCommunityPosts,
  listLatestPosts,
  listUserPosts,
  updatePost,
} from "./api";
import type {
  GetPostResponse,
  ListPostsResponse,
  PostSort,
  UpdatePostInput,
} from "./types";

export const postQueryKeys = {
  latestPrefix: () => ["latest-posts"] as const,
  latest: (limit: number, offset: number, sort: PostSort) =>
    ["latest-posts", { limit, offset, sort }] as const,
  detail: (id: string) => ["post", id] as const,
  communityPostsAll: () => ["community-posts"] as const,
  communityPostsPrefix: (slug: string) => ["community-posts", slug] as const,
  communityPosts: (slug: string, limit: number, offset: number, sort: PostSort) =>
    ["community-posts", slug, { limit, offset, sort }] as const,
  userPostsAll: () => ["user-posts"] as const,
  userPostsPrefix: (username: string) => ["user-posts", username] as const,
  userPosts: (username: string, limit: number, offset: number, sort: PostSort) =>
    ["user-posts", username, { limit, offset, sort }] as const,
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
) {
  return useQuery({
    queryKey: postQueryKeys.latest(limit, offset, sort),
    queryFn: () => listLatestPosts(limit, offset, sort),
    enabled,
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
