import { apiRequest } from "@/lib/api/client";

import type {
  Community,
  ListCommunitiesResponse,
  SubmitCommunityApplicationInput,
  SubmitCommunityApplicationResponse,
} from "./types";

export function listCommunities() {
  return apiRequest<ListCommunitiesResponse>("/api/v1/communities");
}

export function getCommunity(slug: string) {
  return apiRequest<{ community: Community }>(
    `/api/v1/communities/${encodeURIComponent(slug)}`,
  );
}

export function submitCommunityApplication(input: SubmitCommunityApplicationInput) {
  return apiRequest<SubmitCommunityApplicationResponse>(
    "/api/v1/community-applications",
    {
      method: "POST",
      body: input,
    },
  );
}
