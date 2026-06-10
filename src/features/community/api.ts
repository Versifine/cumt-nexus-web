import { apiRequest } from "@/lib/api/client";

import type {
  ApproveCommunityApplicationResponse,
  CreateCommunityRuleInput,
  CreateCommunityRuleResponse,
  DeleteCommunityRuleInput,
  GetCommunityResponse,
  GetCommunityApplicationResponse,
  GetCommunityManageContextResponse,
  GetCommunityManageSettingsResponse,
  ListCommunityMembersInput,
  ListCommunityMembersResponse,
  ListCommunityManageCommentsInput,
  ListCommunityManageCommentsResponse,
  ListCommunityManagePostsInput,
  ListCommunityManagePostsResponse,
  ListCommunityManageReportsInput,
  ListCommunityManageReportsResponse,
  ListCommunityRulesResponse,
  ListCommunityApplicationsInput,
  ListCommunityApplicationsResponse,
  ListCommunitiesResponse,
  RejectCommunityApplicationInput,
  RejectCommunityApplicationResponse,
  SubmitCommunityApplicationInput,
  SubmitCommunityApplicationResponse,
  UpdateCommunityManageSettingsInput,
  UpdateCommunityManageSettingsResponse,
  UpdateCommunityRuleInput,
  UpdateCommunityRuleResponse,
} from "./types";

type GetCommunityOptions = {
  cache?: RequestCache;
  timeoutMs?: number;
  token?: string | null;
};

type CommunityManageListInput = {
  limit?: number;
  offset?: number;
  slug: string;
  status?: string;
};

export function listCommunities() {
  return apiRequest<ListCommunitiesResponse>("/api/v1/communities");
}

export function getCommunity(slug: string, options: GetCommunityOptions = {}) {
  return apiRequest<GetCommunityResponse>(
    `/api/v1/communities/${encodeURIComponent(slug)}`,
    {
      cache: options.cache,
      timeoutMs: options.timeoutMs,
      token: options.token,
    },
  );
}

export function getCommunityManageContext(slug: string) {
  return apiRequest<GetCommunityManageContextResponse>(
    `/api/v1/communities/${encodeURIComponent(slug)}/manage`,
  );
}

export function listCommunityMembers(input: ListCommunityMembersInput) {
  const searchParams = new URLSearchParams({
    limit: String(input.limit ?? 5),
    offset: String(input.offset ?? 0),
  });

  return apiRequest<ListCommunityMembersResponse>(
    `/api/v1/communities/${encodeURIComponent(input.slug)}/manage/members?${searchParams.toString()}`,
  );
}

export function getCommunityManageSettings(slug: string) {
  return apiRequest<GetCommunityManageSettingsResponse>(
    `/api/v1/communities/${encodeURIComponent(slug)}/manage/settings`,
  );
}

export function updateCommunityManageSettings({
  slug,
  ...input
}: UpdateCommunityManageSettingsInput) {
  return apiRequest<UpdateCommunityManageSettingsResponse>(
    `/api/v1/communities/${encodeURIComponent(slug)}/manage/settings`,
    {
      method: "PATCH",
      body: input,
    },
  );
}

export function listCommunityRules(slug: string) {
  return apiRequest<ListCommunityRulesResponse>(
    `/api/v1/communities/${encodeURIComponent(slug)}/manage/rules`,
  );
}

export function createCommunityRule({ slug, ...input }: CreateCommunityRuleInput) {
  return apiRequest<CreateCommunityRuleResponse>(
    `/api/v1/communities/${encodeURIComponent(slug)}/manage/rules`,
    {
      method: "POST",
      body: input,
    },
  );
}

export function updateCommunityRule({
  rule_id,
  slug,
  ...input
}: UpdateCommunityRuleInput) {
  return apiRequest<UpdateCommunityRuleResponse>(
    `/api/v1/communities/${encodeURIComponent(slug)}/manage/rules/${encodeURIComponent(rule_id)}`,
    {
      method: "PATCH",
      body: input,
    },
  );
}

export function deleteCommunityRule({ rule_id, slug }: DeleteCommunityRuleInput) {
  return apiRequest<void>(
    `/api/v1/communities/${encodeURIComponent(slug)}/manage/rules/${encodeURIComponent(rule_id)}`,
    {
      method: "DELETE",
    },
  );
}

export function listCommunityManagePosts(input: ListCommunityManagePostsInput) {
  return apiRequest<ListCommunityManagePostsResponse>(
    getCommunityManageListPath(input, "posts"),
  );
}

export function listCommunityManageComments(
  input: ListCommunityManageCommentsInput,
) {
  return apiRequest<ListCommunityManageCommentsResponse>(
    getCommunityManageListPath(input, "comments"),
  );
}

export function listCommunityManageReports(input: ListCommunityManageReportsInput) {
  return apiRequest<ListCommunityManageReportsResponse>(
    getCommunityManageListPath(input, "reports"),
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

function getCommunityManageListPath(
  { limit = 5, offset = 0, slug, status = "all" }: CommunityManageListInput,
  resource: "comments" | "posts" | "reports",
) {
  const searchParams = new URLSearchParams({
    status,
    limit: String(limit),
    offset: String(offset),
  });

  return `/api/v1/communities/${encodeURIComponent(slug)}/manage/${resource}?${searchParams.toString()}`;
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
