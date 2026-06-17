import { apiRequest } from "@/lib/api/client";

import type {
  AcceptAdminOwnerTransferInput,
  AdjustAdminUserPointsInput,
  AdjustUserPointsResponse,
  AdminOwnerTransferResponse,
  CreateAdminOwnerTransferInput,
  CreateAdminTitleInput,
  CreateAdminTitleResponse,
  CreateAdminUserSanctionInput,
  CreateAdminUserSanctionResponse,
  GrantAdminUserTitleInput,
  GrantAdminUserTitleResponse,
  ListAdminAuditLogsResponse,
  ListAdminCommunitiesResponse,
  ListAdminEffectsResponse,
  ListAdminPointTransactionsResponse,
  ListAdminSettingsResponse,
  ListAdminTitlesResponse,
  ListAdminUserSanctionsResponse,
  ListAdminUserTitleGrantsResponse,
  ListAdminUsersResponse,
  RevokeAdminUserSanctionResponse,
  RevokeAdminUserTitleResponse,
  UpdateAdminCommunityOwnerInput,
  UpdateAdminCommunityOwnerResponse,
  UpdateAdminCommunityStatusInput,
  UpdateAdminCommunityStatusResponse,
  UpdateAdminEffectInput,
  UpdateAdminEffectResponse,
  UpdateAdminSettingInput,
  UpdateAdminSettingResponse,
  UpdateAdminTitleInput,
  UpdateAdminTitleResponse,
  UpdateAdminUserPlatformRoleInput,
  UpdateAdminUserPlatformRoleResponse,
  UpdateAdminUserInput,
  UpdateAdminUserResponse,
} from "./types";

type ListInput = {
  limit?: number;
  offset?: number;
};

type ListStatusInput = ListInput & {
  q?: string;
  status?: string;
};

type ListAdminEffectsInput = ListInput & {
  active?: "all" | "true" | "false";
};

type ListAdminTitlesInput = ListInput & {
  active?: "all" | "true" | "false";
  scope_type?: "all" | "platform" | "system" | "community";
};

type ListAdminPointTransactionsInput = ListInput & {
  user_id?: string;
};

type ListAdminAuditLogsInput = ListInput & {
  q?: string;
  target_id?: string;
  target_type?: string;
};

export function listAdminUsers({
  limit = 20,
  offset = 0,
  q,
  status = "all",
}: ListStatusInput = {}) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    status,
  });
  if (q?.trim()) {
    params.set("q", q.trim());
  }

  return apiRequest<ListAdminUsersResponse>(
    `/api/v1/admin/users?${params.toString()}`,
    { cache: "no-store" },
  );
}

export function updateAdminUser(id: string, input: UpdateAdminUserInput) {
  return apiRequest<UpdateAdminUserResponse>(
    `/api/v1/admin/users/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: input,
    },
  );
}

export function updateAdminUserPlatformRole(
  id: string,
  input: UpdateAdminUserPlatformRoleInput,
) {
  return apiRequest<UpdateAdminUserPlatformRoleResponse>(
    `/api/v1/admin/users/${encodeURIComponent(id)}/platform-role`,
    {
      method: "PATCH",
      body: input,
    },
  );
}

export function getCurrentAdminOwnerTransfer() {
  return apiRequest<AdminOwnerTransferResponse>(
    "/api/v1/admin/owner-transfer",
    { cache: "no-store" },
  );
}

export function createAdminOwnerTransfer(input: CreateAdminOwnerTransferInput) {
  return apiRequest<AdminOwnerTransferResponse>(
    "/api/v1/admin/owner-transfer",
    {
      method: "POST",
      body: input,
    },
  );
}

export function cancelAdminOwnerTransfer(transferId: string) {
  return apiRequest<AdminOwnerTransferResponse>(
    `/api/v1/admin/owner-transfer/${encodeURIComponent(transferId)}`,
    {
      method: "DELETE",
    },
  );
}

export function getAdminOwnerTransfer(transferId: string) {
  return apiRequest<AdminOwnerTransferResponse>(
    `/api/v1/owner-transfer/${encodeURIComponent(transferId)}`,
    { cache: "no-store" },
  );
}

export function acceptAdminOwnerTransfer(
  transferId: string,
  input: AcceptAdminOwnerTransferInput,
) {
  return apiRequest<AdminOwnerTransferResponse>(
    `/api/v1/owner-transfer/${encodeURIComponent(transferId)}/accept`,
    {
      method: "POST",
      body: input,
    },
  );
}

export function listAdminCommunities({
  limit = 20,
  offset = 0,
  q,
  status = "all",
}: ListStatusInput = {}) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    status,
  });
  if (q?.trim()) {
    params.set("q", q.trim());
  }

  return apiRequest<ListAdminCommunitiesResponse>(
    `/api/v1/admin/communities?${params.toString()}`,
    { cache: "no-store" },
  );
}

export function updateAdminCommunityStatus(
  id: string,
  input: UpdateAdminCommunityStatusInput,
) {
  return apiRequest<UpdateAdminCommunityStatusResponse>(
    `/api/v1/admin/communities/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: input,
    },
  );
}

