import { apiRequest } from "@/lib/api/client";

import type {
  ApproveCommunityApplicationResponse,
  GetCommunityResponse,
  GetCommunityApplicationResponse,
  ListCommunityApplicationsInput,
  ListCommunityApplicationsResponse,
  ListCommunitiesResponse,
  RejectCommunityApplicationInput,
  RejectCommunityApplicationResponse,
  SubmitCommunityApplicationInput,
  SubmitCommunityApplicationResponse,
} from "./types";

type GetCommunityOptions = {
  cache?: RequestCache;
  token?: string | null;
};

export function listCommunities() {
  return apiRequest<ListCommunitiesResponse>("/api/v1/communities");
}

export function getCommunity(slug: string, options: GetCommunityOptions = {}) {
  return apiRequest<GetCommunityResponse>(
    `/api/v1/communities/${encodeURIComponent(slug)}`,
    {
      cache: options.cache,
      token: options.token,
    },
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

export function listCommunityApplications(input: ListCommunityApplicationsInput) {
  const searchParams = new URLSearchParams({
    status: input.status,
    limit: String(input.limit ?? 20),
    offset: String(input.offset ?? 0),
  });

  return apiRequest<ListCommunityApplicationsResponse>(
    `/api/v1/community-applications?${searchParams.toString()}`,
  );
}

export function getCommunityApplication(id: string) {
  return apiRequest<GetCommunityApplicationResponse>(
    `/api/v1/community-applications/${encodeURIComponent(id)}`,
  );
}

export function approveCommunityApplication(id: string) {
  return apiRequest<ApproveCommunityApplicationResponse>(
    `/api/v1/community-applications/${encodeURIComponent(id)}/approve`,
    {
      method: "POST",
    },
  );
}

export function rejectCommunityApplication(
  id: string,
  input: RejectCommunityApplicationInput,
) {
  return apiRequest<RejectCommunityApplicationResponse>(
    `/api/v1/community-applications/${encodeURIComponent(id)}/reject`,
    {
      method: "POST",
      body: input,
    },
  );
}
