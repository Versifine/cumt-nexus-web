import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import {
  acceptCommunityOwnerTransfer,
  addModmailInternalNote,
  addModmailMessage,
  appointCommunityModerator,
  approveCommunityApplication,
  cancelCommunityOwnerTransfer,
  createCommunityFlair,
  createCommunityGuide,
  createCommunityRule,
  createCommunityModerationTemplate,
  createCommunityModeratorNote,
  createModmailConversation,
  createCommunityOwnerTransfer,
  createScheduledPost,
  deleteCommunityFlair,
  deleteCommunityFollow,
  deleteCommunityGuide,
  deleteCommunityModerationTemplate,
  deleteCommunityModeratorNote,
  deleteCommunityRule,
  deleteCommunityUserState,
  deleteScheduledPost,
  dryRunAutomod,
  followCommunity,
  getAutomodConfig,
  getCommunity,
  getCommunityApplication,
  getCommunityInsightsSummary,
  getCommunityManageContext,
  getCommunityManageSettings,
  getCommunityModerationInsights,
  getCommunityModerationUserProfile,
  getCommunityOwnerTransfer,
  getCommunityOwnerTransferById,
  getContentControls,
  getModmailConversation,
  listAutomodVersions,
  listCommunityFlairs,
  listCommunityGuides,
  listCommunityModLogs,
  listCommunityModeratorNotes,
  listCommunityTrainingQueue,
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
  listModmailConversations,
  listScheduledPosts,
  rejectCommunityApplication,
  reorderCommunityFlairs,
  removeCommunityModerator,
  updateAutomodConfig,
  updateCommunityFlair,
  updateCommunityGuide,
  updateCommunityModerationTemplate,
  updateCommunityManageSettings,
  updateCommunityRule,
  updateContentControls,
  updateModmailConversation,
  updateScheduledPost,
  upsertCommunityUserState,
} from "./api";
import { postQueryKeys } from "@/features/post/queries";
import type {
  AcceptCommunityOwnerTransferInput,
  AutomodDryRunInput,
  AppointCommunityModeratorInput,
  CancelCommunityOwnerTransferInput,
  CreateModmailConversationInput,
  DeleteCommunityFlairInput,
  DeleteCommunityGuideInput,
  CreateCommunityModerationTemplateInput,
  CreateCommunityModeratorNoteInput,
  CreateCommunityRuleInput,
  CreateCommunityOwnerTransferInput,
  DeleteScheduledPostInput,
  Community,
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
  ListFollowedCommunitiesResponse,
  ListFollowedCommunitiesInput,
  ListCommunityMembersInput,
  ListCommunityManageCommentsInput,
  ListCommunityManagePostsInput,
  ListCommunityManageReportsInput,
  ListAutomodVersionsInput,
  ListCommunityFlairsInput,
  ListCommunityGuidesInput,
  ListCommunityModerationTemplatesInput,
  ListCommunityModeratorNotesInput,
  ListCommunityTrainingQueueInput,
  ListCommunityUserStatesInput,
  ListCommunityApplicationsInput,
  ListModmailConversationsInput,
  ListScheduledPostsInput,
  ModmailMessageInput,
  ListIncomingCommunityOwnerTransfersInput,
  RejectCommunityApplicationInput,
  ReorderCommunityFlairsInput,
  RemoveCommunityModeratorInput,
  UpdateAutomodConfigInput,
  UpdateContentControlsInput,
  UpdateModmailConversationInput,
  UpdateCommunityModerationTemplateInput,
  UpdateCommunityManageSettingsInput,
  UpdateCommunityRuleInput,
  UpsertCommunityUserStateInput,
  WriteCommunityFlairInput,
  WriteCommunityGuideInput,
  WriteScheduledPostInput,
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
  automodConfig: (slug: string) =>
    ["community", slug, "moderation", "automod", "config"] as const,
  automodVersions: (input: ListAutomodVersionsInput) =>
    [
      "community",
      input.slug,
      "moderation",
      "automod",
      "versions",
      input.limit ?? 20,
      input.offset ?? 0,
    ] as const,
  contentControls: (slug: string) =>
    ["community", slug, "moderation", "content-controls"] as const,
  modmailConversations: (input: ListModmailConversationsInput) =>
    [
      "community",
      input.slug,
      "modmail",
      "conversations",
      input.folder ?? "inbox",
      input.limit ?? 20,
      input.offset ?? 0,
    ] as const,
  modmailConversationsAll: (slug: string) =>
    ["community", slug, "modmail", "conversations"] as const,
  modmailConversation: (slug: string, conversationId: string) =>
    ["community", slug, "modmail", "conversations", conversationId] as const,
  insightsSummary: (slug: string, range: string) =>
    ["community", slug, "insights", "summary", range] as const,
  insightsModeration: (slug: string, range: string) =>
    ["community", slug, "insights", "moderation", range] as const,
  trainingQueue: (input: ListCommunityTrainingQueueInput) =>
    [
      "community",
      input.slug,
      "insights",
      "training-queue",
      input.limit ?? 20,
      input.offset ?? 0,
    ] as const,
  flairs: (input: ListCommunityFlairsInput) =>
    ["community", input.slug, "moderation", "flairs", input.kind] as const,
  flairsAll: (slug: string) =>
    ["community", slug, "moderation", "flairs"] as const,
  scheduledPosts: (input: ListScheduledPostsInput) =>
    [
      "community",
      input.slug,
      "scheduled-posts",
      input.limit ?? 20,
      input.offset ?? 0,
    ] as const,
  scheduledPostsAll: (slug: string) =>
    ["community", slug, "scheduled-posts"] as const,
  guides: (input: ListCommunityGuidesInput) =>
    [
      "community",
      input.slug,
      "guides",
      input.limit ?? 20,
      input.offset ?? 0,
    ] as const,
  guidesAll: (slug: string) => ["community", slug, "guides"] as const,
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
      community: Community;
      isFollowing: boolean;
      slug: string;
    }) => {
      if (isFollowing) {
        await deleteCommunityFollow(slug);
        return;
      }

      await followCommunity(slug);
    },
    onSuccess: async (_result, { community, isFollowing, slug }) => {
      syncFollowedCommunityCaches(queryClient, community, isFollowing);

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

function syncFollowedCommunityCaches(
  queryClient: QueryClient,
  community: Community,
  wasFollowing: boolean,
) {
  queryClient.setQueriesData<ListFollowedCommunitiesResponse>(
    { queryKey: ["me", "followed-communities"] },
    (current) => {
      if (!current) {
        return current;
      }

      if (wasFollowing) {
        return {
          ...current,
          communities: current.communities.filter(
            (item) => item.slug !== community.slug,
          ),
          next_offset: Math.max(
            current.offset,
            current.next_offset -
              (current.communities.some((item) => item.slug === community.slug)
                ? 1
                : 0),
          ),
        };
      }

      if (current.communities.some((item) => item.slug === community.slug)) {
        return {
          ...current,
          communities: current.communities.map((item) =>
            item.slug === community.slug
              ? { ...community, viewer_is_following: true }
              : item,
          ),
        };
      }

      const limit = current.limit || 5;
      const nextCommunities = [
        { ...community, viewer_is_following: true },
        ...current.communities,
      ].slice(0, limit);

      return {
        ...current,
        communities: nextCommunities,
        has_more: current.has_more || current.communities.length + 1 > limit,
        next_offset: current.offset + nextCommunities.length,
      };
    },
  );
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

export function useAutomodConfigQuery(slug: string, enabled = true) {
  return useQuery({
    queryKey: communityQueryKeys.automodConfig(slug),
    queryFn: () => getAutomodConfig(slug),
    enabled: enabled && Boolean(slug.trim()),
  });
}

export function useUpdateAutomodConfigMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateAutomodConfigInput) => updateAutomodConfig(input),
    onSuccess: (_result, variables) => {
      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.automodConfig(variables.slug),
        }),
        queryClient.invalidateQueries({
          queryKey: ["community", variables.slug, "moderation", "automod"],
        }),
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.modLogsAll(variables.slug),
        }),
      ]);
    },
  });
}

