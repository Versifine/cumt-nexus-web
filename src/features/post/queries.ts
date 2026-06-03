import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { deletePost, getPost, listCommunityPosts, listLatestPosts, updatePost } from "./api";
import type { UpdatePostInput } from "./types";

export const postQueryKeys = {
  latestPrefix: () => ["latest-posts"] as const,
  latest: (limit: number, offset: number) => ["latest-posts", { limit, offset }] as const,
  detail: (id: string) => ["post", id] as const,
  communityPostsAll: () => ["community-posts"] as const,
  communityPostsPrefix: (slug: string) => ["community-posts", slug] as const,
  communityPosts: (slug: string, limit: number, offset: number) =>
    ["community-posts", slug, { limit, offset }] as const,
};

export function usePostQuery(id: string, enabled = true) {
  return useQuery({
    queryKey: postQueryKeys.detail(id),
    queryFn: () => getPost(id),
    enabled,
  });
}

export function useLatestPostsQuery(limit = 20, offset = 0, enabled = true) {
  return useQuery({
    queryKey: postQueryKeys.latest(limit, offset),
    queryFn: () => listLatestPosts(limit, offset),
    enabled,
  });
}

export function useCommunityPostsQuery(
  slug: string,
  limit = 20,
  offset = 0,
  enabled = true,
) {
  return useQuery({
    queryKey: postQueryKeys.communityPosts(slug, limit, offset),
    queryFn: () => listCommunityPosts({ slug, limit, offset }),
    enabled,
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
    },
  });
}
