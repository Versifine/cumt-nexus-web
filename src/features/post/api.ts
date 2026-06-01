import { apiRequest } from "@/lib/api/client";

import type {
  GetPostResponse,
  ListPostsResponse,
  PublishPostInput,
  PublishPostResponse,
} from "./types";

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

export function publishPost(slug: string, input: PublishPostInput) {
  return apiRequest<PublishPostResponse>(
    `/api/v1/communities/${encodeURIComponent(slug)}/posts`,
    {
      method: "POST",
      body: input,
    },
  );
}

export function getPost(id: string) {
  return apiRequest<GetPostResponse>(`/api/v1/posts/${encodeURIComponent(id)}`);
}