export function useAutomodVersionsQuery(
  input: ListAutomodVersionsInput,
  enabled = true,
) {
  return useQuery({
    queryKey: communityQueryKeys.automodVersions(input),
    queryFn: () => listAutomodVersions(input),
    enabled: enabled && Boolean(input.slug.trim()),
  });
}

export function useAutomodDryRunMutation() {
  return useMutation({
    mutationFn: (input: AutomodDryRunInput) => dryRunAutomod(input),
  });
}

export function useContentControlsQuery(slug: string, enabled = true) {
  return useQuery({
    queryKey: communityQueryKeys.contentControls(slug),
    queryFn: () => getContentControls(slug),
    enabled: enabled && Boolean(slug.trim()),
  });
}

export function useUpdateContentControlsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateContentControlsInput) =>
      updateContentControls(input),
    onSuccess: (_result, variables) => {
      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.contentControls(variables.slug),
        }),
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.modLogsAll(variables.slug),
        }),
      ]);
    },
  });
}

export function useModmailConversationsQuery(
  input: ListModmailConversationsInput,
  enabled = true,
) {
  return useQuery({
    queryKey: communityQueryKeys.modmailConversations(input),
    queryFn: () => listModmailConversations(input),
    enabled: enabled && Boolean(input.slug.trim()),
  });
}

