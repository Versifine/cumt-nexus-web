import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { searchContent } from "./api";
import type { SearchInput, SearchScope } from "./types";

export const searchQueryKeys = {
  all: ["search"] as const,
  infiniteResults: (q: string, scope: SearchScope, limit: number) =>
    ["search", "infinite", { limit, q, scope }] as const,
  results: (q: string, scope: SearchScope, limit: number, offset: number) =>
    ["search", { limit, offset, q, scope }] as const,
};

export function useSearchQuery({
  q,
  scope = "all",
  limit = 20,
  offset = 0,
}: SearchInput, enabled = true) {
  const normalizedQuery = q.trim();

  return useQuery({
    queryKey: searchQueryKeys.results(normalizedQuery, scope, limit, offset),
    queryFn: () => searchContent({ q: normalizedQuery, scope, limit, offset }),
    enabled: enabled && normalizedQuery.length > 0,
  });
}

export function useInfiniteSearchQuery({
  q,
  scope = "all",
  limit = 20,
}: SearchInput, enabled = true) {
  const normalizedQuery = q.trim();

  return useInfiniteQuery({
    queryKey: searchQueryKeys.infiniteResults(normalizedQuery, scope, limit),
    queryFn: ({ pageParam }) =>
      searchContent({
        q: normalizedQuery,
        scope,
        limit,
        offset: pageParam,
      }),
    enabled: enabled && normalizedQuery.length > 0,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const hasMoreUsers =
        scope !== "communities" &&
        scope !== "posts" &&
        (lastPage.users ?? []).length >= lastPage.limit;
      const hasMoreCommunities =
        scope !== "posts" &&
        scope !== "users" &&
        lastPage.communities.length >= lastPage.limit;
      const hasMorePosts =
        scope !== "communities" &&
        scope !== "users" &&
        lastPage.posts.length >= lastPage.limit;

      if (!hasMoreUsers && !hasMoreCommunities && !hasMorePosts) {
        return undefined;
      }

      return lastPage.offset + lastPage.limit;
    },
  });
}
