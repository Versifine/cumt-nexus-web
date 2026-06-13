import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  approveCommunityApplication,
  createCommunityRule,
  deleteCommunityRule,
  getCommunity,
  getCommunityApplication,
  getCommunityManageContext,
  getCommunityManageSettings,
  listFollowedCommunities,
  listCommunityMembers,
  listCommunityManageComments,
  listCommunityManagePosts,
  listCommunityManageReports,
  listCommunityRules,
  listCommunityApplications,
  listCommunities,
  rejectCommunityApplication,
  updateCommunityManageSettings,
  updateCommunityRule,
} from "./api";
import type {
  CreateCommunityRuleInput,
  CommunityApplicationStatus,
  DeleteCommunityRuleInput,
  GetCommunityResponse,
  ListFollowedCommunitiesInput,
  ListCommunityMembersInput,
  ListCommunityManageCommentsInput,
  ListCommunityManagePostsInput,
  ListCommunityManageReportsInput,
  ListCommunityApplicationsInput,
  RejectCommunityApplicationInput,
  UpdateCommunityManageSettingsInput,
  UpdateCommunityRuleInput,
} from "./types";

type CommunityQueryScope = "public" | "viewer";

export const communityQueryKeys = {
  all: ["communities"] as const,
  followed: (input: ListFollowedCommunitiesInput) =>
    ["me", "followed-communities", input.limit ?? 5, input.offset ?? 0] as const,
  detail: (slug: string, scope: CommunityQueryScope = "viewer") =>
    ["community", slug, scope] as const,
  manageContext: (slug: string) => ["community", slug, "manage"] as const,
  manageMembers: (input: ListCommunityMembersInput) =>
    [
      "community",
      input.slug,
      "manage",
      "members",
      input.limit ?? 5,
      input.offset ?? 0,
    ] as const,
  manageSettings: (slug: string) => ["community", slug, "manage", "settings"] as const,
  manageRules: (slug: string) => ["community", slug, "manage", "rules"] as const,
  managePosts: (input: ListCommunityManagePostsInput) =>
    [
      "community",
      input.slug,
      "manage",
      "posts",
      input.status ?? "all",
      input.limit ?? 5,
      input.offset ?? 0,
    ] as const,
  manageComments: (input: ListCommunityManageCommentsInput) =>
    [
      "community",
      input.slug,
      "manage",
      "comments",
      input.status ?? "all",
      input.limit ?? 5,
      input.offset ?? 0,
    ] as const,
  manageReports: (input: ListCommunityManageReportsInput) =>
    [
      "community",
      input.slug,
      "manage",
      "reports",
      input.status ?? "pending",
      input.limit ?? 5,
      input.offset ?? 0,
    ] as const,
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

export function useFollowedCommunitiesQuery(
  input: ListFollowedCommunitiesInput = {},
  enabled = true,
) {
  return useQuery({
    queryKey: communityQueryKeys.followed(input),
    queryFn: () => listFollowedCommunities(input),
    enabled,
    staleTime: 30_000,
  });
}

export function useCommunityQuery(
  slug: string,
  enabled = true,
  initialData?: GetCommunityResponse,
  scope: CommunityQueryScope = "viewer",
) {
  return useQuery({
    queryKey: communityQueryKeys.detail(slug, scope),
    queryFn: () =>
      getCommunity(slug, {
        token: scope === "public" ? null : undefined,
      }),
    enabled,
    initialData,
  });
}

export function useCommunityManageContextQuery(slug: string, enabled = true) {
  return useQuery({
    queryKey: communityQueryKeys.manageContext(slug),
    queryFn: () => getCommunityManageContext(slug),
    enabled,
  });
}

export function useCommunityMembersQuery(
  input: ListCommunityMembersInput,
  enabled = true,
) {
  return useQuery({
    queryKey: communityQueryKeys.manageMembers(input),
    queryFn: () => listCommunityMembers(input),
    enabled,
  });
}

export function useCommunityManageSettingsQuery(slug: string, enabled = true) {
  return useQuery({
    queryKey: communityQueryKeys.manageSettings(slug),
    queryFn: () => getCommunityManageSettings(slug),
    enabled,
  });
}

export function useCommunityRulesQuery(slug: string, enabled = true) {
  return useQuery({
    queryKey: communityQueryKeys.manageRules(slug),
    queryFn: () => listCommunityRules(slug),
    enabled,
  });
}

export function useUpdateCommunityManageSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateCommunityManageSettingsInput) =>
      updateCommunityManageSettings(input),
    onSuccess: (result) => {
      queryClient.setQueryData(communityQueryKeys.manageSettings(result.community.slug), {
        community: result.community,
        settings: result.settings,
      });
      queryClient.setQueryData(communityQueryKeys.detail(result.community.slug), {
        community: result.community,
      });
      queryClient.setQueryData(communityQueryKeys.manageContext(result.community.slug), {
        community: result.community,
      });
    },
  });
}

export function useCreateCommunityRuleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCommunityRuleInput) => createCommunityRule(input),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({
        queryKey: communityQueryKeys.manageRules(result.community.slug),
      });
      void queryClient.invalidateQueries({
        queryKey: communityQueryKeys.manageContext(result.community.slug),
      });
    },
  });
}

export function useUpdateCommunityRuleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateCommunityRuleInput) => updateCommunityRule(input),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({
        queryKey: communityQueryKeys.manageRules(result.community.slug),
      });
    },
  });
}

export function useDeleteCommunityRuleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DeleteCommunityRuleInput) => deleteCommunityRule(input),
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({
        queryKey: communityQueryKeys.manageRules(variables.slug),
      });
    },
  });
}

export function useCommunityManagePostsQuery(
  input: ListCommunityManagePostsInput,
  enabled = true,
) {
  return useQuery({
    queryKey: communityQueryKeys.managePosts(input),
    queryFn: () => listCommunityManagePosts(input),
    enabled,
  });
}

export function useCommunityManageCommentsQuery(
  input: ListCommunityManageCommentsInput,
  enabled = true,
) {
  return useQuery({
    queryKey: communityQueryKeys.manageComments(input),
    queryFn: () => listCommunityManageComments(input),
    enabled,
  });
}

export function useCommunityManageReportsQuery(
  input: ListCommunityManageReportsInput,
  enabled = true,
) {
  return useQuery({
    queryKey: communityQueryKeys.manageReports(input),
    queryFn: () => listCommunityManageReports(input),
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
