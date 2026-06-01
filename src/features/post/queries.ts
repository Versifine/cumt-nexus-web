import { useQuery } from "@tanstack/react-query";

import { getPost, listCommunityPosts } from "./api";

export const postQueryKeys = {
  detail: (id: string) => ["post", id] as const,
  communityPostsPrefix: (slug: string) => ["community-posts", slug] as const,
  communityPosts: (slug: string, limit: number, offset: number) =>
    ["community-posts", slug, { limit, offset }] as const,
};

export function usePostQuery(id: string) {
  return useQuery({
    queryKey: postQueryKeys.detail(id),
    queryFn: () => getPost(id),
  });
}

export function useCommunityPostsQuery(slug: string, limit = 20, offset = 0) {
  return useQuery({
    queryKey: postQueryKeys.communityPosts(slug, limit, offset),
    queryFn: () => listCommunityPosts({ slug, limit, offset }),
  });
}
