import { apiRequest } from "@/lib/api/client";

import type { GetPublicUserResponse } from "./types";

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