export function useModmailConversationQuery(
  slug: string,
  conversationId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: communityQueryKeys.modmailConversation(slug, conversationId),
    queryFn: () => getModmailConversation(slug, conversationId),
    enabled: enabled && Boolean(slug.trim()) && Boolean(conversationId.trim()),
  });
}

export function useCreateModmailConversationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateModmailConversationInput) =>
      createModmailConversation(input),
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({
        queryKey: communityQueryKeys.modmailConversationsAll(variables.slug),
      });
    },
  });
}

export function useAddModmailMessageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ModmailMessageInput) => addModmailMessage(input),
    onSuccess: (result, variables) => {
      queryClient.setQueryData(
        communityQueryKeys.modmailConversation(
          variables.slug,
          variables.conversation_id,
        ),
        result,
      );
      void queryClient.invalidateQueries({
        queryKey: communityQueryKeys.modmailConversationsAll(variables.slug),
      });
    },
  });
}

export function useAddModmailInternalNoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ModmailMessageInput) => addModmailInternalNote(input),
    onSuccess: (result, variables) => {
      queryClient.setQueryData(
        communityQueryKeys.modmailConversation(
          variables.slug,
          variables.conversation_id,
        ),
        result,
      );
      void queryClient.invalidateQueries({
        queryKey: communityQueryKeys.modmailConversationsAll(variables.slug),
      });
    },
  });
}

export function useUpdateModmailConversationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateModmailConversationInput) =>
      updateModmailConversation(input),
    onSuccess: (_result, variables) => {
      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.modmailConversation(
            variables.slug,
            variables.conversation_id,
          ),
        }),
        queryClient.invalidateQueries({
          queryKey: communityQueryKeys.modmailConversationsAll(variables.slug),
        }),
      ]);
    },
  });
}

export function useCommunityInsightsSummaryQuery(
  slug: string,
  range: string,
  enabled = true,
) {
  return useQuery({
    queryKey: communityQueryKeys.insightsSummary(slug, range),
    queryFn: () => getCommunityInsightsSummary(slug, range),
    enabled: enabled && Boolean(slug.trim()),
  });
}

export function useCommunityModerationInsightsQuery(
  slug: string,
  range: string,
  enabled = true,
) {
  return useQuery({
    queryKey: communityQueryKeys.insightsModeration(slug, range),
    queryFn: () => getCommunityModerationInsights(slug, range),
    enabled: enabled && Boolean(slug.trim()),
  });
}

export function useCommunityTrainingQueueQuery(
  input: ListCommunityTrainingQueueInput,
  enabled = true,
) {
  return useQuery({
    queryKey: communityQueryKeys.trainingQueue(input),
    queryFn: () => listCommunityTrainingQueue(input),
    enabled: enabled && Boolean(input.slug.trim()),
  });
}

export function useCommunityFlairsQuery(
  input: ListCommunityFlairsInput,
  enabled = true,
) {
  return useQuery({
    queryKey: communityQueryKeys.flairs(input),
    queryFn: () => listCommunityFlairs(input),
    enabled: enabled && Boolean(input.slug.trim()),
  });
}

