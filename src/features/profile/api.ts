import { apiRequest } from "@/lib/api/client";

import type {
  GetPublicUserResponse,
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
