import { useQuery } from "@tanstack/react-query";

import { searchContent } from "./api";
import type { SearchInput, SearchScope } from "./types";

export const searchQueryKeys = {
  all: ["search"] as const,
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
