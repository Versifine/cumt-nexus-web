"use client";

import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { authQueryKeys } from "@/features/auth/query-keys";
import { profileQueryKeys } from "@/features/profile/queries";

import {
  getMyProgression,
  listMyPointTransactions,
  listMyTitles,
  listMyXPEvents,
  setActiveTitle,
} from "./api";
import type { SetActiveTitleInput } from "./types";

type ListInput = {
  limit?: number;
  offset?: number;
};

export const progressionQueryKeys = {
  all: ["progression"] as const,
  me: () => [...progressionQueryKeys.all, "me"] as const,
  xpEventsAll: () => [...progressionQueryKeys.all, "xp-events"] as const,
  xpEvents: (input: ListInput) =>
    [...progressionQueryKeys.xpEventsAll(), input.limit ?? 20, input.offset ?? 0] as const,
  titles: (input: ListInput) =>
    [...progressionQueryKeys.all, "titles", input.limit ?? 20, input.offset ?? 0] as const,
  pointTransactionsAll: () =>
    [...progressionQueryKeys.all, "point-transactions"] as const,
  pointTransactions: (input: ListInput) =>
    [
      ...progressionQueryKeys.pointTransactionsAll(),
      input.limit ?? 20,
      input.offset ?? 0,
    ] as const,
};

export function refreshCurrentUserGrowthLedgers(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: authQueryKeys.points() }),
    queryClient.invalidateQueries({ queryKey: progressionQueryKeys.me() }),
    queryClient.invalidateQueries({
      queryKey: progressionQueryKeys.xpEventsAll(),
    }),
    queryClient.invalidateQueries({
      queryKey: progressionQueryKeys.pointTransactionsAll(),
    }),
  ]);
}

export function useMyProgressionQuery(enabled = true) {
  return useQuery({
    queryKey: progressionQueryKeys.me(),
    queryFn: getMyProgression,
    enabled,
    staleTime: 60_000,
  });
}

export function useMyXPEventsQuery(input: ListInput = {}, enabled = true) {
  return useQuery({
    queryKey: progressionQueryKeys.xpEvents(input),
    queryFn: () => listMyXPEvents(input),
    enabled,
    staleTime: 30_000,
  });
}

export function useMyTitlesQuery(input: ListInput = {}, enabled = true) {
  return useQuery({
    queryKey: progressionQueryKeys.titles(input),
    queryFn: () => listMyTitles(input),
    enabled,
    staleTime: 30_000,
  });
}

export function useMyPointTransactionsQuery(
  input: ListInput = {},
  enabled = true,
) {
  return useQuery({
    queryKey: progressionQueryKeys.pointTransactions(input),
    queryFn: () => listMyPointTransactions(input),
    enabled,
    staleTime: 30_000,
  });
}

export function useSetActiveTitleMutation(username?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SetActiveTitleInput) => setActiveTitle(input),
    onSuccess: (result) => {
      queryClient.setQueryData(progressionQueryKeys.me(), result);
      void queryClient.invalidateQueries({
        queryKey: progressionQueryKeys.titles({}),
      });
      if (username) {
        void queryClient.invalidateQueries({
          queryKey: profileQueryKeys.detail(username),
        });
      }
      void queryClient.invalidateQueries({
        queryKey: authQueryKeys.me(),
      });
    },
  });
}
