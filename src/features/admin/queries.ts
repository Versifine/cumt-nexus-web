"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import { effectQueryKeys } from "@/features/effect/queries";
import { notificationQueryKeys } from "@/features/notification/queries";
import { progressionQueryKeys } from "@/features/progression/queries";
import { authQueryKeys } from "@/features/auth/query-keys";

import {
  acceptAdminOwnerTransfer,
  adjustAdminUserPoints,
  cancelAdminOwnerTransfer,
  createAdminOwnerTransfer,
  createAdminTitle,
  createAdminUserSanction,
  getAdminOwnerTransfer,
  getCurrentAdminOwnerTransfer,
  grantAdminUserTitle,
  listAdminAuditLogs,
  listAdminCommunities,
  listAdminEffects,
  listAdminPointTransactions,
  listAdminSettings,
  listAdminTitles,
  listAdminUserSanctions,
  listAdminUserTitleGrants,
  listAdminUsers,
  revokeAdminUserSanction,
  revokeAdminUserTitle,
  updateAdminCommunityOwner,
  updateAdminCommunityStatus,
  updateAdminEffect,
  updateAdminSetting,
  updateAdminTitle,
  updateAdminUser,
  updateAdminUserPlatformRole,
} from "./api";
import type {
  AcceptAdminOwnerTransferInput,
  AdjustAdminUserPointsInput,
  AdminCommunity,
  AdminSetting,
  AdminUser,
  CreateAdminOwnerTransferInput,
  CreateAdminTitleInput,
  CreateAdminUserSanctionInput,
  GrantAdminUserTitleInput,
  ListAdminCommunitiesResponse,
  ListAdminEffectsResponse,
  ListAdminSettingsResponse,
  ListAdminTitlesResponse,
  ListAdminUserSanctionsResponse,
  ListAdminUserTitleGrantsResponse,
  ListAdminUsersResponse,
  UpdateAdminCommunityOwnerInput,
  UpdateAdminCommunityStatusInput,
  UpdateAdminSettingInput,
  UpdateAdminTitleInput,
  UpdateAdminUserInput,
  UpdateAdminUserPlatformRoleInput,
} from "./types";

type ListInput = {
  limit?: number;
  offset?: number;
};

type AdminStatusInput = ListInput & {
  q?: string;
  status?: string;
};

type AdminEffectsInput = ListInput & {
  active?: "all" | "true" | "false";
};

type AdminTitlesInput = ListInput & {
  active?: "all" | "true" | "false";
  scope_type?: "all" | "platform" | "system" | "community";
};

type AdminPointTransactionsInput = ListInput & {
  user_id?: string;
};

type AdminAuditLogsInput = ListInput & {
  q?: string;
  target_id?: string;
  target_type?: string;
};

const ADMIN_QUERY_STALE_TIME = 0;

export const adminQueryKeys = {
  all: ["admin"] as const,
  dashboard: () => [...adminQueryKeys.all, "dashboard"] as const,
  users: (input: AdminStatusInput) =>
    [
      ...adminQueryKeys.all,
      "users",
      input.status ?? "all",
      input.q?.trim() ?? "",
      input.limit ?? 20,
      input.offset ?? 0,
    ] as const,
  communities: (input: AdminStatusInput) =>
    [
      ...adminQueryKeys.all,
      "communities",
      input.status ?? "all",
      input.q?.trim() ?? "",
      input.limit ?? 20,
      input.offset ?? 0,
    ] as const,
  effects: (input: AdminEffectsInput) =>
    [
      ...adminQueryKeys.all,
      "effects",
      input.active ?? "all",
      input.limit ?? 20,
      input.offset ?? 0,
    ] as const,
  settings: () => [...adminQueryKeys.all, "settings"] as const,
  ownerTransfer: () => [...adminQueryKeys.all, "owner-transfer"] as const,
  ownerTransferById: (transferId: string) =>
    [...adminQueryKeys.all, "owner-transfer", transferId] as const,
  auditLogs: (input: AdminAuditLogsInput) =>
    [
      ...adminQueryKeys.all,
      "audit-logs",
      input.q?.trim() ?? "",
      input.target_type ?? "",
      input.target_id ?? "",
      input.limit ?? 20,
      input.offset ?? 0,
    ] as const,
  pointTransactions: (input: AdminPointTransactionsInput) =>
    [
      ...adminQueryKeys.all,
      "point-transactions",
      input.user_id ?? "",
      input.limit ?? 20,
      input.offset ?? 0,
    ] as const,
  titles: (input: AdminTitlesInput) =>
    [
      ...adminQueryKeys.all,
      "titles",
      input.scope_type ?? "all",
      input.active ?? "all",
      input.limit ?? 20,
      input.offset ?? 0,
    ] as const,
  userTitleGrants: (userId: string, input: ListInput) =>
    [
      ...adminQueryKeys.all,
      "users",
      userId,
      "titles",
      input.limit ?? 20,
      input.offset ?? 0,
    ] as const,
  userSanctions: (userId: string, input: ListInput) =>
    [
      ...adminQueryKeys.all,
      "users",
      userId,
      "sanctions",
      input.limit ?? 20,
      input.offset ?? 0,
    ] as const,
};

