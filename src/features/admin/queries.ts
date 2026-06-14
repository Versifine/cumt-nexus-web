"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { effectQueryKeys } from "@/features/effect/queries";
import { progressionQueryKeys } from "@/features/progression/queries";

import {
  adjustAdminUserPoints,
  createAdminTitle,
  grantAdminUserTitle,
  listAdminEffects,
  listAdminPointTransactions,
  listAdminTitles,
  listAdminUserTitleGrants,
  listAdminUsers,
  revokeAdminUserTitle,
  updateAdminEffect,
  updateAdminTitle,
} from "./api";
import type {
  AdjustAdminUserPointsInput,
  CreateAdminTitleInput,
  GrantAdminUserTitleInput,
  UpdateAdminTitleInput,
} from "./types";

type ListInput = {
  limit?: number;
  offset?: number;
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

export const adminQueryKeys = {
  all: ["admin"] as const,
  users: (input: ListInput) =>
    [...adminQueryKeys.all, "users", input.limit ?? 20, input.offset ?? 0] as const,
  effects: (input: AdminEffectsInput) =>
    [
      ...adminQueryKeys.all,
      "effects",
      input.active ?? "all",
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
};

export function useAdminUsersQuery(input: ListInput = {}, enabled = true) {
  return useQuery({
    queryKey: adminQueryKeys.users(input),
    queryFn: () => listAdminUsers(input),
    enabled,
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
  });
}

export function useUpdateAdminEffectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateAdminEffect(id, { is_active: isActive }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: effectQueryKeys.all });
    },
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
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.all });
      void queryClient.invalidateQueries({
        queryKey: progressionQueryKeys.pointTransactions({}),
      });
    },
  });
}

export function useAdminTitlesQuery(input: AdminTitlesInput = {}, enabled = true) {
  return useQuery({
    queryKey: adminQueryKeys.titles(input),
    queryFn: () => listAdminTitles(input),
    enabled,
  });
}

export function useCreateAdminTitleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateAdminTitleInput) => createAdminTitle(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.all });
    },
  });
}

export function useUpdateAdminTitleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAdminTitleInput }) =>
      updateAdminTitle(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: progressionQueryKeys.all });
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: progressionQueryKeys.all });
    },
  });
}

export function useRevokeAdminUserTitleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ grantId, userId }: { grantId: string; userId: string }) =>
      revokeAdminUserTitle(userId, grantId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: progressionQueryKeys.all });
    },
  });
}