export function useCreateCommunityFlairMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: WriteCommunityFlairInput) => createCommunityFlair(input),
    onSuccess: (_result, variables) => {
      invalidateCommunityFlairCaches(queryClient, variables.slug);
    },
  });
}

export function useUpdateCommunityFlairMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: WriteCommunityFlairInput & { flair_id: string }) =>
      updateCommunityFlair(input),
    onSuccess: (_result, variables) => {
      invalidateCommunityFlairCaches(queryClient, variables.slug);
    },
  });
}

export function useDeleteCommunityFlairMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DeleteCommunityFlairInput) => deleteCommunityFlair(input),
    onSuccess: (_result, variables) => {
      invalidateCommunityFlairCaches(queryClient, variables.slug);
    },
  });
}

export function useReorderCommunityFlairsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ReorderCommunityFlairsInput) =>
      reorderCommunityFlairs(input),
    onSuccess: (_result, variables) => {
      invalidateCommunityFlairCaches(queryClient, variables.slug);
    },
  });
}

export function useScheduledPostsQuery(
  input: ListScheduledPostsInput,
  enabled = true,
) {
  return useQuery({
    queryKey: communityQueryKeys.scheduledPosts(input),
    queryFn: () => listScheduledPosts(input),
    enabled: enabled && Boolean(input.slug.trim()),
  });
}

export function useCreateScheduledPostMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: WriteScheduledPostInput) => createScheduledPost(input),
    onSuccess: (_result, variables) => {
      invalidateScheduledPostCaches(queryClient, variables.slug);
    },
  });
}

export function useUpdateScheduledPostMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: WriteScheduledPostInput & { scheduled_post_id: string }) =>
      updateScheduledPost(input),
    onSuccess: (_result, variables) => {
      invalidateScheduledPostCaches(queryClient, variables.slug);
    },
  });
}

export function useDeleteScheduledPostMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DeleteScheduledPostInput) => deleteScheduledPost(input),
    onSuccess: (_result, variables) => {
      invalidateScheduledPostCaches(queryClient, variables.slug);
    },
  });
}

export function useCommunityGuidesQuery(
  input: ListCommunityGuidesInput,
  enabled = true,
) {
  return useQuery({
    queryKey: communityQueryKeys.guides(input),
    queryFn: () => listCommunityGuides(input),
    enabled: enabled && Boolean(input.slug.trim()),
  });
}

export function useCreateCommunityGuideMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: WriteCommunityGuideInput) => createCommunityGuide(input),
    onSuccess: (_result, variables) => {
      invalidateCommunityGuideCaches(queryClient, variables.slug);
    },
  });
}

export function useUpdateCommunityGuideMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: WriteCommunityGuideInput & { guide_id: string }) =>
      updateCommunityGuide(input),
    onSuccess: (_result, variables) => {
      invalidateCommunityGuideCaches(queryClient, variables.slug);
    },
  });
}

export function useDeleteCommunityGuideMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DeleteCommunityGuideInput) => deleteCommunityGuide(input),
    onSuccess: (_result, variables) => {
      invalidateCommunityGuideCaches(queryClient, variables.slug);
    },
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

function invalidateCommunityFlairCaches(queryClient: QueryClient, slug: string) {
  void Promise.all([
    queryClient.invalidateQueries({
      queryKey: communityQueryKeys.flairsAll(slug),
    }),
    queryClient.invalidateQueries({
      queryKey: communityQueryKeys.modLogsAll(slug),
    }),
  ]);
}

function invalidateScheduledPostCaches(queryClient: QueryClient, slug: string) {
  void Promise.all([
    queryClient.invalidateQueries({
      queryKey: communityQueryKeys.scheduledPostsAll(slug),
    }),
    queryClient.invalidateQueries({
      queryKey: communityQueryKeys.modLogsAll(slug),
    }),
  ]);
}

function invalidateCommunityGuideCaches(queryClient: QueryClient, slug: string) {
  void Promise.all([
    queryClient.invalidateQueries({
      queryKey: communityQueryKeys.guidesAll(slug),
    }),
    queryClient.invalidateQueries({
      queryKey: communityQueryKeys.modLogsAll(slug),
    }),
  ]);
}
