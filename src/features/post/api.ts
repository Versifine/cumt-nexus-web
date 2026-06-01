import { apiRequest } from "@/lib/api/client";

import type { ListPostsResponse } from "./types";

type ListCommunityPostsInput = {
  slug: string;
  limit?: number;
  offset?: number;
};

export function listCommunityPosts({
  slug,
  limit = 20,
  offset = 0,
}: ListCommunityPostsInput) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  return apiRequest<ListPostsResponse>(
    `/api/v1/communities/${encodeURIComponent(slug)}/posts?${params.toString()}`,
  );
}