export function useAdminUsersQuery(input: AdminStatusInput = {}, enabled = true) {
  return useQuery({
    queryKey: adminQueryKeys.users(input),
    queryFn: () => listAdminUsers(input),
    enabled,
    staleTime: ADMIN_QUERY_STALE_TIME,
  });
}

export function useUpdateAdminUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAdminUserInput }) =>
      updateAdminUser(id, input),
    onSuccess: (result) => {
      updateAdminUserListCaches(queryClient, result.user);
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.all });
    },
  });
}

export function useUpdateAdminUserPlatformRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdateAdminUserPlatformRoleInput;
    }) => updateAdminUserPlatformRole(id, input),
    onSuccess: (result) => {
      updateAdminUserListCaches(queryClient, result.user);
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: authQueryKeys.me() }),
        queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all }),
      ]);
    },
  });
}

export function useAdminOwnerTransferQuery(enabled = true) {
  return useQuery({
    queryKey: adminQueryKeys.ownerTransfer(),
    queryFn: getCurrentAdminOwnerTransfer,
    enabled,
    staleTime: ADMIN_QUERY_STALE_TIME,
  });
}

export function useOwnerTransferQuery(transferId: string, enabled = true) {
  return useQuery({
    queryKey: adminQueryKeys.ownerTransferById(transferId),
    queryFn: () => getAdminOwnerTransfer(transferId),
    enabled: enabled && Boolean(transferId.trim()),
    staleTime: ADMIN_QUERY_STALE_TIME,
  });
}

export function useCreateAdminOwnerTransferMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateAdminOwnerTransferInput) =>
      createAdminOwnerTransfer(input),
    onSuccess: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: authQueryKeys.me() }),
      ]);
    },
  });
}

export function useCancelAdminOwnerTransferMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (transferId: string) => cancelAdminOwnerTransfer(transferId),
    onSuccess: (_result, transferId) => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.all }),
        queryClient.invalidateQueries({
          queryKey: adminQueryKeys.ownerTransferById(transferId),
        }),
        queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all }),
      ]);
    },
  });
}

export function useAcceptOwnerTransferMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      input,
      transferId,
    }: {
      input: AcceptAdminOwnerTransferInput;
      transferId: string;
    }) => acceptAdminOwnerTransfer(transferId, input),
    onSuccess: (_result, { transferId }) => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.all }),
        queryClient.invalidateQueries({
          queryKey: adminQueryKeys.ownerTransferById(transferId),
        }),
        queryClient.invalidateQueries({ queryKey: authQueryKeys.me() }),
        queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all }),
      ]);
    },
  });
}

export function useAdminCommunitiesQuery(
  input: AdminStatusInput = {},
  enabled = true,
) {
  return useQuery({
    queryKey: adminQueryKeys.communities(input),
    queryFn: () => listAdminCommunities(input),
    enabled,
    staleTime: ADMIN_QUERY_STALE_TIME,
  });
}

export function useUpdateAdminCommunityStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdateAdminCommunityStatusInput;
    }) => updateAdminCommunityStatus(id, input),
    onSuccess: (result) => {
      updateAdminCommunityListCaches(queryClient, result.community);
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["communities"] }),
      ]);
    },
  });
}

export function useUpdateAdminCommunityOwnerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdateAdminCommunityOwnerInput;
    }) => updateAdminCommunityOwner(id, input),
    onSuccess: (result) => {
      updateAdminCommunityListCaches(queryClient, result.community);
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["communities"] }),
      ]);
    },
  });
}

export function useAdminEffectsQuery(
  input: AdminEffectsInput = {},
  enabled = true,
) {
  return useQuery({
    queryKey: adminQueryKeys.effects(input),
    queryFn: () => listAdminEffects(input),
    enabled,
    staleTime: ADMIN_QUERY_STALE_TIME,
  });
}

