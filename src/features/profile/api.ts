import { apiRequest } from "@/lib/api/client";

import type { GetPublicUserResponse } from "./types";

export function getPublicUser(username: string) {
  return apiRequest<GetPublicUserResponse>(
    `/api/v1/users/${encodeURIComponent(username)}`,
  );
}