export function updateAdminCommunityOwner(
  id: string,
  input: UpdateAdminCommunityOwnerInput,
) {
  return apiRequest<UpdateAdminCommunityOwnerResponse>(
    `/api/v1/admin/communities/${encodeURIComponent(id)}/owner`,
    {
      method: "POST",
      body: input,
    },
  );
}

export function listAdminEffects({
  active = "all",
  limit = 20,
  offset = 0,
}: ListAdminEffectsInput = {}) {
  const params = new URLSearchParams({
    active,
    limit: String(limit),
    offset: String(offset),
  });

  return apiRequest<ListAdminEffectsResponse>(
    `/api/v1/admin/effects?${params.toString()}`,
    { cache: "no-store" },
  );
}

export function updateAdminEffect(id: string, input: UpdateAdminEffectInput) {
  return apiRequest<UpdateAdminEffectResponse>(
    `/api/v1/admin/effects/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: input,
    },
  );
}

export function listAdminSettings() {
  return apiRequest<ListAdminSettingsResponse>("/api/v1/admin/settings", {
    cache: "no-store",
  });
}

export function updateAdminSetting(key: string, input: UpdateAdminSettingInput) {
  return apiRequest<UpdateAdminSettingResponse>(
    `/api/v1/admin/settings/${encodeURIComponent(key)}`,
    {
      method: "PATCH",
      body: input,
    },
  );
}

export function listAdminAuditLogs({
  limit = 20,
  offset = 0,
  q,
  target_id,
  target_type,
}: ListAdminAuditLogsInput = {}) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  if (target_type?.trim()) {
    params.set("target_type", target_type.trim());
  }

  if (q?.trim()) {
    params.set("q", q.trim());
  }

  if (target_id?.trim()) {
    params.set("target_id", target_id.trim());
  }

  return apiRequest<ListAdminAuditLogsResponse>(
    `/api/v1/admin/audit-logs?${params.toString()}`,
    { cache: "no-store" },
  );
}

export function listAdminPointTransactions({
  limit = 20,
  offset = 0,
  user_id,
}: ListAdminPointTransactionsInput = {}) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  if (user_id?.trim()) {
    params.set("user_id", user_id.trim());
  }

  return apiRequest<ListAdminPointTransactionsResponse>(
    `/api/v1/admin/point-transactions?${params.toString()}`,
    { cache: "no-store" },
  );
}

export function adjustAdminUserPoints(
  userId: string,
  input: AdjustAdminUserPointsInput,
) {
  return apiRequest<AdjustUserPointsResponse>(
    `/api/v1/admin/users/${encodeURIComponent(userId)}/points/adjust`,
    {
      method: "POST",
      body: input,
    },
  );
}

export function createAdminUserSanction(
  userId: string,
  input: CreateAdminUserSanctionInput,
) {
  return apiRequest<CreateAdminUserSanctionResponse>(
    `/api/v1/admin/users/${encodeURIComponent(userId)}/sanctions`,
    {
      method: "POST",
      body: input,
    },
  );
}

export function listAdminUserSanctions(
  userId: string,
  { limit = 20, offset = 0 }: ListInput = {},
) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  return apiRequest<ListAdminUserSanctionsResponse>(
    `/api/v1/admin/users/${encodeURIComponent(userId)}/sanctions?${params.toString()}`,
    { cache: "no-store" },
  );
}

export function revokeAdminUserSanction(sanctionId: string) {
  return apiRequest<RevokeAdminUserSanctionResponse>(
    `/api/v1/admin/user-sanctions/${encodeURIComponent(sanctionId)}/revoke`,
    {
      method: "POST",
    },
  );
}

export function listAdminTitles({
  active = "all",
  limit = 20,
  offset = 0,
  scope_type = "all",
}: ListAdminTitlesInput = {}) {
  const params = new URLSearchParams({
    active,
    limit: String(limit),
    offset: String(offset),
    scope_type,
  });

  return apiRequest<ListAdminTitlesResponse>(
    `/api/v1/admin/titles?${params.toString()}`,
    { cache: "no-store" },
  );
}

export function createAdminTitle(input: CreateAdminTitleInput) {
  return apiRequest<CreateAdminTitleResponse>("/api/v1/admin/titles", {
    method: "POST",
    body: input,
  });
}

export function updateAdminTitle(id: string, input: UpdateAdminTitleInput) {
  return apiRequest<UpdateAdminTitleResponse>(
    `/api/v1/admin/titles/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: input,
    },
  );
}

export function listAdminUserTitleGrants(
  userId: string,
  { limit = 20, offset = 0 }: ListInput = {},
) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  return apiRequest<ListAdminUserTitleGrantsResponse>(
    `/api/v1/admin/users/${encodeURIComponent(userId)}/titles?${params.toString()}`,
    { cache: "no-store" },
  );
}

export function grantAdminUserTitle(
  userId: string,
  input: GrantAdminUserTitleInput,
) {
  return apiRequest<GrantAdminUserTitleResponse>(
    `/api/v1/admin/users/${encodeURIComponent(userId)}/titles`,
    {
      method: "POST",
      body: input,
    },
  );
}

export function revokeAdminUserTitle(userId: string, grantId: string) {
  return apiRequest<RevokeAdminUserTitleResponse>(
    `/api/v1/admin/users/${encodeURIComponent(userId)}/titles/${encodeURIComponent(grantId)}`,
    {
      method: "DELETE",
    },
  );
}