export function useUpdateAdminEffectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateAdminEffect(id, { is_active: isActive }),
    onSuccess: (result) => {
      queryClient.setQueriesData<ListAdminEffectsResponse>(
        { queryKey: [...adminQueryKeys.all, "effects"] },
        (current) =>
          current
            ? {
                ...current,
                effects: current.effects.map((effect) =>
                  effect.id === result.effect.id ? result.effect : effect,
                ),
              }
            : current,
      );
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: effectQueryKeys.all }),
      ]);
    },
  });
}

export function useAdminSettingsQuery(enabled = true) {
  return useQuery({
    queryKey: adminQueryKeys.settings(),
    queryFn: listAdminSettings,
    enabled,
    staleTime: ADMIN_QUERY_STALE_TIME,
  });
}

export function useUpdateAdminSettingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      input,
      key,
    }: {
      input: UpdateAdminSettingInput;
      key: string;
    }) => updateAdminSetting(key, input),
    onSuccess: (result) => {
      updateAdminSettingsCache(queryClient, result.setting);
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.all });
    },
  });
}

export function useAdminAuditLogsQuery(
  input: AdminAuditLogsInput = {},
  enabled = true,
) {
  return useQuery({
    queryKey: adminQueryKeys.auditLogs(input),
    queryFn: () => listAdminAuditLogs(input),
    enabled,
    staleTime: ADMIN_QUERY_STALE_TIME,
  });
}

export function useAdminPointTransactionsQuery(
  input: AdminPointTransactionsInput = {},
  enabled = true,
) {
  return useQuery({
    queryKey: adminQueryKeys.pointTransactions(input),
    queryFn: () => listAdminPointTransactions(input),
    enabled,
    staleTime: ADMIN_QUERY_STALE_TIME,
  });
}

export function useAdjustAdminUserPointsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      input,
      userId,
    }: {
      input: AdjustAdminUserPointsInput;
      userId: string;
    }) => adjustAdminUserPoints(userId, input),
    onSuccess: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.all }),
        queryClient.invalidateQueries({
          queryKey: progressionQueryKeys.pointTransactions({}),
        }),
      ]);
    },
  });
}

export function useAdminUserSanctionsQuery(
  userId: string,
  input: ListInput = {},
  enabled = true,
) {
  return useQuery({
    queryKey: adminQueryKeys.userSanctions(userId, input),
    queryFn: () => listAdminUserSanctions(userId, input),
    enabled: enabled && Boolean(userId.trim()),
    staleTime: ADMIN_QUERY_STALE_TIME,
  });
}

export function useCreateAdminUserSanctionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      input,
      userId,
    }: {
      input: CreateAdminUserSanctionInput;
      userId: string;
    }) => createAdminUserSanction(userId, input),
    onSuccess: (result, { userId }) => {
      queryClient.setQueriesData<ListAdminUserSanctionsResponse>(
        { queryKey: [...adminQueryKeys.all, "users", userId, "sanctions"] },
        (current) =>
          current
            ? {
                ...current,
                sanctions: [result.sanction, ...current.sanctions],
              }
            : current,
      );
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: authQueryKeys.me() }),
      ]);
    },
  });
}

export function useRevokeAdminUserSanctionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sanctionId,
    }: {
      sanctionId: string;
      userId: string;
    }) => revokeAdminUserSanction(sanctionId),
    onSuccess: (result, { userId }) => {
      queryClient.setQueriesData<ListAdminUserSanctionsResponse>(
        { queryKey: [...adminQueryKeys.all, "users", userId, "sanctions"] },
        (current) =>
          current
            ? {
                ...current,
                sanctions: current.sanctions.map((sanction) =>
                  sanction.id === result.sanction.id
                    ? result.sanction
                    : sanction,
                ),
              }
            : current,
      );
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.all });
    },
  });
}

export function useAdminTitlesQuery(input: AdminTitlesInput = {}, enabled = true) {
  return useQuery({
    queryKey: adminQueryKeys.titles(input),
    queryFn: () => listAdminTitles(input),
    enabled,
    staleTime: ADMIN_QUERY_STALE_TIME,
  });
}

