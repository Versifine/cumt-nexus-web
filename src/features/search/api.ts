import { apiRequest } from "@/lib/api/client";

import type { SearchInput, SearchResponse } from "./types";

export function searchContent({
  q,
  scope = "all",
  limit = 20,
  offset = 0,
}: SearchInput) {
  const params = new URLSearchParams({
    q,
    scope,
    limit: String(limit),
    offset: String(offset),
  });

  return apiRequest<SearchResponse>(`/api/v1/search?${params.toString()}`);
}
