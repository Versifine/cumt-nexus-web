import { apiRequest } from "@/lib/api/client";

import type {
  GetPostResponse,
  ListPostsResponse,
  PostSort,
  PublishPostInput,
  PublishPostResponse,
  UpdatePostInput,
  UpdatePostResponse,
} from "./types";

type ListCommunityPostsInput = {
  slug: string;
  limit?: number;
  offset?: number;
  sort?: PostSort;
};

type ListUserPostsInput = {
  username: string;
  limit?: number;
  offset?: number;
  sort?: PostSort;
  cache?: RequestCache;
  token?: string | null;
};

export function listCommunityPosts({
  slug,
  limit = 20,
  offset = 0,
  sort = "new",
}: ListCommunityPostsInput) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    sort,
  });

  return apiRequest<ListPostsResponse>(
    `/api/v1/communities/${encodeURIComponent(slug)}/posts?${params.toString()}`,
  );
}

export function listLatestPosts(limit = 20, offset = 0, sort: PostSort = "new") {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    sort,
  });

  return apiRequest<ListPostsResponse>(`/api/v1/posts?${params.toString()}`);
}

export function listUserPosts({
  username,
  limit = 20,
  offset = 0,
  sort = "new",
  cache,
  token,
}: ListUserPostsInput) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    sort,
  });

  return apiRequest<ListPostsResponse>(
    `/api/v1/users/${encodeURIComponent(username)}/posts?${params.toString()}`,
    {
      cache,
      token,
    },
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

export function updatePost(id: string, input: UpdatePostInput) {
  return apiRequest<UpdatePostResponse>(`/api/v1/posts/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: input,
  });
}

export function deletePost(id: string) {
  return apiRequest<void>(`/api/v1/posts/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