export function useCreateAdminTitleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateAdminTitleInput) => createAdminTitle(input),
    onSuccess: (result) => {
      queryClient.setQueriesData<ListAdminTitlesResponse>(
        { queryKey: [...adminQueryKeys.all, "titles"] },
        (current) =>
          current
            ? {
                ...current,
                titles: [result.title, ...current.titles],
              }
            : current,
      );
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.all });
    },
  });
}

export function useUpdateAdminTitleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAdminTitleInput }) =>
      updateAdminTitle(id, input),
    onSuccess: (result) => {
      queryClient.setQueriesData<ListAdminTitlesResponse>(
        { queryKey: [...adminQueryKeys.all, "titles"] },
        (current) =>
          current
            ? {
                ...current,
                titles: current.titles.map((title) =>
                  title.id === result.title.id ? result.title : title,
                ),
              }
            : current,
      );
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: progressionQueryKeys.all }),
      ]);
    },
  });
}

export function useAdminUserTitleGrantsQuery(
  userId: string,
  input: ListInput = {},
  enabled = true,
) {
  return useQuery({
    queryKey: adminQueryKeys.userTitleGrants(userId, input),
    queryFn: () => listAdminUserTitleGrants(userId, input),
    enabled: enabled && Boolean(userId.trim()),
    staleTime: ADMIN_QUERY_STALE_TIME,
  });
}

export function useGrantAdminUserTitleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      input,
      userId,
    }: {
      input: GrantAdminUserTitleInput;
      userId: string;
    }) => grantAdminUserTitle(userId, input),
    onSuccess: (result, { userId }) => {
      queryClient.setQueriesData<ListAdminUserTitleGrantsResponse>(
        { queryKey: [...adminQueryKeys.all, "users", userId, "titles"] },
        (current) =>
          current
            ? {
                ...current,
                titles: [result.grant, ...current.titles],
              }
            : current,
      );
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: progressionQueryKeys.all }),
      ]);
    },
  });
}

export function useRevokeAdminUserTitleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ grantId, userId }: { grantId: string; userId: string }) =>
      revokeAdminUserTitle(userId, grantId),
    onSuccess: (result, { userId }) => {
      queryClient.setQueriesData<ListAdminUserTitleGrantsResponse>(
        { queryKey: [...adminQueryKeys.all, "users", userId, "titles"] },
        (current) =>
          current
            ? {
                ...current,
                titles: current.titles.map((grant) =>
                  grant.id === result.grant.id ? result.grant : grant,
                ),
              }
            : current,
      );
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: progressionQueryKeys.all }),
      ]);
    },
  });
}

function updateAdminUserListCaches(queryClient: QueryClient, user: AdminUser) {
  queryClient.setQueriesData<ListAdminUsersResponse>(
    { queryKey: [...adminQueryKeys.all, "users"] },
    (current) => {
      if (!current) {
        return current;
      }

      const users = updateStatusScopedItems({
        item: user,
        items: current.users,
        statusFilter: current.status,
      });

      return users === current.users ? current : { ...current, users };
    },
  );
}

function updateAdminCommunityListCaches(
  queryClient: QueryClient,
  community: AdminCommunity,
) {
  queryClient.setQueriesData<ListAdminCommunitiesResponse>(
    { queryKey: [...adminQueryKeys.all, "communities"] },
    (current) => {
      if (!current) {
        return current;
      }

      const communities = updateStatusScopedItems({
        item: community,
        items: current.communities,
        statusFilter: current.status,
      });

      return communities === current.communities
        ? current
        : { ...current, communities };
    },
  );
}

function updateAdminSettingsCache(
  queryClient: QueryClient,
  setting: AdminSetting,
) {
  queryClient.setQueryData<ListAdminSettingsResponse>(
    adminQueryKeys.settings(),
    (current) => {
      if (!current) {
        return current;
      }

      const exists = current.settings.some((item) => item.key === setting.key);
      const settings = exists
        ? current.settings.map((item) =>
            item.key === setting.key ? setting : item,
          )
        : [...current.settings, setting];

      return { ...current, settings };
    },
  );
}

function updateStatusScopedItems<TItem extends { id: string; status: string }>({
  item,
  items,
  statusFilter,
}: {
  item: TItem;
  items: TItem[];
  statusFilter?: string;
}) {
  const hasItem = items.some((current) => current.id === item.id);

  if (!hasItem) {
    return items;
  }

  if (statusFilter && statusFilter !== "all" && statusFilter !== item.status) {
    return items.filter((current) => current.id !== item.id);
  }

  return items.map((current) => (current.id === item.id ? item : current));
}
