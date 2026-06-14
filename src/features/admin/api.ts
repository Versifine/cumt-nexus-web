import { apiRequest } from "@/lib/api/client";

import type {
  AdjustAdminUserPointsInput,
  AdjustUserPointsResponse,
  CreateAdminTitleInput,
  CreateAdminTitleResponse,
  GrantAdminUserTitleInput,
  GrantAdminUserTitleResponse,
  ListAdminEffectsResponse,
  ListAdminPointTransactionsResponse,
  ListAdminTitlesResponse,
  ListAdminUserTitleGrantsResponse,
  ListAdminUsersResponse,
  RevokeAdminUserTitleResponse,
  UpdateAdminEffectInput,
  UpdateAdminEffectResponse,
  UpdateAdminTitleInput,
  UpdateAdminTitleResponse,
} from "./types";

type ListInput = {
  limit?: number;
  offset?: number;
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

export function listAdminUsers({ limit = 20, offset = 0 }: ListInput = {}) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  return apiRequest<ListAdminUsersResponse>(
    `/api/v1/admin/users?${params.toString()}`,
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
