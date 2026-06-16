import { apiRequest } from "@/lib/api/client";

import type {
  ApproveCommunityApplicationResponse,
  AcceptCommunityOwnerTransferInput,
  AcceptCommunityOwnerTransferResponse,
  AppointCommunityModeratorInput,
  AppointCommunityModeratorResponse,
  CancelCommunityOwnerTransferInput,
  CancelCommunityOwnerTransferResponse,
  CommunityModerationTemplateResponse,
  CommunityModerationTemplateKind,
  CreateCommunityRuleInput,
  CreateCommunityRuleResponse,
  CreateCommunityModeratorNoteInput,
  CreateCommunityModeratorNoteResponse,
  CreateCommunityModerationTemplateInput,
  CreateCommunityOwnerTransferInput,
  CreateCommunityOwnerTransferResponse,
  DeleteCommunityModerationTemplateInput,
  DeleteCommunityModeratorNoteInput,
  DeleteCommunityRuleInput,
  DeleteCommunityUserStateInput,
  GetCommunityModerationUserProfileInput,
  GetCommunityModerationUserProfileResponse,
  GetCommunityOwnerTransferByIdInput,
  GetCommunityOwnerTransferByIdResponse,
  GetCommunityOwnerTransferInput,
  GetCommunityOwnerTransferResponse,
  GetCommunityResponse,
  GetCommunityApplicationResponse,
  GetCommunityManageContextResponse,
  GetCommunityManageSettingsResponse,
  ListCommunityModLogsInput,
  ListCommunityModLogsResponse,
  ListFollowedCommunitiesInput,
  ListFollowedCommunitiesResponse,
  ListCommunityMembersInput,
  ListCommunityMembersResponse,
  ListCommunityManageCommentsInput,
  ListCommunityManageCommentsResponse,
  ListCommunityManagePostsInput,
  ListCommunityManagePostsResponse,
  ListCommunityManageReportsInput,
  ListCommunityManageReportsResponse,
  ListCommunityModerationTemplatesInput,
  ListCommunityModerationTemplatesResponse,
  ListCommunityModeratorNotesInput,
  ListCommunityModeratorNotesResponse,
  ListCommunityRulesResponse,
  ListCommunityUserStatesInput,
  ListCommunityUserStatesResponse,
  ListCommunityApplicationsInput,
  ListCommunityApplicationsResponse,
  ListCommunitiesResponse,
  ListIncomingCommunityOwnerTransfersInput,
  ListIncomingCommunityOwnerTransfersResponse,
  RejectCommunityApplicationInput,
  RejectCommunityApplicationResponse,
  RemoveCommunityModeratorInput,
  RemoveCommunityModeratorResponse,
  SubmitCommunityApplicationInput,
  SubmitCommunityApplicationResponse,
  UpdateCommunityModerationTemplateInput,
  UpdateCommunityManageSettingsInput,
  UpdateCommunityManageSettingsResponse,
  UpdateCommunityRuleInput,
  UpdateCommunityRuleResponse,
  UpsertCommunityUserStateInput,
  UpsertCommunityUserStateResponse,
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

export function listFollowedCommunities({
  limit = 5,
  offset = 0,
}: ListFollowedCommunitiesInput = {}) {
  const searchParams = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  return apiRequest<ListFollowedCommunitiesResponse>(
    `/api/v1/me/followed-communities?${searchParams.toString()}`,
  );
}

export function listIncomingCommunityOwnerTransfers({
  limit = 5,
  offset = 0,
  status = "pending",
}: ListIncomingCommunityOwnerTransfersInput = {}) {
  const searchParams = new URLSearchParams({
    status,
    limit: String(limit),
    offset: String(offset),
  });

  return apiRequest<ListIncomingCommunityOwnerTransfersResponse>(
    `/api/v1/me/community-owner-transfers?${searchParams.toString()}`,
    { cache: "no-store" },
  );
}

export function followCommunity(slug: string) {
  return apiRequest<void>(
    `/api/v1/communities/${encodeURIComponent(slug)}/follow`,
    {
      method: "POST",
    },
  );
}

export function deleteCommunityFollow(slug: string) {
  return apiRequest<void>(
    `/api/v1/communities/${encodeURIComponent(slug)}/follow`,
    {
      method: "DELETE",
    },
  );
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

export function appointCommunityModerator({
  slug,
  ...input
}: AppointCommunityModeratorInput) {
  return apiRequest<AppointCommunityModeratorResponse>(
    `/api/v1/communities/${encodeURIComponent(slug)}/manage/moderators`,
    {
      method: "POST",
      body: input,
    },
  );
}

export function removeCommunityModerator({
  slug,
  user_id,
}: RemoveCommunityModeratorInput) {
  return apiRequest<RemoveCommunityModeratorResponse>(
    `/api/v1/communities/${encodeURIComponent(slug)}/manage/moderators/${encodeURIComponent(user_id)}`,
    {
      method: "DELETE",
    },
  );
}

export function createCommunityOwnerTransfer({
  slug,
  ...input
}: CreateCommunityOwnerTransferInput) {
  return apiRequest<CreateCommunityOwnerTransferResponse>(
    `/api/v1/communities/${encodeURIComponent(slug)}/manage/owner-transfer`,
    {
      method: "POST",
      body: input,
    },
  );
}

export function getCommunityOwnerTransfer({
  slug,
}: GetCommunityOwnerTransferInput) {
  return apiRequest<GetCommunityOwnerTransferResponse>(
    `/api/v1/communities/${encodeURIComponent(slug)}/manage/owner-transfer`,
    { cache: "no-store" },
  );
}

export function getCommunityOwnerTransferById({
  slug,
  transfer_id,
}: GetCommunityOwnerTransferByIdInput) {
  return apiRequest<GetCommunityOwnerTransferByIdResponse>(
    `/api/v1/communities/${encodeURIComponent(slug)}/owner-transfer/${encodeURIComponent(transfer_id)}`,
    { cache: "no-store" },
  );
}

export function acceptCommunityOwnerTransfer({
  slug,
  transfer_id,
}: AcceptCommunityOwnerTransferInput) {
  return apiRequest<AcceptCommunityOwnerTransferResponse>(
    `/api/v1/communities/${encodeURIComponent(slug)}/manage/owner-transfer/${encodeURIComponent(transfer_id)}/accept`,
    {
      method: "POST",
    },
  );
}

export function cancelCommunityOwnerTransfer({
  slug,
  transfer_id,
}: CancelCommunityOwnerTransferInput) {
  return apiRequest<CancelCommunityOwnerTransferResponse>(
    `/api/v1/communities/${encodeURIComponent(slug)}/manage/owner-transfer/${encodeURIComponent(transfer_id)}`,
    {
      method: "DELETE",
    },
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

export function listCommunityModerationTemplates({
  kind,
  slug,
}: ListCommunityModerationTemplatesInput) {
  return apiRequest<ListCommunityModerationTemplatesResponse>(
    `/api/v1/communities/${encodeURIComponent(slug)}/moderation/${getModerationTemplatePath(kind)}`,
  );
}

export function createCommunityModerationTemplate({
  kind,
  slug,
  ...input
}: CreateCommunityModerationTemplateInput) {
  return apiRequest<CommunityModerationTemplateResponse>(
    `/api/v1/communities/${encodeURIComponent(slug)}/moderation/${getModerationTemplatePath(kind)}`,
    {
      method: "POST",
      body: input,
    },
  );
}

export function updateCommunityModerationTemplate({
  kind,
  slug,
  template_id,
  ...input
}: UpdateCommunityModerationTemplateInput) {
  return apiRequest<CommunityModerationTemplateResponse>(
    `/api/v1/communities/${encodeURIComponent(slug)}/moderation/${getModerationTemplatePath(kind)}/${encodeURIComponent(template_id)}`,
    {
      method: "PATCH",
      body: input,
    },
  );
}

export function deleteCommunityModerationTemplate({
  kind,
  slug,
  template_id,
}: DeleteCommunityModerationTemplateInput) {
  return apiRequest<void>(
    `/api/v1/communities/${encodeURIComponent(slug)}/moderation/${getModerationTemplatePath(kind)}/${encodeURIComponent(template_id)}`,
    {
      method: "DELETE",
    },
  );
}

export function listCommunityUserStates(input: ListCommunityUserStatesInput) {
  const searchParams = new URLSearchParams({
    limit: String(input.limit ?? 20),
    offset: String(input.offset ?? 0),
  });

  return apiRequest<ListCommunityUserStatesResponse>(
    `/api/v1/communities/${encodeURIComponent(input.slug)}/manage/${getUserStatePath(input.kind)}?${searchParams.toString()}`,
  );
}

export function upsertCommunityUserState({
  kind,
  slug,
  ...input
}: UpsertCommunityUserStateInput) {
  return apiRequest<UpsertCommunityUserStateResponse>(
    `/api/v1/communities/${encodeURIComponent(slug)}/manage/${getUserStatePath(kind)}`,
    {
      method: "POST",
      body: input,
    },
  );
}

export function deleteCommunityUserState({
  kind,
  slug,
  user_id,
}: DeleteCommunityUserStateInput) {
  return apiRequest<void>(
    `/api/v1/communities/${encodeURIComponent(slug)}/manage/${getUserStatePath(kind)}/${encodeURIComponent(user_id)}`,
    {
      method: "DELETE",
    },
  );
}

export function listCommunityModLogs({
  action,
  actor_id,
  limit = 20,
  offset = 0,
  slug,
  target_id,
  target_type,
}: ListCommunityModLogsInput) {
  const searchParams = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  for (const [key, value] of Object.entries({
    action,
    actor_id,
    target_id,
    target_type,
  })) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  return apiRequest<ListCommunityModLogsResponse>(
    `/api/v1/communities/${encodeURIComponent(slug)}/moderation/logs?${searchParams.toString()}`,
  );
}

export function getCommunityModerationUserProfile({
  slug,
  user_id,
}: GetCommunityModerationUserProfileInput) {
  return apiRequest<GetCommunityModerationUserProfileResponse>(
    `/api/v1/communities/${encodeURIComponent(slug)}/moderation/users/${encodeURIComponent(user_id)}/profile`,
    { cache: "no-store" },
  );
}

export function listCommunityModeratorNotes({
  limit = 20,
  offset = 0,
  slug,
  user_id,
}: ListCommunityModeratorNotesInput) {
  const searchParams = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  return apiRequest<ListCommunityModeratorNotesResponse>(
    `/api/v1/communities/${encodeURIComponent(slug)}/moderation/users/${encodeURIComponent(user_id)}/notes?${searchParams.toString()}`,
    { cache: "no-store" },
  );
}

export function createCommunityModeratorNote({
  body,
  slug,
  user_id,
}: CreateCommunityModeratorNoteInput) {
  return apiRequest<CreateCommunityModeratorNoteResponse>(
    `/api/v1/communities/${encodeURIComponent(slug)}/moderation/users/${encodeURIComponent(user_id)}/notes`,
    {
      method: "POST",
      body: { body },
    },
  );
}

export function deleteCommunityModeratorNote({
  note_id,
  slug,
  user_id,
}: DeleteCommunityModeratorNoteInput) {
  return apiRequest<void>(
    `/api/v1/communities/${encodeURIComponent(slug)}/moderation/users/${encodeURIComponent(user_id)}/notes/${encodeURIComponent(note_id)}`,
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

function getModerationTemplatePath(kind: CommunityModerationTemplateKind) {
  switch (kind) {
    case "removal-reasons":
      return "removal-reasons";
    case "saved-responses":
      return "saved-responses";
  }
}

function getUserStatePath(kind: "approved" | "banned" | "muted") {
  switch (kind) {
    case "approved":
      return "approved-users";
    case "banned":
      return "banned-users";
    case "muted":
      return "muted-users";
  }
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
    { cache: "no-store" },
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
