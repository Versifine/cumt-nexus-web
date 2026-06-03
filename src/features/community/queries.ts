import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  approveCommunityApplication,
  getCommunity,
  getCommunityApplication,
  listCommunityApplications,
  listCommunities,
  rejectCommunityApplication,
} from "./api";
import type {
  CommunityApplicationStatus,
  ListCommunityApplicationsInput,
  RejectCommunityApplicationInput,
} from "./types";

export const communityQueryKeys = {
  all: ["communities"] as const,
  detail: (slug: string) => ["community", slug] as const,
  applications: (input: ListCommunityApplicationsInput) =>
    [
      "community-applications",
      input.status,
      input.limit ?? 20,
      input.offset ?? 0,
    ] as const,
  applicationDetail: (id: string) => ["community-application", id] as const,
};

export function useCommunitiesQuery() {
  return useQuery({
    queryKey: communityQueryKeys.all,
    queryFn: listCommunities,
  });
}

export function useCommunityQuery(slug: string, enabled = true) {
  return useQuery({
    queryKey: communityQueryKeys.detail(slug),
    queryFn: () => getCommunity(slug),
    enabled,
  });
}

export function useCommunityApplicationsQuery(
  input: ListCommunityApplicationsInput,
  enabled = true,
) {
  return useQuery({
    queryKey: communityQueryKeys.applications(input),
    queryFn: () => listCommunityApplications(input),
    enabled,
    staleTime: 30_000,
  });
}

export function useCommunityApplicationQuery(id: string | null, enabled = true) {
  return useQuery({
    queryKey: communityQueryKeys.applicationDetail(id ?? ""),
    queryFn: () => getCommunityApplication(id ?? ""),
    enabled: enabled && Boolean(id),
  });
}

export function useApproveCommunityApplicationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => approveCommunityApplication(id),
    onSuccess: (result) => {
      queryClient.setQueryData(
        communityQueryKeys.applicationDetail(result.application.id),
        { application: result.application },
      );
      invalidateApplicationLists(queryClient);
      void queryClient.invalidateQueries({
        queryKey: communityQueryKeys.all,
      });
      void queryClient.invalidateQueries({
        queryKey: communityQueryKeys.detail(result.community.slug),
      });
    },
  });
}

export function useRejectCommunityApplicationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: RejectCommunityApplicationInput;
    }) => rejectCommunityApplication(id, input),
    onSuccess: (result) => {
      queryClient.setQueryData(
        communityQueryKeys.applicationDetail(result.application.id),
        { application: result.application },
      );
      invalidateApplicationLists(queryClient);
    },
  });
}

function invalidateApplicationLists(queryClient: ReturnType<typeof useQueryClient>) {
  const statuses: CommunityApplicationStatus[] = [
    "pending",
    "approved",
    "rejected",
  ];

  statuses.forEach((status) => {
    void queryClient.invalidateQueries({
      queryKey: ["community-applications", status],
    });
  });
}
