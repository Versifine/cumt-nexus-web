import { apiRequest } from "@/lib/api/client";

import type { ListCommunitiesResponse } from "./types";

export function listCommunities() {
  return apiRequest<ListCommunitiesResponse>("/api/v1/communities");
}
