import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  acceptCommunityOwnerTransfer,
  appointCommunityModerator,
  approveCommunityApplication,
  cancelCommunityOwnerTransfer,
  createCommunityRule,
  createCommunityModerationTemplate,
  createCommunityModeratorNote,
  createCommunityOwnerTransfer,
  deleteCommunityFollow,
  deleteCommunityModerationTemplate,
  deleteCommunityModeratorNote,
  deleteCommunityRule,
  deleteCommunityUserState,
  followCommunity,
  getCommunity,
  getCommunityApplication,
  getCommunityManageContext,
  getCommunityManageSettings,
  getCommunityModerationUserProfile,
  getCommunityOwnerTransfer,
  getCommunityOwnerTransferById,
  listCommunityModLogs,
  listCommunityModeratorNotes,
  listFollowedCommunities,
  listCommunityMembers,
  listCommunityManageComments,
  listCommunityManagePosts,
  listCommunityManageReports,
  listCommunityModerationTemplates,
  listCommunityRules,
  listCommunityUserStates,
  listCommunityApplications,
  listCommunities,
  listIncomingCommunityOwnerTransfers,
  rejectCommunityApplication,
  removeCommunityModerator,
  updateCommunityModerationTemplate,
  updateCommunityManageSettings,
  updateCommunityRule,
  upsertCommunityUserState,
} from "./api";
import { postQueryKeys } from "@/features/post/queries";
import type {
  AcceptCommunityOwnerTransferInput,
  AppointCommunityModeratorInput,
  CancelCommunityOwnerTransferInput,
  CreateCommunityModerationTemplateInput,
  CreateCommunityModeratorNoteInput,
  CreateCommunityRuleInput,
  CreateCommunityOwnerTransferInput,
  CommunityApplicationStatus,
  DeleteCommunityModerationTemplateInput,
  DeleteCommunityModeratorNoteInput,
  DeleteCommunityRuleInput,
  DeleteCommunityUserStateInput,
  GetCommunityModerationUserProfileInput,
  GetCommunityResponse,
  GetCommunityOwnerTransferByIdInput,
  GetCommunityOwnerTransferInput,
  ListCommunityModLogsInput,
  ListFollowedCommunitiesInput,
  ListCommunityMembersInput,
  ListCommunityManageCommentsInput,
  ListCommunityManagePostsInput,
  ListCommunityManageReportsInput,
  ListCommunityModerationTemplatesInput,
  ListCommunityModeratorNotesInput,
  ListCommunityUserStatesInput,
  ListCommunityApplicationsInput,
  ListIncomingCommunityOwnerTransfersInput,
  RejectCommunityApplicationInput,
  RemoveCommunityModeratorInput,
  UpdateCommunityModerationTemplateInput,
  UpdateCommunityManageSettingsInput,
  UpdateCommunityRuleInput,
  UpsertCommunityUserStateInput,
} from "./types";

type CommunityQueryScope = "public" | "viewer";

export const communityQueryKeys = {
  all: ["communities"] as const,
  followed: (input: ListFollowedCommunitiesInput) =>
    ["me", "followed-communities", input.limit ?? 5, input.offset ?? 0] as const,
  incomingOwnerTransfers: (
    input: ListIncomingCommunityOwnerTransfersInput = {},
  ) =>
    [
      "me",
      "community-owner-transfers",
      input.status ?? "pending",
      input.limit ?? 5,
      input.offset ?? 0,
    ] as const,
  incomingOwnerTransfersAll: () =>
    ["me", "community-owner-transfers"] as const,
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
  ownerTransfer: (input: GetCommunityOwnerTransferInput) =>
    ["community", input.slug, "manage", "owner-transfer"] as const,
  ownerTransferById: (input: GetCommunityOwnerTransferByIdInput) =>
    ["community", input.slug, "owner-transfer", input.transfer_id] as const,
  manageRules: (slug: string) => ["community", slug, "manage", "rules"] as const,
  moderationTemplates: (input: ListCommunityModerationTemplatesInput) =>
    [
      "community",
      input.slug,
      "moderation",
      input.kind,
    ] as const,
  userStates: (input: ListCommunityUserStatesInput) =>
    [
      "community",
      input.slug,
      "manage",
      "user-states",
      input.kind,
      input.limit ?? 20,
      input.offset ?? 0,
    ] as const,
  userStatesAll: (slug: string) => ["community", slug, "manage", "user-states"] as const,
  modLogs: (input: ListCommunityModLogsInput) =>
    [
      "community",
      input.slug,
      "moderation",
      "logs",
      input.action ?? "",
      input.actor_id ?? "",
      input.target_type ?? "",
      input.target_id ?? "",
      input.limit ?? 20,
      input.offset ?? 0,
    ] as const,
  modLogsAll: (slug: string) => ["community", slug, "moderation", "logs"] as const,
  moderationUserProfile: (input: GetCommunityModerationUserProfileInput) =>
    [
      "community",
      input.slug,
      "moderation",
      "users",
      input.user_id,
      "profile",
    ] as const,
  moderatorNotes: (input: ListCommunityModeratorNotesInput) =>
    [
      "community",
      input.slug,
      "moderation",
      "users",
      input.user_id,
      "notes",
      input.limit ?? 20,
      input.offset ?? 0,
    ] as const,
  moderatorNotesAll: (slug: string, userId: string) =>
    ["community", slug, "moderation", "users", userId, "notes"] as const,
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

export function useIncomingCommunityOwnerTransfersQuery(
  input: ListIncomingCommunityOwnerTransfersInput = {},
  enabled = true,
) {
  return useQuery({
    queryKey: communityQueryKeys.incomingOwnerTransfers(input),
    queryFn: () => listIncomingCommunityOwnerTransfers(input),
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

export function useToggleCommunityFollowMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      isFollowing,
      slug,
    }: {
      isFollowing: boolean;
      slug: string;
    }) => {
      if (isFollowing) {
        await deleteCommunityFollow(slug);
        return;
      }

      await followCommunity(slug);
    },
    onSuccess: async (_result, { slug }) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.all,
        }),
        queryClient.invalidateQueries({
          queryKey: ["me", "followed-communities"],
        }),
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.detail(slug, "viewer"),
        }),
        queryClient.invalidateQueries({
          queryKey: postQueryKeys.latestPrefix(),
        }),
        queryClient.invalidateQueries({
          queryKey: postQueryKeys.communityPostsPrefix(slug),
        }),
      ]);
    },
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

export function useAppointCommunityModeratorMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AppointCommunityModeratorInput) =>
      appointCommunityModerator(input),
    onSuccess: (result) => {
      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.manageMembers({
            slug: result.community.slug,
          }),
        }),
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.manageContext(result.community.slug),
        }),
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.detail(result.community.slug),
        }),
      ]);
    },
  });
}

export function useRemoveCommunityModeratorMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RemoveCommunityModeratorInput) =>
      removeCommunityModerator(input),
    onSuccess: (result, variables) => {
      const slug = result.community.slug || variables.slug;
      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.manageMembers({ slug }),
        }),
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.manageContext(slug),
        }),
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.detail(slug),
        }),
      ]);
    },
  });
}

export function useCreateCommunityOwnerTransferMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCommunityOwnerTransferInput) =>
      createCommunityOwnerTransfer(input),
    onSuccess: (result, variables) => {
      const slug = result.community.slug || variables.slug;

      queryClient.setQueryData(communityQueryKeys.ownerTransfer({ slug }), {
        community: result.community,
        transfer: result.transfer,
      });
      queryClient.setQueryData(
        communityQueryKeys.ownerTransferById({
          slug,
          transfer_id: result.transfer.id,
        }),
        {
          community: result.community,
          transfer: result.transfer,
        },
      );
      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.incomingOwnerTransfersAll(),
        }),
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.manageContext(slug),
        }),
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.manageMembers({ slug }),
        }),
      ]);
    },
  });
}

export function useCommunityOwnerTransferQuery(
  input: GetCommunityOwnerTransferInput,
  enabled = true,
) {
  return useQuery({
    queryKey: communityQueryKeys.ownerTransfer(input),
    queryFn: () => getCommunityOwnerTransfer(input),
    enabled: enabled && Boolean(input.slug.trim()),
  });
}

export function useCommunityOwnerTransferByIdQuery(
  input: GetCommunityOwnerTransferByIdInput,
  enabled = true,
) {
  return useQuery({
    queryKey: communityQueryKeys.ownerTransferById(input),
    queryFn: () => getCommunityOwnerTransferById(input),
    enabled: enabled && Boolean(input.slug.trim() && input.transfer_id.trim()),
  });
}

export function useAcceptCommunityOwnerTransferMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AcceptCommunityOwnerTransferInput) =>
      acceptCommunityOwnerTransfer(input),
    onSuccess: (result, variables) => {
      const slug = result.community.slug || variables.slug;

      queryClient.setQueryData(
        communityQueryKeys.ownerTransferById({
          slug,
          transfer_id: result.transfer.id,
        }),
        {
          community: result.community,
          transfer: result.transfer,
        },
      );
      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.ownerTransfer({ slug }),
        }),
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.incomingOwnerTransfersAll(),
        }),
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.manageContext(slug),
        }),
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.detail(slug),
        }),
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.manageMembers({ slug }),
        }),
      ]);
    },
  });
}

export function useCancelCommunityOwnerTransferMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CancelCommunityOwnerTransferInput) =>
      cancelCommunityOwnerTransfer(input),
    onSuccess: (result, variables) => {
      const slug = result.community.slug || variables.slug;

      queryClient.setQueryData(communityQueryKeys.ownerTransfer({ slug }), {
        community: result.community,
        transfer: null,
      });
      queryClient.setQueryData(
        communityQueryKeys.ownerTransferById({
          slug,
          transfer_id: result.transfer.id,
        }),
        {
          community: result.community,
          transfer: result.transfer,
        },
      );
      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.incomingOwnerTransfersAll(),
        }),
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.manageContext(slug),
        }),
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.manageMembers({ slug }),
        }),
      ]);
    },
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

