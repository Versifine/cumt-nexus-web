import { apiRequest } from "@/lib/api/client";

import type {
  GetPublicUserResponse,
  ListFollowedUsersInput,
  ListFollowedUsersResponse,
  UpdateProfileInput,
  UpdateProfileResponse,
} from "./types";

type GetPublicUserOptions = {
  cache?: RequestCache;
  timeoutMs?: number;
  token?: string | null;
};

export function getPublicUser(username: string, options: GetPublicUserOptions = {}) {
  return apiRequest<GetPublicUserResponse>(
    `/api/v1/users/${encodeURIComponent(username)}`,
    {
      cache: options.cache,
      timeoutMs: options.timeoutMs,
      token: options.token,
    },
  );
}

export function updateProfile(input: UpdateProfileInput) {
  return apiRequest<UpdateProfileResponse>("/api/v1/me/profile", {
    method: "PATCH",
    body: input,
  });
}

export function listFollowedUsers({
  limit = 20,
  offset = 0,
}: ListFollowedUsersInput = {}) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  return apiRequest<ListFollowedUsersResponse>(
    `/api/v1/me/followed-users?${params.toString()}`,
  );
}

export function followUser(username: string) {
  return apiRequest<void>(
    `/api/v1/users/${encodeURIComponent(username)}/follow`,
    {
      method: "POST",
    },
  );
}

export function deleteUserFollow(username: string) {
  return apiRequest<void>(
    `/api/v1/users/${encodeURIComponent(username)}/follow`,
    {
      method: "DELETE",
    },
  );
}
