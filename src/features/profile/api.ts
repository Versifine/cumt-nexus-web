import { apiRequest } from "@/lib/api/client";

import type { GetPublicUserResponse } from "./types";

type GetPublicUserOptions = {
  cache?: RequestCache;
  token?: string | null;
};

export function getPublicUser(username: string, options: GetPublicUserOptions = {}) {
  return apiRequest<GetPublicUserResponse>(
    `/api/v1/users/${encodeURIComponent(username)}`,
    {
      cache: options.cache,
      token: options.token,
    },
  );
}