export function useCommunityModerationTemplatesQuery(
  input: ListCommunityModerationTemplatesInput,
  enabled = true,
) {
  return useQuery({
    queryKey: communityQueryKeys.moderationTemplates(input),
    queryFn: () => listCommunityModerationTemplates(input),
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
      void queryClient.invalidateQueries({
        queryKey: communityQueryKeys.all,
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

export function useCreateCommunityModerationTemplateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCommunityModerationTemplateInput) =>
      createCommunityModerationTemplate(input),
    onSuccess: (_result, variables) => {
      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.moderationTemplates(variables),
        }),
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.modLogsAll(variables.slug),
        }),
      ]);
    },
  });
}

export function useUpdateCommunityModerationTemplateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateCommunityModerationTemplateInput) =>
      updateCommunityModerationTemplate(input),
    onSuccess: (_result, variables) => {
      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.moderationTemplates(variables),
        }),
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.modLogsAll(variables.slug),
        }),
      ]);
    },
  });
}

export function useDeleteCommunityModerationTemplateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DeleteCommunityModerationTemplateInput) =>
      deleteCommunityModerationTemplate(input),
    onSuccess: (_result, variables) => {
      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.moderationTemplates(variables),
        }),
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.modLogsAll(variables.slug),
        }),
      ]);
    },
  });
}

export function useCommunityUserStatesQuery(
  input: ListCommunityUserStatesInput,
  enabled = true,
) {
  return useQuery({
    queryKey: communityQueryKeys.userStates(input),
    queryFn: () => listCommunityUserStates(input),
    enabled,
  });
}

export function useUpsertCommunityUserStateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpsertCommunityUserStateInput) =>
      upsertCommunityUserState(input),
    onSuccess: (_result, variables) => {
      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.userStatesAll(variables.slug),
        }),
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.modLogsAll(variables.slug),
        }),
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.manageMembers({ slug: variables.slug }),
        }),
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.detail(variables.slug),
        }),
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.moderationUserProfile({
            slug: variables.slug,
            user_id: variables.user_id,
          }),
        }),
      ]);
    },
  });
}

export function useDeleteCommunityUserStateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DeleteCommunityUserStateInput) =>
      deleteCommunityUserState(input),
    onSuccess: (_result, variables) => {
      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.userStatesAll(variables.slug),
        }),
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.modLogsAll(variables.slug),
        }),
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.manageMembers({ slug: variables.slug }),
        }),
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.detail(variables.slug),
        }),
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.moderationUserProfile({
            slug: variables.slug,
            user_id: variables.user_id,
          }),
        }),
      ]);
    },
  });
}

export function useCommunityModLogsQuery(
  input: ListCommunityModLogsInput,
  enabled = true,
) {
  return useQuery({
    queryKey: communityQueryKeys.modLogs(input),
    queryFn: () => listCommunityModLogs(input),
    enabled,
  });
}

export function useCommunityModerationUserProfileQuery(
  input: GetCommunityModerationUserProfileInput,
  enabled = true,
) {
  return useQuery({
    queryKey: communityQueryKeys.moderationUserProfile(input),
    queryFn: () => getCommunityModerationUserProfile(input),
    enabled:
      enabled && Boolean(input.slug.trim()) && Boolean(input.user_id.trim()),
  });
}

export function useCommunityModeratorNotesQuery(
  input: ListCommunityModeratorNotesInput,
  enabled = true,
) {
  return useQuery({
    queryKey: communityQueryKeys.moderatorNotes(input),
    queryFn: () => listCommunityModeratorNotes(input),
    enabled:
      enabled && Boolean(input.slug.trim()) && Boolean(input.user_id.trim()),
  });
}

export function useCreateCommunityModeratorNoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCommunityModeratorNoteInput) =>
      createCommunityModeratorNote(input),
    onSuccess: (_result, variables) => {
      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.moderatorNotesAll(
            variables.slug,
            variables.user_id,
          ),
        }),
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.moderationUserProfile({
            slug: variables.slug,
            user_id: variables.user_id,
          }),
        }),
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.modLogsAll(variables.slug),
        }),
      ]);
    },
  });
}

export function useDeleteCommunityModeratorNoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DeleteCommunityModeratorNoteInput) =>
      deleteCommunityModeratorNote(input),
    onSuccess: (_result, variables) => {
      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.moderatorNotesAll(
            variables.slug,
            variables.user_id,
          ),
        }),
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.moderationUserProfile({
            slug: variables.slug,
            user_id: variables.user_id,
          }),
        }),
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.modLogsAll(variables.slug),
        }),
      ]);
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
