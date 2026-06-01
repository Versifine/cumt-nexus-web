import { apiRequest } from "@/lib/api/client";

import type {
  ListCommunitiesResponse,
  SubmitCommunityApplicationInput,
  SubmitCommunityApplicationResponse,
} from "./types";

export function listCommunities() {
  return apiRequest<ListCommunitiesResponse>("/api/v1/communities");
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
