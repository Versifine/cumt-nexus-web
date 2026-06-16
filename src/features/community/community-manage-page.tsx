"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  BarChart3,
  Bot,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  FileClock,
  Hash,
  Inbox,
  LayoutDashboard,
  ListChecks,
  MessageSquareWarning,
  RefreshCw,
  Search,
  Settings2,
  ShieldAlert,
  Users,
  Wand2,
  X,
} from "lucide-react";
import { useForm, useWatch, type UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  IndexedInfoRow,
  StatusToken,
  type StatusTokenTone,
} from "@/components/ui/data-display";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { TextAction } from "@/components/ui/text-action";
import { Textarea } from "@/components/ui/textarea";
import {
  useAdminUsersQuery,
  useUpdateAdminCommunityOwnerMutation,
} from "@/features/admin/queries";
import type { AdminUser } from "@/features/admin/types";
import { useAuthSession } from "@/features/auth/auth-session";
import { resolvePlatformRole, type PlatformRole } from "@/features/auth/platform-role";
import { useCurrentUserQuery } from "@/features/auth/queries";
import { ManagedMediaEditor } from "@/features/media/media-editor";
import {
  useCommunityModQueueQuery,
} from "@/features/moderation/queries";
import {
  ModerationBulkActions,
  type ModerationBulkTarget,
} from "@/features/moderation/moderation-bulk-actions";
import { ModerationQuickActions } from "@/features/moderation/moderation-quick-actions";
import type { ModQueueItem } from "@/features/moderation/types";
import { ApiError } from "@/lib/api/client";

import {
  canAccessCommunityManagement,
  canEditCommunityConfiguration,
  canModerateCommunityContent,
} from "./permissions";
import {
  useAppointCommunityModeratorMutation,
  useCommunityModLogsQuery,
  useCommunityModerationTemplatesQuery,
  useCommunityModerationUserProfileQuery,
  useCommunityModeratorNotesQuery,
  useCommunityOwnerTransferQuery,
  useCommunityUserStatesQuery,
  useCreateCommunityModeratorNoteMutation,
  useCreateCommunityModerationTemplateMutation,
  useCreateCommunityRuleMutation,
  useCreateCommunityOwnerTransferMutation,
  useCancelCommunityOwnerTransferMutation,
  useDeleteCommunityModerationTemplateMutation,
  useDeleteCommunityModeratorNoteMutation,
  useDeleteCommunityUserStateMutation,
  useDeleteCommunityRuleMutation,
  useRemoveCommunityModeratorMutation,
  useUpdateCommunityModerationTemplateMutation,
  useUpdateCommunityManageSettingsMutation,
  useUpdateCommunityRuleMutation,
  useUpsertCommunityUserStateMutation,
  useCommunityManageSettingsQuery,
  useCommunityManageCommentsQuery,
  useCommunityManageContextQuery,
  useCommunityManagePostsQuery,
  useCommunityManageReportsQuery,
  useCommunityMembersQuery,
  useCommunityQuery,
  useCommunityRulesQuery,
} from "./queries";
import type {
  Community,
  CommunityModLog,
  CommunityMember,
  CommunityManageSettings,
  CommunityManageComment,
  CommunityManagePost,
  CommunityManageReport,
  CommunityModerationTemplate,
  CommunityRule,
  CommunityUserState,
  CommunityUserStateKind,
  ModeratorNote,
  ModerationUserProfile,
} from "./types";

const settingsSchema = z.object({
  name: z.string().trim().min(1, "请输入社区名称。"),
  description: z.string().trim(),
});

const ruleSchema = z.object({
  title: z.string().trim().min(1, "请输入规则标题。"),
  body: z.string().trim(),
  position: z
    .number({ error: "请输入规则顺序。" })
    .int("规则顺序必须是整数。")
    .min(0, "规则顺序不能小于 0。"),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;
type RuleFormValues = z.infer<typeof ruleSchema>;

type CommunityManagePageProps = {
  slug: string;
  tool?: CommunityManageTool;
};

export const communityManageToolValues = [
  "overview",
  "queues",
  "content",
  "users",
  "rules",
  "settings",
  "automations",
  "modmail",
  "log",
  "insights",
] as const;

export type CommunityManageTool = (typeof communityManageToolValues)[number];

type CommunityQueueKind =
  | "reports"
  | "posts"
  | "comments"
  | "spam"
  | "removed"
  | "edited"
  | "unmoderated"
  | "needs_review";

const MANAGE_PAGE_SIZE = 20;

const communityToolGroups: Array<{
  label: string;
  items: Array<{
    description: string;
    icon: typeof LayoutDashboard;
    label: string;
    value: CommunityManageTool;
  }>;
}> = [
  {
    label: "工作台",
    items: [
      {
        description: "社区状态、待处理内容和真实可用入口。",
        icon: LayoutDashboard,
        label: "管理概览",
        value: "overview",
      },
      {
        description: "待审核、举报、垃圾、已移除等队列。",
        icon: ListChecks,
        label: "队列",
        value: "queues",
      },
    ],
  },
  {
    label: "治理",
    items: [
      {
        description: "帖子、评论和内容处理。",
        icon: MessageSquareWarning,
        label: "内容",
        value: "content",
      },
      {
        description: "版主、社区管理员、成员、封禁、禁言和批准用户。",
        icon: Users,
        label: "用户",
        value: "users",
      },
      {
        description: "社区规则、移除原因和保存回复。",
        icon: ShieldAlert,
        label: "规则与原因",
        value: "rules",
      },
    ],
  },
  {
    label: "工具",
    items: [
      {
        description: "资料、内容控制、安全过滤、flair 和定时帖。",
        icon: Settings2,
        label: "设置",
        value: "settings",
      },
      {
        description: "Automod、关键词和自动化规则。",
        icon: Bot,
        label: "自动化",
        value: "automations",
      },
      {
        description: "队列外沟通、内部 note 和归档。",
        icon: Inbox,
        label: "Modmail",
        value: "modmail",
      },
      {
        description: "社区级操作日志和资源回看。",
        icon: FileClock,
        label: "Mod Log",
        value: "log",
      },
      {
        description: "社区摘要、趋势和训练队列。",
        icon: BarChart3,
        label: "数据摘要",
        value: "insights",
      },
    ],
  },
];

const communityQueueTabs: Array<{
  description: string;
  label: string;
  value: CommunityQueueKind;
}> = [
  { description: "用户举报和目标预览。", label: "举报", value: "reports" },
  { description: "管理视角帖子列表。", label: "待审核", value: "posts" },
  { description: "管理视角评论列表。", label: "评论", value: "comments" },
  { description: "后端 spam 队列。", label: "垃圾", value: "spam" },
  { description: "后端 removed 队列。", label: "已移除", value: "removed" },
  { description: "后端 edited 队列。", label: "已编辑", value: "edited" },
  {
    description: "后端 unmoderated 队列。",
    label: "未审核",
    value: "unmoderated",
  },
  {
    description: "后端 needs_review 队列。",
    label: "需要关注",
    value: "needs_review",
  },
];

const COMMUNITY_MANAGE_REQUIRED_DESCRIPTION =
  "当前账号不是这个社区的版主或社区管理员，不能查看社区管理。";

export function CommunityManagePage({
  slug,
  tool = "overview",
}: CommunityManagePageProps) {
  const activeTool = tool;
  const [activeQueue, setActiveQueue] = useState<CommunityQueueKind>("reports");
  const [postsOffset, setPostsOffset] = useState(0);
  const [commentsOffset, setCommentsOffset] = useState(0);
  const reportsOffset = 0;
  const [membersOffset, setMembersOffset] = useState(0);
  const [modQueueOffset, setModQueueOffset] = useState(0);
  const [modLogOffset, setModLogOffset] = useState(0);
  const [userStateOffsets, setUserStateOffsets] = useState<
    Record<CommunityUserStateKind, number>
  >({
    approved: 0,
    banned: 0,
    muted: 0,
  });
  const [modLogFilters, setModLogFilters] = useState<ModLogFilters>({
    action: "",
    actorId: "",
    targetId: "",
    targetType: "",
  });
  const { isReady, token } = useAuthSession();
  const currentUserQuery = useCurrentUserQuery();
  const isAuthenticated = Boolean(token);
  const loginHref = `/login?next=${encodeURIComponent(
    getCommunityManageToolHref(slug, activeTool),
  )}`;
  const communityQuery = useCommunityQuery(slug, isReady);
  const viewerCommunity = communityQuery.data?.community;
  const platformRole = resolvePlatformRole(currentUserQuery.data);
  const platformRoleIsInferred =
    currentUserQuery.data?.is_platform_staff === true &&
    !currentUserQuery.data?.platform_role;
  const canManageCommunity = canAccessCommunityManagement(
    viewerCommunity,
    platformRole,
  );
  const shouldShowForbidden =
    isReady &&
    isAuthenticated &&
    communityQuery.isSuccess &&
    Boolean(viewerCommunity) &&
    !canManageCommunity;
  const canLoadManage =
    isReady && isAuthenticated && communityQuery.isSuccess && canManageCommunity;
  const manageQuery = useCommunityManageContextQuery(slug, canLoadManage);
  const canLoadLists = canLoadManage && manageQuery.isSuccess;
  const postsQuery = useCommunityManagePostsQuery(
    { limit: MANAGE_PAGE_SIZE, offset: postsOffset, slug, status: "all" },
    canLoadLists,
  );
  const commentsQuery = useCommunityManageCommentsQuery(
    { limit: MANAGE_PAGE_SIZE, offset: commentsOffset, slug, status: "all" },
    canLoadLists,
  );
  const reportsQuery = useCommunityManageReportsQuery(
    { limit: MANAGE_PAGE_SIZE, offset: reportsOffset, slug, status: "pending" },
    canLoadLists,
  );
  const membersQuery = useCommunityMembersQuery(
    { limit: MANAGE_PAGE_SIZE, offset: membersOffset, slug },
    canLoadLists,
  );
  const settingsQuery = useCommunityManageSettingsQuery(slug, canLoadLists);
  const rulesQuery = useCommunityRulesQuery(slug, canLoadLists);
  const removalReasonsQuery = useCommunityModerationTemplatesQuery(
    { kind: "removal-reasons", slug },
    canLoadLists,
  );
  const savedResponsesQuery = useCommunityModerationTemplatesQuery(
    { kind: "saved-responses", slug },
    canLoadLists,
  );
  const bannedUsersQuery = useCommunityUserStatesQuery(
    {
      kind: "banned",
      limit: MANAGE_PAGE_SIZE,
      offset: userStateOffsets.banned,
      slug,
    },
    canLoadLists,
  );
  const mutedUsersQuery = useCommunityUserStatesQuery(
    {
      kind: "muted",
      limit: MANAGE_PAGE_SIZE,
      offset: userStateOffsets.muted,
      slug,
    },
    canLoadLists,
  );
  const approvedUsersQuery = useCommunityUserStatesQuery(
    {
      kind: "approved",
      limit: MANAGE_PAGE_SIZE,
      offset: userStateOffsets.approved,
      slug,
    },
    canLoadLists,
  );
  const modLogsQuery = useCommunityModLogsQuery(
    {
      action: modLogFilters.action,
      actor_id: modLogFilters.actorId,
      limit: MANAGE_PAGE_SIZE,
      offset: modLogOffset,
      slug,
      target_id: modLogFilters.targetId,
      target_type: modLogFilters.targetType,
    },
    canLoadLists,
  );
  const modQueueQuery = useCommunityModQueueQuery(
    {
      limit: MANAGE_PAGE_SIZE,
      offset: modQueueOffset,
      queue: activeQueue,
      slug,
    },
    canLoadLists && isModToolsQueue(activeQueue),
  );
  const community = manageQuery.data?.community ?? viewerCommunity;
  const showToolNav = Boolean(community && manageQuery.isSuccess);
  const managedPosts = postsQuery.data?.posts ?? [];
  const managedComments = commentsQuery.data?.comments ?? [];
  const managedReports = reportsQuery.data?.reports ?? [];
  const managedMembers = membersQuery.data?.members ?? [];
  const managedSettings = settingsQuery.data?.settings;
  const managedRules = rulesQuery.data?.rules ?? [];
  const removalReasons = removalReasonsQuery.data?.items ?? [];
  const savedResponses = savedResponsesQuery.data?.items ?? [];
  const bannedUsers = bannedUsersQuery.data?.users ?? [];
  const mutedUsers = mutedUsersQuery.data?.users ?? [];
  const approvedUsers = approvedUsersQuery.data?.users ?? [];
  const modLogs = modLogsQuery.data?.logs ?? [];
  const canEditSettings = canEditCommunityConfiguration(community, platformRole);
  const canEditRules = canModerateCommunityContent(community, platformRole);
  const hasPlatformOwnerOverride =
    community?.viewer_permissions?.platform_owner_override === true ||
    platformRole === "owner";
  const canManageModerators =
    community?.viewer_role === "owner" || hasPlatformOwnerOverride;
  const canCreateOwnerTransfer = community?.viewer_role === "owner";
  const canModerateContent = canModerateCommunityContent(community, platformRole);

  function changeQueue(queue: CommunityQueueKind) {
    setActiveQueue(queue);
    setModQueueOffset(0);
  }

  function changeUserStateOffset(kind: CommunityUserStateKind, offset: number) {
    setUserStateOffsets((current) => ({
      ...current,
      [kind]: offset,
    }));
  }

  return (
    <div className="min-w-0 py-3">
        <section className="bg-background">
          <ManageHeader
            canManageCommunity={canManageCommunity}
            community={community}
            hasPlatformOwnerOverride={hasPlatformOwnerOverride}
            platformRole={platformRole}
            platformRoleIsInferred={platformRoleIsInferred}
            slug={slug}
            tool={activeTool}
          />
        </section>

        {showToolNav ? (
          <CommunityToolsNav activeTool={activeTool} slug={slug} />
        ) : null}

        <section className="bg-background">
          <div className="border-b border-border py-3">
            <h2 className="text-sm font-semibold">
              {getCommunityToolMeta(activeTool).label}
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {getCommunityToolMeta(activeTool).description}
            </p>
          </div>

          {!isReady ? (
            <StatePanel>
              <LoadingState rows={4} />
            </StatePanel>
          ) : null}

          {isReady && !isAuthenticated ? (
            <StatePanel>
              <EmptyState
                title="登录后管理社区"
                description="社区管理需要版主或社区管理员权限。登录后会回到当前社区管理页。"
                action={
                  <TextAction href={loginHref} tone="primary">
                    登录
                  </TextAction>
                }
              />
            </StatePanel>
          ) : null}

          {isReady && isAuthenticated && communityQuery.isPending ? (
            <StatePanel>
              <LoadingState rows={4} />
            </StatePanel>
          ) : null}

          {isReady && isAuthenticated && communityQuery.isError ? (
            <StatePanel>
              <ErrorState
                title="无法加载社区"
                description="读取社区权限上下文失败，请稍后重试。"
                action={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-1 hover:bg-transparent hover:text-primary"
                    onClick={() => communityQuery.refetch()}
                  >
                    重试
                  </Button>
                }
              />
            </StatePanel>
          ) : null}

          {shouldShowForbidden ? (
            <StatePanel>
              <EmptyState
                title="需要社区权限"
                description={formatCommunityManageForbiddenDescription({
                  community,
                  platformRole,
                  platformRoleIsInferred,
                })}
                action={
                  <TextAction
                    href={`/communities/${encodeURIComponent(slug)}`}
                    tone="primary"
                  >
                    查看社区
                  </TextAction>
                }
              />
            </StatePanel>
          ) : null}

          {canLoadManage && manageQuery.isPending ? (
            <StatePanel>
              <LoadingState rows={4} />
            </StatePanel>
          ) : null}

          {canLoadManage && manageQuery.isError ? (
            <StatePanel>
              <ErrorState
                title={getManageErrorTitle(manageQuery.error)}
                description={getManageErrorDescription(manageQuery.error, {
                  community,
                  platformRole,
                  platformRoleIsInferred,
                })}
                action={
                  isUnauthenticated(manageQuery.error) ? (
                    <TextAction href={loginHref} tone="primary">
                      登录
                    </TextAction>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="px-1 hover:bg-transparent hover:text-primary"
                      onClick={() => manageQuery.refetch()}
                    >
                      重试
                    </Button>
                  )
                }
              />
            </StatePanel>
          ) : null}

          {community && manageQuery.isSuccess ? (
            <CommunityModToolsWorkspace
              activeQueue={activeQueue}
              activeTool={activeTool}
              canCreateOwnerTransfer={canCreateOwnerTransfer}
              canEditRules={canEditRules}
              canEditSettings={canEditSettings}
              canManageModerators={canManageModerators}
              canModerateContent={canModerateContent}
              approvedUsers={approvedUsers}
              approvedUsersQuery={{
                hasMore: approvedUsersQuery.data?.has_more ?? false,
                isError: approvedUsersQuery.isError,
                isFetching: approvedUsersQuery.isFetching,
                isLoading: approvedUsersQuery.isPending,
                nextOffset:
                  approvedUsersQuery.data?.next_offset ??
                  userStateOffsets.approved + MANAGE_PAGE_SIZE,
                offset: userStateOffsets.approved,
                refetch: () => approvedUsersQuery.refetch(),
              }}
              bannedUsers={bannedUsers}
              bannedUsersQuery={{
                hasMore: bannedUsersQuery.data?.has_more ?? false,
                isError: bannedUsersQuery.isError,
                isFetching: bannedUsersQuery.isFetching,
                isLoading: bannedUsersQuery.isPending,
                nextOffset:
                  bannedUsersQuery.data?.next_offset ??
                  userStateOffsets.banned + MANAGE_PAGE_SIZE,
                offset: userStateOffsets.banned,
                refetch: () => bannedUsersQuery.refetch(),
              }}
              comments={managedComments}
              commentsQuery={{
                hasMore: commentsQuery.data?.has_more ?? false,
                isError: commentsQuery.isError,
                isFetching: commentsQuery.isFetching,
                isLoading: commentsQuery.isPending,
                nextOffset:
                  commentsQuery.data?.next_offset ??
                  commentsOffset + MANAGE_PAGE_SIZE,
                offset: commentsOffset,
                refetch: () => commentsQuery.refetch(),
              }}
              community={community}
              hasPlatformOwnerOverride={hasPlatformOwnerOverride}
              members={managedMembers}
              membersQuery={{
                hasMore: membersQuery.data?.has_more ?? false,
                isError: membersQuery.isError,
                isFetching: membersQuery.isFetching,
                isLoading: membersQuery.isPending,
                nextOffset:
                  membersQuery.data?.next_offset ??
                  membersOffset + MANAGE_PAGE_SIZE,
                offset: membersOffset,
                refetch: () => membersQuery.refetch(),
              }}
              modLogs={modLogs}
              modLogsQuery={{
                hasMore: modLogsQuery.data?.has_more ?? false,
                isError: modLogsQuery.isError,
                isFetching: modLogsQuery.isFetching,
                isLoading: modLogsQuery.isPending,
                nextOffset:
                  modLogsQuery.data?.next_offset ?? modLogOffset + MANAGE_PAGE_SIZE,
                offset: modLogOffset,
                refetch: () => modLogsQuery.refetch(),
              }}
              modQueueItems={modQueueQuery.data?.items ?? []}
              modQueueQuery={{
                hasMore: modQueueQuery.data?.has_more ?? false,
                isError: modQueueQuery.isError,
                isFetching: modQueueQuery.isFetching,
                isLoading: modQueueQuery.isPending,
                nextOffset:
                  modQueueQuery.data?.next_offset ??
                  modQueueOffset + MANAGE_PAGE_SIZE,
                offset: modQueueOffset,
                refetch: () => modQueueQuery.refetch(),
              }}
              mutedUsers={mutedUsers}
              mutedUsersQuery={{
                hasMore: mutedUsersQuery.data?.has_more ?? false,
                isError: mutedUsersQuery.isError,
                isFetching: mutedUsersQuery.isFetching,
                isLoading: mutedUsersQuery.isPending,
                nextOffset:
                  mutedUsersQuery.data?.next_offset ??
                  userStateOffsets.muted + MANAGE_PAGE_SIZE,
                offset: userStateOffsets.muted,
                refetch: () => mutedUsersQuery.refetch(),
              }}
              modLogFilters={modLogFilters}
              onCommentsOffsetChange={setCommentsOffset}
              onMembersOffsetChange={setMembersOffset}
              onModLogFiltersChange={(nextFilters) => {
                setModLogFilters(nextFilters);
                setModLogOffset(0);
              }}
              onModLogOffsetChange={setModLogOffset}
              onModQueueOffsetChange={setModQueueOffset}
              onPostsOffsetChange={setPostsOffset}
              onQueueChange={changeQueue}
              onUserStateOffsetChange={changeUserStateOffset}
              posts={managedPosts}
              postsQuery={{
                hasMore: postsQuery.data?.has_more ?? false,
                isError: postsQuery.isError,
                isFetching: postsQuery.isFetching,
                isLoading: postsQuery.isPending,
                nextOffset:
                  postsQuery.data?.next_offset ?? postsOffset + MANAGE_PAGE_SIZE,
                offset: postsOffset,
                refetch: () => postsQuery.refetch(),
              }}
              reports={managedReports}
              reportsQuery={{
                hasMore: reportsQuery.data?.has_more ?? false,
                isError: reportsQuery.isError,
                isFetching: reportsQuery.isFetching,
                isLoading: reportsQuery.isPending,
                nextOffset:
                  reportsQuery.data?.next_offset ??
                  reportsOffset + MANAGE_PAGE_SIZE,
                offset: reportsOffset,
                refetch: () => reportsQuery.refetch(),
              }}
              removalReasons={removalReasons}
              removalReasonsQuery={{
                isError: removalReasonsQuery.isError,
                isLoading: removalReasonsQuery.isPending,
                refetch: () => removalReasonsQuery.refetch(),
              }}
              rules={managedRules}
              rulesQuery={{
                isError: rulesQuery.isError,
                isLoading: rulesQuery.isPending,
                refetch: () => rulesQuery.refetch(),
              }}
              savedResponses={savedResponses}
              savedResponsesQuery={{
                isError: savedResponsesQuery.isError,
                isLoading: savedResponsesQuery.isPending,
                refetch: () => savedResponsesQuery.refetch(),
              }}
              settings={managedSettings}
              settingsQuery={{
                isError: settingsQuery.isError,
                isLoading: settingsQuery.isPending,
                refetch: () => settingsQuery.refetch(),
              }}
              slug={slug}
            />
          ) : null}
        </section>
      </div>
  );
}

type QueryPreviewState = {
  hasMore?: boolean;
  isError: boolean;
  isFetching?: boolean;
  isLoading: boolean;
  nextOffset?: number;
  offset?: number;
  refetch: () => unknown;
};

type ModLogFilters = {
  action: string;
  actorId: string;
  targetId: string;
  targetType: string;
};

function getCommunityManageToolHref(slug: string, tool: CommunityManageTool) {
  const baseHref = `/communities/${encodeURIComponent(slug)}/manage`;

  return tool === "overview" ? baseHref : `${baseHref}/${tool}`;
}

function ManagePagination({
  hasMore,
  isFetching,
  nextOffset,
  offset,
  onOffsetChange,
  pageSize = MANAGE_PAGE_SIZE,
}: {
  hasMore: boolean;
  isFetching: boolean;
  nextOffset: number;
  offset: number;
  onOffsetChange: (offset: number) => void;
  pageSize?: number;
}) {
  const [jumpOffset, setJumpOffset] = useState("");
  const currentPage = Math.floor(offset / pageSize) + 1;

  function submitJump(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedOffset = Number.parseInt(jumpOffset.trim(), 10);
    if (Number.isNaN(parsedOffset)) {
      return;
    }
    onOffsetChange(Math.max(0, parsedOffset));
  }

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-border pt-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={offset === 0 || isFetching}
          onClick={() => onOffsetChange(0)}
        >
          最新
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={offset === 0 || isFetching}
          onClick={() => onOffsetChange(Math.max(0, offset - pageSize))}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          上一页
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!hasMore || isFetching}
          onClick={() => onOffsetChange(nextOffset)}
        >
          下一页
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>第 {currentPage} 页</span>
        <span className="font-mono">OFFSET {offset}</span>
        <span>每页 {pageSize}</span>
      </div>
      <form className="flex min-w-0 items-center gap-2" onSubmit={submitJump}>
        <Input
          value={jumpOffset}
          onChange={(event) => setJumpOffset(event.target.value)}
          inputMode="numeric"
          placeholder="Offset"
          aria-label="跳转到 offset"
          className="h-9 w-28"
          disabled={isFetching}
        />
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          disabled={isFetching || !jumpOffset.trim()}
        >
          跳转
        </Button>
      </form>
    </div>
  );
}

function ManageQueryPagination({
  onOffsetChange,
  query,
}: {
  onOffsetChange: (offset: number) => void;
  query: QueryPreviewState;
}) {
  const offset = query.offset ?? 0;

  if (!query.hasMore && offset === 0) {
    return null;
  }

  return (
    <ManagePagination
      hasMore={query.hasMore ?? false}
      isFetching={query.isFetching ?? false}
      nextOffset={query.nextOffset ?? offset + MANAGE_PAGE_SIZE}
      offset={offset}
      onOffsetChange={onOffsetChange}
    />
  );
}

function CommunityToolsNav({
  activeTool,
  slug,
}: {
  activeTool: CommunityManageTool;
  slug: string;
}) {
  return (
    <section className="border-b border-border py-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatusToken tone="primary">Mod Tools</StatusToken>
        <StatusToken>社区级</StatusToken>
      </div>
      <nav
        aria-label="社区管理工具"
        className="mt-3 flex gap-3 overflow-x-auto pb-1 xl:grid xl:grid-cols-3 xl:overflow-visible xl:pb-0"
      >
        {communityToolGroups.map((group, groupIndex) => (
          <div
            key={group.label}
            className="min-w-[220px] shrink-0 border-r border-border pr-3 last:border-r-0 xl:min-w-0"
          >
            <div className="pb-2 font-mono text-[11px] text-muted-foreground">
              {String(groupIndex + 1).padStart(2, "0")} {group.label}
            </div>
            <div className="border-t border-border">
              {group.items.map((item, itemIndex) => {
                const active = activeTool === item.value;

                return (
                  <Link
                    key={item.value}
                    href={getCommunityManageToolHref(slug, item.value)}
                    className={`group flex min-h-12 w-full items-center justify-between gap-3 border-b border-border px-2 py-2 text-left text-sm transition-colors xl:px-2 ${
                      active
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="w-8 shrink-0 font-mono text-[11px] text-muted-foreground">
                        {groupIndex + 1}.{itemIndex + 1}
                      </span>
                      <item.icon className="size-4 shrink-0" aria-hidden="true" />
                      <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                        {item.label}
                      </span>
                    </span>
                    <span
                      className={`size-1.5 shrink-0 rounded-full ${
                        active
                          ? "bg-primary"
                          : "bg-border group-hover:bg-muted-foreground"
                      }`}
                    />
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </section>
  );
}

function CommunityModToolsWorkspace({
  activeQueue,
  activeTool,
  approvedUsers,
  approvedUsersQuery,
  bannedUsers,
  bannedUsersQuery,
  canCreateOwnerTransfer,
  canEditRules,
  canEditSettings,
  canManageModerators,
  canModerateContent,
  comments,
  commentsQuery,
  community,
  hasPlatformOwnerOverride,
  members,
  membersQuery,
  modLogs,
  modLogFilters,
  modLogsQuery,
  modQueueItems,
  modQueueQuery,
  mutedUsers,
  mutedUsersQuery,
  onCommentsOffsetChange,
  onMembersOffsetChange,
  onModLogFiltersChange,
  onModLogOffsetChange,
  onModQueueOffsetChange,
  onPostsOffsetChange,
  onQueueChange,
  onUserStateOffsetChange,
  posts,
  postsQuery,
  reports,
  reportsQuery,
  removalReasons,
  removalReasonsQuery,
  rules,
  rulesQuery,
  savedResponses,
  savedResponsesQuery,
  settings,
  settingsQuery,
  slug,
}: {
  activeQueue: CommunityQueueKind;
  activeTool: CommunityManageTool;
  approvedUsers: CommunityUserState[];
  approvedUsersQuery: QueryPreviewState;
  bannedUsers: CommunityUserState[];
  bannedUsersQuery: QueryPreviewState;
  canCreateOwnerTransfer: boolean;
  canEditRules: boolean;
  canEditSettings: boolean;
  canManageModerators: boolean;
  canModerateContent: boolean;
  comments: CommunityManageComment[];
  commentsQuery: QueryPreviewState;
  community: Community;
  hasPlatformOwnerOverride: boolean;
  members: CommunityMember[];
  membersQuery: QueryPreviewState;
  modLogs: CommunityModLog[];
  modLogFilters: ModLogFilters;
  modLogsQuery: QueryPreviewState;
  modQueueItems: ModQueueItem[];
  modQueueQuery: QueryPreviewState;
  mutedUsers: CommunityUserState[];
  mutedUsersQuery: QueryPreviewState;
  onCommentsOffsetChange: (offset: number) => void;
  onMembersOffsetChange: (offset: number) => void;
  onModLogFiltersChange: (filters: ModLogFilters) => void;
  onModLogOffsetChange: (offset: number) => void;
  onModQueueOffsetChange: (offset: number) => void;
  onPostsOffsetChange: (offset: number) => void;
  onQueueChange: (queue: CommunityQueueKind) => void;
  onUserStateOffsetChange: (
    kind: CommunityUserStateKind,
    offset: number,
  ) => void;
  posts: CommunityManagePost[];
  postsQuery: QueryPreviewState;
  reports: CommunityManageReport[];
  reportsQuery: QueryPreviewState;
  removalReasons: CommunityModerationTemplate[];
  removalReasonsQuery: QueryPreviewState;
  rules: CommunityRule[];
  rulesQuery: QueryPreviewState;
  savedResponses: CommunityModerationTemplate[];
  savedResponsesQuery: QueryPreviewState;
  settings?: CommunityManageSettings;
  settingsQuery: QueryPreviewState;
  slug: string;
}) {
  return (
    <>
      {activeTool === "overview" ? (
        <CommunityOverviewWorkspace
          canEditRules={canEditRules}
          canEditSettings={canEditSettings}
          canManageModerators={canManageModerators}
          canModerateContent={canModerateContent}
          comments={comments}
          commentsQuery={commentsQuery}
          community={community}
          hasPlatformOwnerOverride={hasPlatformOwnerOverride}
          members={members}
          membersQuery={membersQuery}
          posts={posts}
          postsQuery={postsQuery}
          reports={reports}
          reportsQuery={reportsQuery}
          rules={rules}
          rulesQuery={rulesQuery}
          settings={settings}
          settingsQuery={settingsQuery}
          slug={slug}
        />
      ) : null}

      {activeTool === "queues" ? (
        <CommunityQueueWorkspace
          activeQueue={activeQueue}
          canModerateContent={canModerateContent}
          comments={comments}
          commentsQuery={commentsQuery}
          modQueueItems={modQueueItems}
          modQueueQuery={modQueueQuery}
          onCommentsOffsetChange={onCommentsOffsetChange}
          onModQueueOffsetChange={onModQueueOffsetChange}
          onPostsOffsetChange={onPostsOffsetChange}
          onQueueChange={onQueueChange}
          posts={posts}
          postsQuery={postsQuery}
          slug={slug}
        />
      ) : null}

      {activeTool === "content" ? (
        <div className="border-b border-border">
          <ManagePreviewSection
            description="管理视角帖子列表，快捷管理支持批准、移除、垃圾、锁定、置顶、NSFW、剧透和 flair。"
            emptyText="暂无可管理帖子。"
            isError={postsQuery.isError}
            isEmpty={posts.length === 0 && (postsQuery.offset ?? 0) === 0}
            isLoading={postsQuery.isLoading}
            onRetry={postsQuery.refetch}
            title="帖子"
          >
            <ManagePostList
              canModerate={canModerateContent}
              posts={posts}
              slug={slug}
            />
            <ManageQueryPagination
              onOffsetChange={onPostsOffsetChange}
              query={postsQuery}
            />
          </ManagePreviewSection>
          <ManagePreviewSection
            description="管理视角评论列表，快捷管理支持批准、移除、垃圾和忽略举报。"
            emptyText="暂无可管理评论。"
            isError={commentsQuery.isError}
            isEmpty={comments.length === 0 && (commentsQuery.offset ?? 0) === 0}
            isLoading={commentsQuery.isLoading}
            onRetry={commentsQuery.refetch}
            title="评论"
          >
            <ManageCommentList
              canModerate={canModerateContent}
              comments={comments}
              slug={slug}
            />
            <ManageQueryPagination
              onOffsetChange={onCommentsOffsetChange}
              query={commentsQuery}
            />
          </ManagePreviewSection>
        </div>
      ) : null}

      {activeTool === "users" ? (
        <div className="border-b border-border">
          <ManagePreviewSection
            description="社区版主和平台 owner 覆盖可任免社区管理员；版主转让仍要求真实社区版主。"
            emptyText="暂无成员记录。"
            isError={membersQuery.isError}
            isEmpty={false}
            isLoading={membersQuery.isLoading}
            onRetry={membersQuery.refetch}
            title="版主、社区管理员与成员"
          >
            <ManageMemberGovernance
              canManageModerators={canManageModerators}
              memberCount={community.member_count}
              members={members}
              slug={slug}
            />
            <ManageQueryPagination
              onOffsetChange={onMembersOffsetChange}
              query={membersQuery}
            />
          </ManagePreviewSection>
          <ManagePreviewSection
            description="真实社区版主使用双确认转让；平台 owner 覆盖使用异常接管。"
            emptyText="暂无版主交接。"
            isError={false}
            isEmpty={false}
            isLoading={false}
            onRetry={membersQuery.refetch}
            title="版主交接"
          >
            <ManageOwnerTransferPanel
              canCreateOwnerTransfer={canCreateOwnerTransfer}
              community={community}
              hasPlatformOwnerOverride={hasPlatformOwnerOverride}
              slug={slug}
            />
          </ManagePreviewSection>
          <ManageUserStatesPanel
            approvedUsers={approvedUsers}
            approvedUsersQuery={approvedUsersQuery}
            bannedUsers={bannedUsers}
            bannedUsersQuery={bannedUsersQuery}
            canModerate={canModerateContent}
            mutedUsers={mutedUsers}
            mutedUsersQuery={mutedUsersQuery}
            onUserStateOffsetChange={onUserStateOffsetChange}
            slug={slug}
          />
          <ManageUserProfilePanel
            approvedUsers={approvedUsers}
            bannedUsers={bannedUsers}
            canModerate={canModerateContent}
            members={members}
            mutedUsers={mutedUsers}
            slug={slug}
          />
        </div>
      ) : null}

      {activeTool === "rules" ? (
        <div className="border-b border-border">
          <ManagePreviewSection
            description="社区规则已接入真实 CRUD。"
            emptyText="暂无社区规则。"
            isError={rulesQuery.isError}
            isEmpty={false}
            isLoading={rulesQuery.isLoading}
            onRetry={rulesQuery.refetch}
            title="社区规则"
        >
            <ManageRuleManager canEdit={canEditRules} rules={rules} slug={slug} />
          </ManagePreviewSection>
          <ManageModerationTemplatePanel
            canEdit={canEditRules}
            emptyText="暂无移除原因。"
            kind="removal-reasons"
            query={removalReasonsQuery}
            slug={slug}
            templates={removalReasons}
            title="移除原因"
          />
          <ManageModerationTemplatePanel
            canEdit={canEditRules}
            emptyText="暂无保存回复。"
            kind="saved-responses"
            query={savedResponsesQuery}
            slug={slug}
            templates={savedResponses}
            title="保存回复"
          />
        </div>
      ) : null}

      {activeTool === "settings" ? (
        <div className="border-b border-border">
          <ManagePreviewSection
            description="基础名称、简介、头像和背景图按社区资料合同保存。"
            emptyText="暂无社区资料。"
            isError={settingsQuery.isError}
            isEmpty={!settings}
            isLoading={settingsQuery.isLoading}
            onRetry={settingsQuery.refetch}
            title="基础资料"
          >
            {settings ? (
              <ManageSettingsEditor
                canEdit={canEditSettings}
                settings={settings}
                slug={slug}
              />
            ) : null}
          </ManagePreviewSection>
          <UnsupportedToolList
            title="社区设置待前端接入"
            items={[
              "发帖和评论内容控制",
              "安全过滤",
              "post flair / user flair",
              "定时帖",
              "wiki / 指南",
              "社区训练队列",
            ]}
          />
        </div>
      ) : null}

      {activeTool === "automations" ? (
        <UnavailableToolPanel
          icon={<Bot className="size-4" aria-hidden="true" />}
          title="Automod 与自动化"
          items={[
            "Automod 配置读取、保存和版本历史",
            "规则测试和 dry-run",
            "关键词、链接、账号年龄和频率条件",
            "Post / Comment Guidance",
          ]}
        />
      ) : null}

      {activeTool === "modmail" ? (
        <UnavailableToolPanel
          icon={<Inbox className="size-4" aria-hidden="true" />}
          title="Modmail"
          items={[
            "收件箱、待回复、处理中、已归档和管理团队讨论文件夹",
            "以团队身份回复、内部 note、保存回复",
            "分配会话、过滤和归档",
            "从用户卡片或举报打开会话",
          ]}
        />
      ) : null}

      {activeTool === "log" ? (
        <ManageModLogPanel
          filters={modLogFilters}
          logs={modLogs}
          onFiltersChange={onModLogFiltersChange}
          onOffsetChange={onModLogOffsetChange}
          query={modLogsQuery}
        />
      ) : null}

      {activeTool === "insights" ? (
        <UnavailableToolPanel
          icon={<BarChart3 className="size-4" aria-hidden="true" />}
          title="数据摘要"
          items={[
            "Community Digest",
            "队列处理时长和待处理量趋势",
            "举报采纳率、移除原因分布",
            "训练队列和新手社区管理员任务",
          ]}
        />
      ) : null}
    </>
  );
}

function CommunityOverviewWorkspace({
  canEditRules,
  canEditSettings,
  canManageModerators,
  canModerateContent,
  comments,
  commentsQuery,
  community,
  hasPlatformOwnerOverride,
  members,
  membersQuery,
  posts,
  postsQuery,
  reports,
  reportsQuery,
  rules,
  rulesQuery,
  settings,
  settingsQuery,
  slug,
}: {
  canEditRules: boolean;
  canEditSettings: boolean;
  canManageModerators: boolean;
  canModerateContent: boolean;
  comments: CommunityManageComment[];
  commentsQuery: QueryPreviewState;
  community: Community;
  hasPlatformOwnerOverride: boolean;
  members: CommunityMember[];
  membersQuery: QueryPreviewState;
  posts: CommunityManagePost[];
  postsQuery: QueryPreviewState;
  reports: CommunityManageReport[];
  reportsQuery: QueryPreviewState;
  rules: CommunityRule[];
  rulesQuery: QueryPreviewState;
  settings?: CommunityManageSettings;
  settingsQuery: QueryPreviewState;
  slug: string;
}) {
  const toolRows: Array<{
    description: string;
    meta: string;
    status: string;
    tone?: StatusTokenTone;
    tool: CommunityManageTool;
  }> = [
    {
      description: "集中处理举报、待审核、垃圾、已移除和需要关注的内容。",
      meta: reportsQuery.isLoading
        ? "举报读取中"
        : reportsQuery.isError
          ? "举报读取失败"
          : `当前待处理举报 ${reports.length}`,
      status: reports.length > 0 ? "需要处理" : "正常",
      tone: reports.length > 0 ? "warning" : "success",
      tool: "queues",
    },
    {
      description: "分开查看帖子和评论，避免在总览页堆满内容行。",
      meta: postsQuery.isLoading || commentsQuery.isLoading
        ? "内容读取中"
        : postsQuery.isError || commentsQuery.isError
          ? "内容读取失败"
          : `帖子 ${posts.length} / 评论 ${comments.length}`,
      status: "内容",
      tool: "content",
    },
    {
      description: "维护版主、社区管理员、封禁/禁言/批准用户和用户画像。",
      meta: membersQuery.isLoading
        ? "成员读取中"
        : membersQuery.isError
          ? "成员读取失败"
          : `成员 ${formatCount(community.member_count ?? members.length)}`,
      status: canManageModerators ? "可任免" : "只读",
      tone: canManageModerators ? "primary" : "default",
      tool: "users",
    },
    {
      description: "维护社区规则、移除原因和保存回复。",
      meta: rulesQuery.isLoading
        ? "规则读取中"
        : rulesQuery.isError
          ? "规则读取失败"
          : `规则 ${rules.length}`,
      status: canEditRules ? "可编辑" : "只读",
      tone: canEditRules ? "primary" : "default",
      tool: "rules",
    },
    {
      description: "维护社区名称、简介、头像和背景图。",
      meta: settingsQuery.isLoading
        ? "资料读取中"
        : settingsQuery.isError
          ? "资料读取失败"
          : settings
            ? "资料已加载"
            : "暂无资料",
      status: canEditSettings ? "可编辑" : "只读",
      tone: canEditSettings ? "primary" : "default",
      tool: "settings",
    },
    {
      description: "按动作、操作者和目标回看社区治理记录。",
      meta: "独立日志工作区",
      status: "审计",
      tool: "log",
    },
  ];

  const futureRows: Array<{
    description: string;
    tool: CommunityManageTool;
  }> = [
    { description: "Automod、关键词、测试和版本历史。", tool: "automations" },
    { description: "管理团队收件箱、内部 note 和归档。", tool: "modmail" },
    { description: "社区摘要、训练队列和趋势分析。", tool: "insights" },
  ];

  return (
    <>
      <section className="border-b border-border py-5">
        <div className="grid grid-cols-1 border-y border-border sm:grid-cols-2 xl:grid-cols-4">
          <OverviewStatusCell
            label="待处理举报"
            value={reportsQuery.isLoading ? "读取中" : String(reports.length)}
            tone={reports.length > 0 ? "warning" : "success"}
          />
          <OverviewStatusCell
            label="内容索引"
            value={
              postsQuery.isLoading || commentsQuery.isLoading
                ? "读取中"
                : `${posts.length}/${comments.length}`
            }
            tone={postsQuery.isError || commentsQuery.isError ? "danger" : "default"}
          />
          <OverviewStatusCell
            label="成员"
            value={formatCount(community.member_count ?? members.length)}
            tone={membersQuery.isError ? "danger" : "default"}
          />
          <OverviewStatusCell
            label="当前权限"
            value={canModerateContent ? "可审核" : "只读"}
            tone={canModerateContent ? "primary" : "default"}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <StatusToken>{formatViewerRole(community.viewer_role)}</StatusToken>
          {hasPlatformOwnerOverride ? (
            <StatusToken tone="primary">平台 owner 覆盖</StatusToken>
          ) : null}
          <StatusToken tone={canEditSettings ? "success" : "default"}>
            资料{formatPermission(canEditSettings)}
          </StatusToken>
          <StatusToken tone={canEditRules ? "success" : "default"}>
            规则{formatPermission(canEditRules)}
          </StatusToken>
        </div>
      </section>

      <section className="border-b border-border py-5">
        <div className="max-w-3xl">
          <h3 className="text-sm font-semibold">常用工作区</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            总览只保留状态和入口；具体处理放到独立页面，避免把管理表单和队列挤在同一屏。
          </p>
        </div>
        <div className="mt-4 divide-y divide-border border-y border-border">
          {toolRows.map((row, index) => (
            <OverviewToolRow
              description={row.description}
              href={getCommunityManageToolHref(slug, row.tool)}
              index={index + 1}
              key={row.tool}
              meta={row.meta}
              status={row.status}
              title={getCommunityToolMeta(row.tool).label}
              tone={row.tone}
            />
          ))}
        </div>
      </section>

      <section className="border-b border-border py-5">
        <h3 className="text-sm font-semibold">待接入工具位</h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          这些入口保留 Reddit 式信息架构，但不会伪造后端未完成的提交能力。
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {futureRows.map((row) => (
            <Link
              key={row.tool}
              href={getCommunityManageToolHref(slug, row.tool)}
              className="group min-w-0 border-y border-border py-3 text-sm transition-colors hover:text-primary"
            >
              <span className="flex min-w-0 items-center justify-between gap-3">
                <span className="min-w-0 break-words font-semibold [overflow-wrap:anywhere]">
                  {getCommunityToolMeta(row.tool).label}
                </span>
                <StatusToken>待接入</StatusToken>
              </span>
              <span className="mt-2 block text-xs leading-5 text-muted-foreground">
                {row.description}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

function OverviewStatusCell({
  label,
  tone = "default",
  value,
}: {
  label: string;
  tone?: StatusTokenTone;
  value: string;
}) {
  return (
    <div className="min-w-0 border-b border-border px-3 py-4 last:border-b-0 sm:border-r sm:[&:nth-child(2n)]:border-r-0 xl:border-b-0 xl:[&:nth-child(2n)]:border-r xl:last:border-r-0">
      <div className="font-mono text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-2 flex min-w-0 items-center justify-between gap-3">
        <span className="min-w-0 break-words text-lg font-semibold [overflow-wrap:anywhere]">
          {value}
        </span>
        <StatusToken tone={tone}>状态</StatusToken>
      </div>
    </div>
  );
}

function OverviewToolRow({
  description,
  href,
  index,
  meta,
  status,
  title,
  tone = "default",
}: {
  description: string;
  href: string;
  index: number;
  meta: string;
  status: string;
  title: string;
  tone?: StatusTokenTone;
}) {
  return (
    <Link
      href={href}
      className="grid min-w-0 gap-3 px-1 py-4 text-sm transition-colors hover:bg-background-soft/35 sm:grid-cols-[40px_minmax(0,1fr)_auto]"
    >
      <span className="font-mono text-xs text-muted-foreground">
        {String(index).padStart(2, "0")}
      </span>
      <span className="min-w-0">
        <span className="block break-words font-semibold text-foreground [overflow-wrap:anywhere]">
          {title}
        </span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
          {description}
        </span>
        <span className="mt-2 block break-words font-mono text-[11px] text-primary [overflow-wrap:anywhere]">
          {meta}
        </span>
      </span>
      <span className="flex items-start sm:justify-end">
        <StatusToken tone={tone}>{status}</StatusToken>
      </span>
    </Link>
  );
}

function CommunityQueueWorkspace({
  activeQueue,
  canModerateContent,
  comments,
  commentsQuery,
  modQueueItems,
  modQueueQuery,
  onCommentsOffsetChange,
  onModQueueOffsetChange,
  onPostsOffsetChange,
  onQueueChange,
  posts,
  postsQuery,
  slug,
}: {
  activeQueue: CommunityQueueKind;
  canModerateContent: boolean;
  comments: CommunityManageComment[];
  commentsQuery: QueryPreviewState;
  modQueueItems: ModQueueItem[];
  modQueueQuery: QueryPreviewState;
  onCommentsOffsetChange: (offset: number) => void;
  onModQueueOffsetChange: (offset: number) => void;
  onPostsOffsetChange: (offset: number) => void;
  onQueueChange: (queue: CommunityQueueKind) => void;
  posts: CommunityManagePost[];
  postsQuery: QueryPreviewState;
  slug: string;
}) {
  const modQueueOffset = modQueueQuery.offset ?? 0;
  const modQueueNextOffset =
    modQueueQuery.nextOffset ?? modQueueOffset + MANAGE_PAGE_SIZE;

  return (
    <>
      <div className="flex gap-2 overflow-x-auto border-b border-border py-3">
        {communityQueueTabs.map((queue) => (
          <button
            key={queue.value}
            type="button"
            className={`min-h-9 shrink-0 border-b px-2 text-xs font-semibold transition-colors ${
              activeQueue === queue.value
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => onQueueChange(queue.value)}
          >
            {queue.label}
          </button>
        ))}
      </div>

      {activeQueue === "reports" ? (
        <ManagePreviewSection
          description="来自社区 Mod Tools 队列合同，支持批量批准、忽略举报、标记垃圾和移除。"
          emptyText="暂无待处理举报。"
          isError={modQueueQuery.isError}
          isEmpty={modQueueItems.length === 0 && modQueueOffset === 0}
          isLoading={modQueueQuery.isLoading}
          onRetry={modQueueQuery.refetch}
          title="举报队列"
        >
          <ModQueueItemList
            canModerate={canModerateContent}
            items={modQueueItems}
            slug={slug}
          />
          <ManagePagination
            hasMore={modQueueQuery.hasMore ?? false}
            isFetching={modQueueQuery.isFetching ?? false}
            nextOffset={modQueueNextOffset}
            offset={modQueueOffset}
            onOffsetChange={onModQueueOffsetChange}
          />
        </ManagePreviewSection>
      ) : null}

      {activeQueue === "posts" ? (
        <ManagePreviewSection
          description="当前提供管理视角帖子列表，并可用快捷管理处理单项内容。"
          emptyText="暂无可管理帖子。"
          isError={postsQuery.isError}
          isEmpty={posts.length === 0 && (postsQuery.offset ?? 0) === 0}
          isLoading={postsQuery.isLoading}
          onRetry={postsQuery.refetch}
          title="待审核帖子"
        >
          <ManagePostList
            canModerate={canModerateContent}
            posts={posts}
            slug={slug}
          />
          <ManageQueryPagination
            onOffsetChange={onPostsOffsetChange}
            query={postsQuery}
          />
        </ManagePreviewSection>
      ) : null}

      {activeQueue === "comments" ? (
        <ManagePreviewSection
          description="当前提供管理视角评论列表，并可用快捷管理处理单项评论。"
          emptyText="暂无可管理评论。"
          isError={commentsQuery.isError}
          isEmpty={comments.length === 0 && (commentsQuery.offset ?? 0) === 0}
          isLoading={commentsQuery.isLoading}
          onRetry={commentsQuery.refetch}
          title="评论队列"
        >
          <ManageCommentList
            canModerate={canModerateContent}
            comments={comments}
            slug={slug}
          />
          <ManageQueryPagination
            onOffsetChange={onCommentsOffsetChange}
            query={commentsQuery}
          />
        </ManagePreviewSection>
      ) : null}

      {["spam", "removed", "edited", "unmoderated", "needs_review"].includes(
        activeQueue,
      ) ? (
        <ManagePreviewSection
          description="来自社区 Mod Tools 队列合同，支持直接批准、标记垃圾、忽略举报和跳转社区管理。"
          emptyText="当前队列没有待处理内容。"
          isError={modQueueQuery.isError}
          isEmpty={modQueueItems.length === 0 && modQueueOffset === 0}
          isLoading={modQueueQuery.isLoading}
          onRetry={modQueueQuery.refetch}
          title={getQueueLabel(activeQueue)}
        >
          <ModQueueItemList
            canModerate={canModerateContent}
            items={modQueueItems}
            slug={slug}
          />
          <ManagePagination
            hasMore={modQueueQuery.hasMore ?? false}
            isFetching={modQueueQuery.isFetching ?? false}
            nextOffset={modQueueNextOffset}
            offset={modQueueOffset}
            onOffsetChange={onModQueueOffsetChange}
          />
        </ManagePreviewSection>
      ) : null}
    </>
  );
}

function UnsupportedToolList({
  items,
  title,
}: {
  items: string[];
  title: string;
}) {
  return (
    <section className="min-w-0 border-b border-border py-5 last:border-b-0">
      <div className="flex items-center gap-2">
        <Wand2 className="size-4 text-primary" aria-hidden="true" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        这些是 Reddit Mod Tools 对应体验，当前后端没有正式合同，前端只展示位置和缺口。
      </p>
      <div className="mt-4 divide-y divide-border border-t border-border">
        {items.map((item, index) => (
          <div
            key={item}
            className="grid grid-cols-[40px_minmax(0,1fr)_auto] gap-3 py-3 text-sm"
          >
            <span className="font-mono text-xs text-muted-foreground">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="text-muted-foreground">{item}</span>
            <StatusToken>待接入</StatusToken>
          </div>
        ))}
      </div>
    </section>
  );
}

function UnavailableToolPanel({
  icon,
  items,
  title,
}: {
  icon: ReactNode;
  items: string[];
  title: string;
}) {
  return (
    <section className="border-b border-border py-5">
      <div className="flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        <h3 className="text-sm font-semibold">{title}</h3>
        <StatusToken>待接入</StatusToken>
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
        这里保留 Reddit 式工具位置和信息架构，但不会提交假动作；未完成前只展示不可提交状态。
      </p>
      <div className="mt-4 divide-y divide-border border-t border-border">
        {items.map((item, index) => (
          <div
            key={item}
            className="grid grid-cols-[40px_minmax(0,1fr)] gap-3 py-3 text-sm"
          >
            <span className="font-mono text-xs text-primary">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="text-muted-foreground">{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function getCommunityToolMeta(tool: CommunityManageTool) {
  for (const group of communityToolGroups) {
    const item = group.items.find((candidate) => candidate.value === tool);
    if (item) {
      return item;
    }
  }

  return communityToolGroups[0].items[0];
}

function ManageHeader({
  canManageCommunity,
  community,
  hasPlatformOwnerOverride,
  platformRole,
  platformRoleIsInferred,
  slug,
  tool,
}: {
  canManageCommunity: boolean;
  community?: Community;
  hasPlatformOwnerOverride: boolean;
  platformRole: PlatformRole | null;
  platformRoleIsInferred: boolean;
  slug: string;
  tool: CommunityManageTool;
}) {
  return (
    <div className="border-b border-border py-4">
      <div className="min-w-0">
        <h1 className="break-words text-xl font-semibold leading-7 tracking-normal text-foreground sm:text-2xl">
          社区管理
        </h1>
        <p className="mt-1 break-words font-mono text-xs text-primary [overflow-wrap:anywhere]">
          {getCommunityManageToolHref(slug, tool)}
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          {community && canManageCommunity
            ? `${community.name} 的社区管理入口。当前角色 ${formatViewerRole(community.viewer_role)}，成员 ${formatCount(community.member_count)}，帖子 ${formatCount(community.post_count)}。${hasPlatformOwnerOverride ? "当前通过平台 owner 覆盖进入，真实社区角色不变。" : ""}所有写操作仍由后端权限校验。`
            : null}
          {community && !canManageCommunity
            ? formatCommunityManageForbiddenDescription({
                community,
                platformRole,
                platformRoleIsInferred,
              })
            : null}
          {!community ? "读取社区管理上下文后会显示权限和待处理内容。" : null}
        </p>
      </div>

    </div>
  );
}

function ManagePreviewSection({
  children,
  description,
  emptyText,
  isError,
  isEmpty,
  isLoading,
  onRetry,
  title,
}: {
  children: ReactNode;
  description: string;
  emptyText: string;
  isError: boolean;
  isEmpty: boolean;
  isLoading: boolean;
  onRetry: () => void;
  title: string;
}) {
  return (
    <section className="min-w-0 border-b border-border py-5 last:border-b-0">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </div>

      <div className="mt-4">
        {isLoading ? <LoadingState rows={3} /> : null}
        {isError ? (
          <ErrorState
            title={`无法加载${title}`}
            description="请求失败，请稍后重试。"
            action={
              <Button
                variant="ghost"
                size="sm"
                className="px-1 hover:bg-transparent hover:text-primary"
                onClick={onRetry}
              >
                重试
              </Button>
            }
          />
        ) : null}
        {isEmpty ? (
          <p className="text-sm leading-6 text-muted-foreground">{emptyText}</p>
        ) : null}
        {!isLoading && !isError && !isEmpty ? children : null}
      </div>
    </section>
  );
}

function ManagePostList({
  canModerate,
  posts,
  slug,
}: {
  canModerate: boolean;
  posts: CommunityManagePost[];
  slug: string;
}) {
  if (posts.length === 0) {
    return null;
  }

  return (
    <div>
      {posts.map((post, index) => (
        <ManageContentRow
          action={
            canModerate ? (
              <ModerationQuickActions
                canRemove={post.status !== "removed"}
                communityManageHref={`/communities/${encodeURIComponent(slug)}/manage`}
                communitySlug={slug}
                targetId={post.id}
                targetAuthorId={post.author_id}
                targetLabel={post.title}
                targetStatus={post.status}
                targetType="post"
              />
            ) : null
          }
          key={post.id}
          index={String(index + 1).padStart(2, "0")}
          title={post.title}
          text={`${formatContentStatus(post.status)} / ${formatDate(post.updated_at)}`}
        />
      ))}
    </div>
  );
}

function ManageCommentList({
  canModerate,
  comments,
  slug,
}: {
  canModerate: boolean;
  comments: CommunityManageComment[];
  slug: string;
}) {
  if (comments.length === 0) {
    return null;
  }

  return (
    <div>
      {comments.map((comment, index) => (
        <ManageContentRow
          action={
            canModerate ? (
              <ModerationQuickActions
                canRemove={comment.status !== "removed"}
                communityManageHref={`/communities/${encodeURIComponent(slug)}/manage`}
                communitySlug={slug}
                targetId={comment.id}
                targetAuthorId={comment.author_id}
                targetLabel={comment.body_excerpt || "无正文摘要"}
                targetPostId={comment.post_id}
                targetStatus={comment.status}
                targetType="comment"
              />
            ) : null
          }
          key={comment.id}
          index={String(index + 1).padStart(2, "0")}
          title={comment.body_excerpt || "无正文摘要"}
          text={`${formatContentStatus(comment.status)} / ${formatDate(comment.updated_at)}`}
        />
      ))}
    </div>
  );
}

function ModQueueItemList({
  canModerate,
  items,
  slug,
}: {
  canModerate: boolean;
  items: ModQueueItem[];
  slug: string;
}) {
  const [selectedTargetKeys, setSelectedTargetKeys] = useState<Set<string>>(
    () => new Set(),
  );

  if (items.length === 0) {
    return null;
  }

  const selectedTargets = items.reduce<ModerationBulkTarget[]>((targets, item) => {
    if (!selectedTargetKeys.has(getModQueueTargetKey(item))) {
      return targets;
    }

    targets.push({
      label: item.preview,
      targetId: item.target_id,
      targetType: normalizeReportTargetType(item.target_type),
    });
    return targets;
  }, []);
  const allSelected =
    items.length > 0 &&
    items.every((item) => selectedTargetKeys.has(getModQueueTargetKey(item)));

  function toggleAll() {
    setSelectedTargetKeys((current) => {
      if (allSelected) {
        return new Set();
      }

      const next = new Set(current);
      for (const item of items) {
        next.add(getModQueueTargetKey(item));
      }
      return next;
    });
  }

  function toggleItem(item: ModQueueItem) {
    setSelectedTargetKeys((current) => {
      const next = new Set(current);
      const key = getModQueueTargetKey(item);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <div>
      {canModerate ? (
        <div className="mb-3 flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <StatusToken tone={selectedTargets.length > 0 ? "primary" : "default"}>
              已选 {selectedTargets.length}
            </StatusToken>
            <Button type="button" variant="ghost" size="sm" onClick={toggleAll}>
              {allSelected ? "取消本页" : "选择本页"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={selectedTargets.length === 0}
              onClick={() => setSelectedTargetKeys(new Set())}
            >
              清空
            </Button>
          </div>
          <ModerationBulkActions
            communitySlug={slug}
            selectedTargets={selectedTargets}
            onCompleted={() => setSelectedTargetKeys(new Set())}
          />
        </div>
      ) : null}
      {items.map((item, index) => {
        const targetType = normalizeReportTargetType(item.target_type);
        const title = item.preview || `${formatReportTarget(item.target_type)} ${item.target_id}`;

        return (
          <ManageContentRow
            action={
              canModerate ? (
                <ModerationQuickActions
                  canRemove={item.status !== "removed"}
                  communityManageHref={`/communities/${encodeURIComponent(slug)}/manage`}
                  communitySlug={slug}
                  targetId={item.target_id}
                  targetAuthorId={item.author_id}
                  targetLabel={title}
                  targetPostId={item.post_id}
                  targetStatus={item.status}
                  targetType={targetType}
                  userHref={null}
                />
              ) : null
            }
            key={item.id}
            index={String(index + 1).padStart(2, "0")}
            selection={
              canModerate ? (
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-primary"
                  aria-label={`选择 ${title}`}
                  checked={selectedTargetKeys.has(getModQueueTargetKey(item))}
                  onChange={() => toggleItem(item)}
                />
              ) : null
            }
            title={title}
            text={`${getQueueLabel(item.queue)} / ${formatContentStatus(item.status)} / 举报 ${item.report_count}`}
          />
        );
      })}
    </div>
  );
}

function ManageUserStatesPanel({
  approvedUsers,
  approvedUsersQuery,
  bannedUsers,
  bannedUsersQuery,
  canModerate,
  mutedUsers,
  mutedUsersQuery,
  onUserStateOffsetChange,
  slug,
}: {
  approvedUsers: CommunityUserState[];
  approvedUsersQuery: QueryPreviewState;
  bannedUsers: CommunityUserState[];
  bannedUsersQuery: QueryPreviewState;
  canModerate: boolean;
  mutedUsers: CommunityUserState[];
  mutedUsersQuery: QueryPreviewState;
  onUserStateOffsetChange: (
    kind: CommunityUserStateKind,
    offset: number,
  ) => void;
  slug: string;
}) {
  const [activeKind, setActiveKind] = useState<CommunityUserStateKind>("banned");
  const statesByKind = {
    approved: approvedUsers,
    banned: bannedUsers,
    muted: mutedUsers,
  } satisfies Record<CommunityUserStateKind, CommunityUserState[]>;
  const queryByKind = {
    approved: approvedUsersQuery,
    banned: bannedUsersQuery,
    muted: mutedUsersQuery,
  } satisfies Record<CommunityUserStateKind, QueryPreviewState>;
  const activeUsers = statesByKind[activeKind];
  const activeQuery = queryByKind[activeKind];

  return (
    <section className="min-w-0 border-b border-border py-5 last:border-b-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold">社区用户治理</h3>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            封禁、禁言和批准用户走社区级合同，不改变平台账号状态。
          </p>
        </div>
        <StatusToken tone={canModerate ? "success" : "default"}>
          {canModerate ? "可操作" : "只读"}
        </StatusToken>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto border-b border-border">
        {(["banned", "muted", "approved"] as CommunityUserStateKind[]).map(
          (kind) => (
            <button
              key={kind}
              type="button"
              className={`min-h-9 shrink-0 border-b px-2 text-xs font-semibold transition-colors ${
                activeKind === kind
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveKind(kind)}
            >
              {formatUserStateKind(kind)}
            </button>
          ),
        )}
      </div>

      {canModerate ? (
        <CommunityUserStateForm kind={activeKind} slug={slug} />
      ) : (
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          当前账号没有社区审核权限，不能修改用户状态。
        </p>
      )}

      <CommunityUserStateList
        kind={activeKind}
        query={activeQuery}
        slug={slug}
        users={activeUsers}
      />
      <ManageQueryPagination
        onOffsetChange={(offset) => onUserStateOffsetChange(activeKind, offset)}
        query={activeQuery}
      />
    </section>
  );
}

function CommunityUserStateForm({
  kind,
  slug,
}: {
  kind: CommunityUserStateKind;
  slug: string;
}) {
  const [userId, setUserId] = useState("");
  const [reason, setReason] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const mutation = useUpsertCommunityUserStateMutation();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!userId.trim()) {
      setFormError("请输入用户 ID。");
      return;
    }

    if ((kind === "banned" || kind === "muted") && !reason.trim()) {
      setFormError("请输入处理原因。");
      return;
    }

    const parsedExpiresAt = expiresAt ? new Date(expiresAt) : null;

    if (parsedExpiresAt && Number.isNaN(parsedExpiresAt.getTime())) {
      setFormError("到期时间格式不正确。");
      return;
    }

    await mutation.mutateAsync({
      expires_at: parsedExpiresAt ? parsedExpiresAt.toISOString() : null,
      kind,
      reason: reason.trim(),
      slug,
      user_id: userId.trim(),
    });
    setUserId("");
    setReason("");
    setExpiresAt("");
  }

  return (
    <form className="mt-4 grid gap-3 border-b border-border pb-4" onSubmit={submit}>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-2">
          <label className="text-xs font-semibold" htmlFor={`${kind}-user-id`}>
            用户 ID
          </label>
          <Input
            id={`${kind}-user-id`}
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            placeholder="粘贴后端用户 ID"
            disabled={mutation.isPending}
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold" htmlFor={`${kind}-expires-at`}>
            到期时间
          </label>
          <Input
            id={`${kind}-expires-at`}
            type="datetime-local"
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
            disabled={mutation.isPending}
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold" htmlFor={`${kind}-reason`}>
          原因
        </label>
        <Textarea
          id={`${kind}-reason`}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="写清社区治理依据，便于 Mod Log 回看。"
          disabled={mutation.isPending}
        />
      </div>
      {formError || mutation.error ? (
        <Alert variant="destructive">
          <AlertTitle>提交失败</AlertTitle>
          <AlertDescription>
            {formError ?? getErrorDescription(mutation.error)}
          </AlertDescription>
        </Alert>
      ) : null}
      {mutation.isSuccess && !mutation.error ? (
        <Alert>
          <AlertTitle>已提交</AlertTitle>
          <AlertDescription>用户状态已更新，列表和 Mod Log 会自动刷新。</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={mutation.isPending}>
          {mutation.isPending ? "提交中..." : `保存${formatUserStateKind(kind)}`}
        </Button>
      </div>
    </form>
  );
}

function CommunityUserStateList({
  kind,
  query,
  slug,
  users,
}: {
  kind: CommunityUserStateKind;
  query: QueryPreviewState;
  slug: string;
  users: CommunityUserState[];
}) {
  if (query.isLoading) {
    return <LoadingState rows={3} />;
  }

  if (query.isError) {
    return (
      <ErrorState
        title={`无法加载${formatUserStateKind(kind)}`}
        description="请稍后重试。"
        action={
          <Button variant="ghost" size="sm" onClick={() => query.refetch()}>
            重试
          </Button>
        }
      />
    );
  }

  if (users.length === 0) {
    return (
      <p className="py-4 text-sm leading-6 text-muted-foreground">
        暂无{formatUserStateKind(kind)}记录。
      </p>
    );
  }

  return (
    <div className="divide-y divide-border">
      {users.map((user, index) => (
        <CommunityUserStateRow
          key={user.id || `${user.kind}-${user.user_id}`}
          index={index + 1}
          kind={kind}
          slug={slug}
          user={user}
        />
      ))}
    </div>
  );
}

function CommunityUserStateRow({
  index,
  kind,
  slug,
  user,
}: {
  index: number;
  kind: CommunityUserStateKind;
  slug: string;
  user: CommunityUserState;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const mutation = useDeleteCommunityUserStateMutation();
  const displayName = user.display_name || user.username || user.user_id;

  async function submitDelete() {
    await mutation.mutateAsync({ kind, slug, user_id: user.user_id });
    setConfirmOpen(false);
  }

  return (
    <div className="grid gap-3 py-4 lg:grid-cols-[minmax(0,1fr)_auto]">
      <IndexedInfoRow
        className="border-b-0 py-0"
        index={String(index).padStart(2, "0")}
        title={`${displayName} / @${user.username || user.user_id}`}
        text={user.reason || "未填写原因"}
      />
      <div className="flex flex-wrap items-start gap-2 lg:justify-end">
        <StatusToken>{formatUserStateKind(kind)}</StatusToken>
        {user.expires_at ? (
          <StatusToken tone="warning">至 {formatDateTime(user.expires_at)}</StatusToken>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={mutation.isPending}
          onClick={() => setConfirmOpen(true)}
        >
          移除
        </Button>
      </div>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>移除{formatUserStateKind(kind)}</DialogTitle>
            <DialogDescription>
              该操作会移除 @{user.username || user.user_id} 在本社区的
              {formatUserStateKind(kind)}状态，并写入社区 Mod Log。
            </DialogDescription>
          </DialogHeader>
          {mutation.error ? (
            <Alert variant="destructive">
              <AlertTitle>移除失败</AlertTitle>
              <AlertDescription>{getErrorDescription(mutation.error)}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={mutation.isPending}
              onClick={() => setConfirmOpen(false)}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={mutation.isPending}
              onClick={submitDelete}
            >
              {mutation.isPending ? "提交中..." : "确认移除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ManageUserProfilePanel({
  approvedUsers,
  bannedUsers,
  canModerate,
  members,
  mutedUsers,
  slug,
}: {
  approvedUsers: CommunityUserState[];
  bannedUsers: CommunityUserState[];
  canModerate: boolean;
  members: CommunityMember[];
  mutedUsers: CommunityUserState[];
  slug: string;
}) {
  const [inputUserId, setInputUserId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const profileQuery = useCommunityModerationUserProfileQuery(
    { slug, user_id: selectedUserId },
    canModerate && Boolean(selectedUserId),
  );
  const notesQuery = useCommunityModeratorNotesQuery(
    { limit: 20, offset: 0, slug, user_id: selectedUserId },
    canModerate && Boolean(selectedUserId),
  );
  const createNoteMutation = useCreateCommunityModeratorNoteMutation();
  const profile = profileQuery.data ?? null;
  const notes = notesQuery.data?.notes ?? profile?.recent_notes ?? [];
  const candidates = buildModerationUserCandidates({
    approvedUsers,
    bannedUsers,
    members,
    mutedUsers,
  });

  function selectUser(userId: string) {
    setSelectedUserId(userId);
    setInputUserId(userId);
    setFormError(null);
    setSuccessMessage(null);
  }

  function submitLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedUserId = inputUserId.trim();
    if (!trimmedUserId) {
      setFormError("请输入用户 ID。");
      return;
    }

    setSelectedUserId(trimmedUserId);
    setFormError(null);
    setSuccessMessage(null);
  }

  async function submitNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    const trimmedBody = noteBody.trim();
    if (!selectedUserId) {
      setFormError("请先选择用户。");
      return;
    }

    if (!trimmedBody) {
      setFormError("请填写 Mod Note 内容。");
      return;
    }

    await createNoteMutation.mutateAsync({
      body: trimmedBody,
      slug,
      user_id: selectedUserId,
    });
    setNoteBody("");
    setSuccessMessage("Mod Note 已保存。");
  }

  return (
    <section className="min-w-0 border-b border-border py-5 last:border-b-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Users className="size-4 text-primary" aria-hidden="true" />
            <h3 className="text-sm font-semibold">用户画像与 Mod Notes</h3>
          </div>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-muted-foreground">
            查看用户在本社区的帖子、评论、举报、移除统计和团队备注。
          </p>
        </div>
        <StatusToken tone={canModerate ? "success" : "default"}>
          {canModerate ? "可操作" : "只读"}
        </StatusToken>
      </div>

      {!canModerate ? (
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          当前账号没有社区审核权限，不能读取社区用户画像。
        </p>
      ) : (
        <>
          <form
            className="mt-4 grid gap-3 border-b border-border pb-4 lg:grid-cols-[minmax(0,1fr)_auto]"
            onSubmit={submitLookup}
          >
            <Input
              value={inputUserId}
              onChange={(event) => setInputUserId(event.target.value)}
              placeholder="用户 ID"
              aria-label="用户 ID"
            />
            <Button type="submit" size="sm">
              查看画像
            </Button>
          </form>

          {candidates.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto border-b border-border py-3">
              {candidates.slice(0, 12).map((candidate) => (
                <button
                  key={candidate.userId}
                  type="button"
                  className="min-h-9 shrink-0 border border-border px-2 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  onClick={() => selectUser(candidate.userId)}
                >
                  {candidate.label}
                </button>
              ))}
            </div>
          ) : null}

          {formError ? (
            <Alert variant="destructive" className="mt-4">
              <AlertTitle>操作失败</AlertTitle>
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}
          {successMessage ? (
            <Alert className="mt-4">
              <AlertTitle>已保存</AlertTitle>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          ) : null}

          <ModerationUserProfileBlock
            error={profileQuery.error}
            isError={profileQuery.isError}
            isLoading={profileQuery.isPending && Boolean(selectedUserId)}
            onRetry={() => profileQuery.refetch()}
            profile={profile}
            selectedUserId={selectedUserId}
          />

          {selectedUserId ? (
            <form className="mt-4 grid gap-3" onSubmit={submitNote}>
              <label className="text-xs font-semibold" htmlFor="community-mod-note">
                新增 Mod Note
              </label>
              <Textarea
                id="community-mod-note"
                value={noteBody}
                onChange={(event) => setNoteBody(event.target.value)}
                placeholder="记录该用户的审核上下文。"
                maxLength={1000}
                disabled={createNoteMutation.isPending}
              />
              {createNoteMutation.error ? (
                <Alert variant="destructive">
                  <AlertTitle>保存失败</AlertTitle>
                  <AlertDescription>
                    {getErrorDescription(createNoteMutation.error)}
                  </AlertDescription>
                </Alert>
              ) : null}
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-xs text-muted-foreground">
                  {noteBody.trim().length} / 1000
                </span>
                <Button type="submit" size="sm" disabled={createNoteMutation.isPending}>
                  {createNoteMutation.isPending ? "保存中..." : "保存 Mod Note"}
                </Button>
              </div>
            </form>
          ) : null}

          <ModeratorNotesList
            error={notesQuery.error}
            isError={notesQuery.isError}
            isLoading={notesQuery.isPending && Boolean(selectedUserId)}
            notes={notes}
            onRetry={() => notesQuery.refetch()}
            selectedUserId={selectedUserId}
            slug={slug}
          />
        </>
      )}
    </section>
  );
}

function ModerationUserProfileBlock({
  error,
  isError,
  isLoading,
  onRetry,
  profile,
  selectedUserId,
}: {
  error: Error | null;
  isError: boolean;
  isLoading: boolean;
  onRetry: () => void;
  profile: ModerationUserProfile | null;
  selectedUserId: string;
}) {
  if (!selectedUserId) {
    return (
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        选择用户后显示社区画像。
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className="mt-4">
        <LoadingState rows={4} />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="无法加载用户画像"
        description={getErrorDescription(error)}
        action={
          <Button variant="ghost" size="sm" onClick={onRetry}>
            重试
          </Button>
        }
      />
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="mt-4 border border-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusToken tone={getProfileStatusTone(profile.status)}>
          {formatProfileStatus(profile.status)}
        </StatusToken>
        {profile.is_banned ? <StatusToken tone="danger">已封禁</StatusToken> : null}
        {profile.is_muted ? <StatusToken tone="warning">已禁言</StatusToken> : null}
        {profile.is_approved ? (
          <StatusToken tone="success">批准用户</StatusToken>
        ) : null}
      </div>
      <h4 className="mt-3 text-base font-semibold">
        {profile.display_name || profile.username}
      </h4>
      <p className="mt-1 font-mono text-xs text-muted-foreground">
        @{profile.username} · {profile.user_id.slice(0, 8)}
      </p>
      {profile.headline ? (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {profile.headline}
        </p>
      ) : null}
      <div className="mt-4 grid grid-cols-2 border-t border-border sm:grid-cols-4">
        <ProfileMetricCell label="帖子" value={profile.post_count} />
        <ProfileMetricCell label="评论" value={profile.comment_count} />
        <ProfileMetricCell label="举报" value={profile.report_count} />
        <ProfileMetricCell label="移除" value={profile.removed_count} />
      </div>
    </div>
  );
}

function ModeratorNotesList({
  error,
  isError,
  isLoading,
  notes,
  onRetry,
  selectedUserId,
  slug,
}: {
  error: Error | null;
  isError: boolean;
  isLoading: boolean;
  notes: ModeratorNote[];
  onRetry: () => void;
  selectedUserId: string;
  slug: string;
}) {
  if (!selectedUserId) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="mt-4">
        <LoadingState rows={3} />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="无法加载 Mod Notes"
        description={getErrorDescription(error)}
        action={
          <Button variant="ghost" size="sm" onClick={onRetry}>
            重试
          </Button>
        }
      />
    );
  }

  if (notes.length === 0) {
    return (
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        暂无 Mod Note。
      </p>
    );
  }

  return (
    <div className="mt-4 divide-y divide-border border-t border-border">
      {notes.map((note, index) => (
        <ModeratorNoteRow
          index={index + 1}
          key={note.id}
          note={note}
          slug={slug}
        />
      ))}
    </div>
  );
}

function ModeratorNoteRow({
  index,
  note,
  slug,
}: {
  index: number;
  note: ModeratorNote;
  slug: string;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const mutation = useDeleteCommunityModeratorNoteMutation();

  async function submitDelete() {
    await mutation.mutateAsync({
      note_id: note.id,
      slug,
      user_id: note.user_id,
    });
    setConfirmOpen(false);
  }

  return (
    <div className="grid gap-3 py-4 lg:grid-cols-[minmax(0,1fr)_auto]">
      <IndexedInfoRow
        className="border-b-0 py-0"
        index={String(index).padStart(2, "0")}
        title={formatDateTime(note.created_at)}
        text={note.body}
      />
      <div className="flex flex-wrap items-start gap-2 lg:justify-end">
        <StatusToken>作者 {note.author_id.slice(0, 8)}</StatusToken>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={mutation.isPending}
          onClick={() => setConfirmOpen(true)}
        >
          删除
        </Button>
      </div>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除 Mod Note</DialogTitle>
            <DialogDescription>
              该操作会删除这条社区 Mod Note，并写入社区 Mod Log。
            </DialogDescription>
          </DialogHeader>
          {mutation.error ? (
            <Alert variant="destructive">
              <AlertTitle>删除失败</AlertTitle>
              <AlertDescription>{getErrorDescription(mutation.error)}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={mutation.isPending}
              onClick={() => setConfirmOpen(false)}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={mutation.isPending}
              onClick={submitDelete}
            >
              {mutation.isPending ? "提交中..." : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProfileMetricCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-b border-r border-border px-3 py-3 last:border-r-0 sm:border-b-0">
      <div className="font-mono text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 text-base font-semibold text-foreground">{value}</div>
    </div>
  );
}

function ManageModerationTemplatePanel({
  canEdit,
  emptyText,
  kind,
  query,
  slug,
  templates,
  title,
}: {
  canEdit: boolean;
  emptyText: string;
  kind: "removal-reasons" | "saved-responses";
  query: QueryPreviewState;
  slug: string;
  templates: CommunityModerationTemplate[];
  title: string;
}) {
  const [editingTemplate, setEditingTemplate] =
    useState<CommunityModerationTemplate | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <section className="min-w-0 border-b border-border py-5 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {kind === "removal-reasons"
              ? "移除内容时可选择原因模板，并决定是否通知作者。"
              : "保存常用回复，供管理团队沟通和后续 Modmail 接入复用。"}
          </p>
        </div>
        {canEdit ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditingTemplate(null);
              setDialogOpen(true);
            }}
          >
            新增
          </Button>
        ) : (
          <StatusToken>只读</StatusToken>
        )}
      </div>

      {query.isLoading ? <LoadingState rows={3} /> : null}
      {query.isError ? (
        <ErrorState
          title={`无法加载${title}`}
          description="请稍后重试。"
          action={
            <Button variant="ghost" size="sm" onClick={() => query.refetch()}>
              重试
            </Button>
          }
        />
      ) : null}
      {!query.isLoading && !query.isError && templates.length === 0 ? (
        <p className="py-4 text-sm leading-6 text-muted-foreground">{emptyText}</p>
      ) : null}
      {!query.isLoading && !query.isError && templates.length > 0 ? (
        <div className="mt-4 divide-y divide-border border-t border-border">
          {templates.map((template, index) => (
            <ModerationTemplateRow
              canEdit={canEdit}
              index={index + 1}
              key={template.id}
              kind={kind}
              onEdit={() => {
                setEditingTemplate(template);
                setDialogOpen(true);
              }}
              slug={slug}
              template={template}
            />
          ))}
        </div>
      ) : null}

      {dialogOpen ? (
        <ModerationTemplateDialog
          kind={kind}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          slug={slug}
          template={editingTemplate}
        />
      ) : null}
    </section>
  );
}

function ModerationTemplateRow({
  canEdit,
  index,
  kind,
  onEdit,
  slug,
  template,
}: {
  canEdit: boolean;
  index: number;
  kind: "removal-reasons" | "saved-responses";
  onEdit: () => void;
  slug: string;
  template: CommunityModerationTemplate;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const mutation = useDeleteCommunityModerationTemplateMutation();

  async function submitDelete() {
    await mutation.mutateAsync({ kind, slug, template_id: template.id });
    setDeleteOpen(false);
  }

  return (
    <div className="grid gap-3 py-4 lg:grid-cols-[minmax(0,1fr)_auto]">
      <IndexedInfoRow
        className="border-b-0 py-0"
        index={String(index).padStart(2, "0")}
        title={template.title}
        text={template.body || "未填写正文。"}
      />
      <div className="flex flex-wrap items-start gap-2 lg:justify-end">
        <StatusToken tone={template.is_active ? "success" : "default"}>
          {template.is_active ? "可用" : "停用"}
        </StatusToken>
        {template.rule_id ? <StatusToken>规则 {template.rule_id}</StatusToken> : null}
        {canEdit ? (
          <>
            <Button type="button" size="sm" variant="ghost" onClick={onEdit}>
              编辑
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={mutation.isPending}
              onClick={() => setDeleteOpen(true)}
            >
              删除
            </Button>
          </>
        ) : null}
      </div>
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除{formatTemplateKind(kind)}</DialogTitle>
            <DialogDescription>
              删除后历史引用仍由后端保留，但这个模板不会再作为可用项展示。
            </DialogDescription>
          </DialogHeader>
          {mutation.error ? (
            <Alert variant="destructive">
              <AlertTitle>删除失败</AlertTitle>
              <AlertDescription>{getErrorDescription(mutation.error)}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={mutation.isPending}
              onClick={() => setDeleteOpen(false)}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={mutation.isPending}
              onClick={submitDelete}
            >
              {mutation.isPending ? "提交中..." : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ModerationTemplateDialog({
  kind,
  onOpenChange,
  open,
  slug,
  template,
}: {
  kind: "removal-reasons" | "saved-responses";
  onOpenChange: (open: boolean) => void;
  open: boolean;
  slug: string;
  template: CommunityModerationTemplate | null;
}) {
  const [title, setTitle] = useState(template?.title ?? "");
  const [body, setBody] = useState(template?.body ?? "");
  const [ruleId, setRuleId] = useState(template?.rule_id ?? "");
  const [position, setPosition] = useState(String(template?.position ?? 1));
  const [formError, setFormError] = useState<string | null>(null);
  const createMutation = useCreateCommunityModerationTemplateMutation();
  const updateMutation = useUpdateCommunityModerationTemplateMutation();
  const mutation = template ? updateMutation : createMutation;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsedPosition = Number(position);

    if (!title.trim()) {
      setFormError("请输入标题。");
      return;
    }

    if (!Number.isInteger(parsedPosition) || parsedPosition < 0) {
      setFormError("顺序必须是 0 或更大的整数。");
      return;
    }

    const input = {
      body,
      kind,
      position: parsedPosition,
      rule_id: ruleId.trim(),
      slug,
      title: title.trim(),
    };

    if (template) {
      await updateMutation.mutateAsync({ ...input, template_id: template.id });
    } else {
      await createMutation.mutateAsync(input);
    }

    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {template ? "编辑" : "新增"}{formatTemplateKind(kind)}
          </DialogTitle>
          <DialogDescription>
            模板会保存在当前社区，供社区管理团队处理内容或沟通时复用。
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={submit}>
          <div className="space-y-2">
            <label className="text-xs font-semibold" htmlFor={`${kind}-title`}>
              标题
            </label>
            <Input
              id={`${kind}-title`}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={mutation.isPending}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold" htmlFor={`${kind}-body`}>
              正文
            </label>
            <Textarea
              id={`${kind}-body`}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              disabled={mutation.isPending}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
            <div className="space-y-2">
              <label className="text-xs font-semibold" htmlFor={`${kind}-rule`}>
                关联规则 ID
              </label>
              <Input
                id={`${kind}-rule`}
                value={ruleId}
                onChange={(event) => setRuleId(event.target.value)}
                disabled={mutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <label
                className="text-xs font-semibold"
                htmlFor={`${kind}-position`}
              >
                顺序
              </label>
              <Input
                id={`${kind}-position`}
                value={position}
                onChange={(event) => setPosition(event.target.value)}
                disabled={mutation.isPending}
                inputMode="numeric"
              />
            </div>
          </div>
          {formError || mutation.error ? (
            <Alert variant="destructive">
              <AlertTitle>保存失败</AlertTitle>
              <AlertDescription>
                {formError ?? getErrorDescription(mutation.error)}
              </AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={mutation.isPending}
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "提交中..." : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ManageModLogPanel({
  filters,
  logs,
  onFiltersChange,
  onOffsetChange,
  query,
}: {
  filters: ModLogFilters;
  logs: CommunityModLog[];
  onFiltersChange: (filters: ModLogFilters) => void;
  onOffsetChange: (offset: number) => void;
  query: QueryPreviewState;
}) {
  const [draftFilters, setDraftFilters] = useState(filters);
  const offset = query.offset ?? 0;
  const nextOffset = query.nextOffset ?? offset + MANAGE_PAGE_SIZE;
  const activeFilterCount = [
    filters.action,
    filters.actorId,
    filters.targetId,
    filters.targetType,
  ].filter(Boolean).length;

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onFiltersChange({
      action: draftFilters.action.trim(),
      actorId: draftFilters.actorId.trim(),
      targetId: draftFilters.targetId.trim(),
      targetType: draftFilters.targetType.trim(),
    });
  }

  function clearFilters() {
    const nextFilters = {
      action: "",
      actorId: "",
      targetId: "",
      targetType: "",
    };
    setDraftFilters(nextFilters);
    onFiltersChange(nextFilters);
  }

  return (
    <section className="border-b border-border py-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileClock className="size-4 text-primary" aria-hidden="true" />
            <h3 className="text-sm font-semibold">社区 Mod Log</h3>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            展示本社区最近审核、用户治理和模板变更，便于操作后回看。
          </p>
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={() => query.refetch()}>
          刷新
        </Button>
      </div>

      <form
        className="mt-4 grid gap-3 border-y border-border py-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
        onSubmit={submitFilters}
      >
        <div className="space-y-2">
          <label className="text-xs font-semibold" htmlFor="mod-log-action">
            动作
          </label>
          <Input
            id="mod-log-action"
            value={draftFilters.action}
            onChange={(event) =>
              setDraftFilters((current) => ({
                ...current,
                action: event.target.value,
              }))
            }
            placeholder="remove / approve"
            disabled={query.isLoading}
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold" htmlFor="mod-log-actor">
            操作者 ID
          </label>
          <Input
            id="mod-log-actor"
            value={draftFilters.actorId}
            onChange={(event) =>
              setDraftFilters((current) => ({
                ...current,
                actorId: event.target.value,
              }))
            }
            placeholder="用户 ID"
            disabled={query.isLoading}
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold" htmlFor="mod-log-target-type">
            目标类型
          </label>
          <Input
            id="mod-log-target-type"
            value={draftFilters.targetType}
            onChange={(event) =>
              setDraftFilters((current) => ({
                ...current,
                targetType: event.target.value,
              }))
            }
            placeholder="post / comment"
            disabled={query.isLoading}
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold" htmlFor="mod-log-target-id">
            目标 ID
          </label>
          <Input
            id="mod-log-target-id"
            value={draftFilters.targetId}
            onChange={(event) =>
              setDraftFilters((current) => ({
                ...current,
                targetId: event.target.value,
              }))
            }
            placeholder="资源 ID"
            disabled={query.isLoading}
          />
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit" size="sm" disabled={query.isLoading}>
            <Search className="size-4" aria-hidden="true" />
            筛选
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={query.isLoading || activeFilterCount === 0}
            onClick={clearFilters}
          >
            <X className="size-4" aria-hidden="true" />
            清空
          </Button>
        </div>
      </form>

      {activeFilterCount > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusToken tone="primary">筛选 {activeFilterCount}</StatusToken>
          {filters.action ? <StatusToken>动作 {filters.action}</StatusToken> : null}
          {filters.actorId ? (
            <StatusToken>操作者 {formatShortId(filters.actorId)}</StatusToken>
          ) : null}
          {filters.targetType ? <StatusToken>{filters.targetType}</StatusToken> : null}
          {filters.targetId ? (
            <StatusToken>目标 {formatShortId(filters.targetId)}</StatusToken>
          ) : null}
        </div>
      ) : null}

      {query.isLoading ? <LoadingState rows={5} /> : null}
      {query.isError ? (
        <ErrorState
          title="无法加载 Mod Log"
          description="请稍后重试。"
          action={
            <Button variant="ghost" size="sm" onClick={() => query.refetch()}>
              重试
            </Button>
          }
        />
      ) : null}
      {!query.isLoading && !query.isError && logs.length === 0 ? (
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          {activeFilterCount > 0 || offset > 0
            ? "当前筛选或 offset 下没有社区操作日志。"
            : "暂无社区操作日志。"}
        </p>
      ) : null}
      {!query.isLoading && !query.isError && logs.length > 0 ? (
        <div className="mt-4 divide-y divide-border border-t border-border">
          {logs.map((log, index) => (
            <div
              key={log.id}
              className="grid gap-3 py-4 lg:grid-cols-[minmax(0,1fr)_auto]"
            >
              <IndexedInfoRow
                className="border-b-0 py-0"
                index={String(offset + index + 1).padStart(2, "0")}
                title={formatModAction(log.action)}
                text={`${formatTargetType(log.target_type)} ${log.target_id}`}
              />
              <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                <StatusToken>{formatDateTime(log.created_at)}</StatusToken>
                {log.batch_id ? <StatusToken>批量 {log.batch_id}</StatusToken> : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {!query.isLoading && !query.isError && (logs.length > 0 || offset > 0) ? (
        <ManagePagination
          hasMore={query.hasMore ?? false}
          isFetching={query.isFetching ?? false}
          nextOffset={nextOffset}
          offset={offset}
          onOffsetChange={onOffsetChange}
        />
      ) : null}
    </section>
  );
}

function ManageContentRow({
  action,
  index,
  selection,
  text,
  title,
}: {
  action?: ReactNode;
  index: string;
  selection?: ReactNode;
  text: string;
  title: string;
}) {
  return (
    <div
      className={`grid gap-3 border-b border-border py-4 last:border-b-0 ${
        selection ? "grid-cols-[auto_minmax(0,1fr)]" : "grid-cols-1"
      }`}
    >
      {selection ? <div className="flex items-start pt-0.5">{selection}</div> : null}
      <div className="min-w-0">
        <IndexedInfoRow
          className="grid-cols-[40px_minmax(0,1fr)] border-b-0 py-0"
          index={index}
          title={title}
          text={text}
        />
        {action ? (
          <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
            {action}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ManageMemberGovernance({
  canManageModerators,
  memberCount,
  members,
  slug,
}: {
  canManageModerators: boolean;
  memberCount?: number;
  members: CommunityMember[];
  slug: string;
}) {
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const appointMutation = useAppointCommunityModeratorMutation();
  const moderatorCount = members.filter(
    (member) => member.role === "moderator" && member.status === "active",
  ).length;
  const moderatorLimit = getModeratorLimit(memberCount);
  const remainingModerators = Math.max(0, moderatorLimit - moderatorCount);
  const canAddModerator = canManageModerators && remainingModerators > 0;

  async function appointModerator() {
    setMessage(null);
    setError(null);

    if (!username.trim()) {
      setError("请输入要任命为社区管理员的用户名。");
      return;
    }

    try {
      await appointMutation.mutateAsync({
        slug,
        username: username.trim(),
      });
      setMessage(`已提交社区管理员任命：@${username.trim()}。`);
      setUsername("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "社区管理员任命失败。");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusToken tone={remainingModerators > 0 ? "primary" : "warning"}>
          社区管理员 {moderatorCount}/{moderatorLimit}
        </StatusToken>
        <span className="text-xs text-muted-foreground">
          {remainingModerators > 0
            ? `还可添加 ${remainingModerators} 位社区管理员`
            : "已达到当前成员规模上限"}
        </span>
      </div>

      {message ? (
        <Alert variant="success">
          <AlertTitle>操作已提交</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>操作失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {members.length === 0 ? (
        <p className="text-sm leading-6 text-muted-foreground">暂无成员记录。</p>
      ) : (
        <div>
          {members.map((member, index) => (
            <ManageMemberRow
              canManageModerators={canManageModerators}
              index={index}
              key={member.user.id}
              member={member}
              slug={slug}
            />
          ))}
        </div>
      )}

      {canManageModerators ? (
        <div className="space-y-4 border-t border-border pt-4">
          <section className="space-y-3">
            <div>
              <h4 className="text-sm font-semibold">任命社区管理员</h4>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                社区管理员可以处理社区内举报和内容处置，不能任命其他社区管理员。
              </p>
            </div>
            <Input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="用户名，不含 @"
              disabled={!canAddModerator || appointMutation.isPending}
              aria-label="社区管理员用户名"
            />
            <Button
              type="button"
              size="sm"
              className="h-auto min-h-9 whitespace-normal text-left"
              disabled={!canAddModerator || appointMutation.isPending}
              onClick={appointModerator}
            >
              {appointMutation.isPending ? "提交中..." : "任命社区管理员"}
            </Button>
          </section>
        </div>
      ) : (
        <p className="border-t border-border pt-3 text-xs leading-5 text-muted-foreground">
          当前账号不是社区版主，不能任命社区管理员。
        </p>
      )}
    </div>
  );
}

function ManageOwnerTransferPanel({
  canCreateOwnerTransfer,
  community,
  hasPlatformOwnerOverride,
  slug,
}: {
  canCreateOwnerTransfer: boolean;
  community: Community;
  hasPlatformOwnerOverride: boolean;
  slug: string;
}) {
  const [transferUsername, setTransferUsername] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const transferQuery = useCommunityOwnerTransferQuery(
    { slug },
    canCreateOwnerTransfer || hasPlatformOwnerOverride,
  );
  const transferMutation = useCreateCommunityOwnerTransferMutation();
  const cancelMutation = useCancelCommunityOwnerTransferMutation();
  const transfer = transferQuery.data?.transfer ?? null;
  const pendingTransfer = transfer?.status === "pending" ? transfer : null;
  const acceptHref = pendingTransfer
    ? `/communities/${encodeURIComponent(slug)}/owner-transfer/${pendingTransfer.id}/accept`
    : "";

  async function createOwnerTransfer() {
    setMessage(null);
    setError(null);
    setCopyMessage(null);

    if (!transferUsername.trim()) {
      setError("请输入新版主的用户名。");
      return;
    }

    try {
      const result = await transferMutation.mutateAsync({
        slug,
        username: transferUsername.trim(),
      });

      setTransferUsername("");
      setMessage(`已创建交接给 @${getTransferTargetLabel(result.transfer)}。`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "版主交接创建失败。");
    }
  }

  async function cancelOwnerTransfer() {
    if (!pendingTransfer) {
      return;
    }

    setMessage(null);
    setError(null);
    setCopyMessage(null);

    try {
      await cancelMutation.mutateAsync({
        slug,
        transfer_id: pendingTransfer.id,
      });
      setCancelOpen(false);
      setMessage("已取消待接受的版主交接。");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "版主交接取消失败。");
    }
  }

  async function copyAcceptLink() {
    setCopyMessage(null);

    if (!acceptHref) {
      return;
    }

    const absoluteUrl = `${window.location.origin}${acceptHref}`;

    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopyMessage("接受链接已复制。");
    } catch {
      setCopyMessage("浏览器不允许自动复制，请打开链接后手动复制地址。");
    }
  }

  return (
    <div className="space-y-4">
      {message ? (
        <Alert variant="success">
          <AlertTitle>操作已提交</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      {error || transferQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>版主交接状态不可用</AlertTitle>
          <AlertDescription>
            {error ?? getErrorDescription(transferQuery.error)}
          </AlertDescription>
        </Alert>
      ) : null}

      {copyMessage ? (
        <Alert>
          <AlertTitle>链接状态</AlertTitle>
          <AlertDescription>{copyMessage}</AlertDescription>
        </Alert>
      ) : null}

      <section className="space-y-3">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h4 className="text-sm font-semibold">社区版主交接</h4>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              真实社区版主创建交接后，目标账号必须打开接受链接确认。
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto min-h-9 whitespace-normal text-left"
            disabled={transferQuery.isFetching}
            onClick={() => transferQuery.refetch()}
          >
            <RefreshCw
              className={
                transferQuery.isFetching ? "size-4 animate-spin" : "size-4"
              }
              aria-hidden="true"
            />
            刷新交接
          </Button>
        </div>

        {transferQuery.isLoading ? <LoadingState rows={2} /> : null}

        {pendingTransfer ? (
          <div className="min-w-0 border-y border-border py-3">
            <div className="grid gap-3 md:grid-cols-2">
              <TransferFact label="状态" value={formatTransferStatus(pendingTransfer.status)} />
              <TransferFact label="新版主" value={`@${getTransferTargetLabel(pendingTransfer)}`} />
              <TransferFact label="创建" value={formatDateTime(pendingTransfer.created_at)} />
              <TransferFact
                label="过期"
                value={
                  pendingTransfer.expires_at
                    ? formatDateTime(pendingTransfer.expires_at)
                    : "以后端返回为准"
                }
              />
              <TransferFact label="交接编号" value={pendingTransfer.id} />
              <TransferFact label="接受链接" value={acceptHref} />
            </div>
            <ResponsiveActionRow className="mt-3">
              <Button
                type="button"
                size="sm"
                className="h-auto min-h-9 whitespace-normal text-left"
                onClick={copyAcceptLink}
              >
                <Copy className="size-4" aria-hidden="true" />
                复制接受链接
              </Button>
              <TextAction href={acceptHref} tone="primary">
                <ExternalLink className="size-4" aria-hidden="true" />
                打开接受页
              </TextAction>
              <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto min-h-9 whitespace-normal text-left"
                  disabled={cancelMutation.isPending}
                  onClick={() => setCancelOpen(true)}
                >
                  取消交接
                </Button>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>取消版主交接</DialogTitle>
                    <DialogDescription>
                      取消后，当前接受链接会失效；需要更换版主时必须重新创建交接。
                    </DialogDescription>
                  </DialogHeader>
                  {cancelMutation.error ? (
                    <Alert variant="destructive">
                      <AlertTitle>取消失败</AlertTitle>
                      <AlertDescription>
                        {getErrorDescription(cancelMutation.error)}
                      </AlertDescription>
                    </Alert>
                  ) : null}
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={cancelMutation.isPending}
                      onClick={() => setCancelOpen(false)}
                    >
                      保留交接
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={cancelMutation.isPending}
                      onClick={cancelOwnerTransfer}
                    >
                      {cancelMutation.isPending ? "提交中..." : "确认取消"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </ResponsiveActionRow>
          </div>
        ) : (
          <p className="border-y border-border py-3 text-sm leading-6 text-muted-foreground">
            当前没有待接受的版主交接。
          </p>
        )}

        {canCreateOwnerTransfer ? (
          <div className="space-y-3 border-t border-border pt-4">
            <Input
              value={transferUsername}
              onChange={(event) => setTransferUsername(event.target.value)}
              placeholder="新版主用户名，不含 @"
              disabled={transferMutation.isPending || Boolean(pendingTransfer)}
              aria-label="新版主用户名"
            />
            <Button
              type="button"
              size="sm"
              className="h-auto min-h-9 whitespace-normal text-left"
              disabled={transferMutation.isPending || Boolean(pendingTransfer)}
              onClick={createOwnerTransfer}
            >
              {transferMutation.isPending ? "提交中..." : "创建版主交接"}
            </Button>
          </div>
        ) : (
          <p className="border-t border-border pt-3 text-xs leading-5 text-muted-foreground">
            当前账号不是真实社区版主，不能发起普通版主交接。
          </p>
        )}
      </section>

      {hasPlatformOwnerOverride ? (
        <PlatformOwnerTakeoverPanel community={community} />
      ) : null}
    </div>
  );
}

function PlatformOwnerTakeoverPanel({ community }: { community: Community }) {
  const [query, setQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const usersQuery = useAdminUsersQuery(
    {
      limit: 5,
      offset: 0,
      q: query.trim(),
    },
    query.trim().length > 0,
  );
  const takeoverMutation = useUpdateAdminCommunityOwnerMutation();
  const users = usersQuery.data?.users ?? [];

  async function submitTakeover() {
    setMessage(null);
    setFormError(null);

    if (!selectedUser) {
      setFormError("请先从搜索结果中选择新版主。");
      return;
    }

    if (!reason.trim()) {
      setFormError("请输入平台接管原因。");
      return;
    }

    if (!confirmed) {
      setFormError("请确认这是平台 owner 异常接管，不是普通版主交接。");
      return;
    }

    try {
      const result = await takeoverMutation.mutateAsync({
        id: community.id,
        input: {
          reason: reason.trim(),
          user_id: selectedUser.id,
        },
      });

      setMessage(`/${result.community.slug} 的版主已更新为 @${result.owner.username}。`);
      setSelectedUser(null);
      setQuery("");
      setReason("");
      setConfirmed(false);
    } catch (caught) {
      setFormError(getOwnerTakeoverErrorDescription(caught));
    }
  }

  return (
    <section className="space-y-3 border-t border-border pt-4">
      <div>
        <h4 className="text-sm font-semibold">平台接管更换版主</h4>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          仅用于异常社区治理。普通交接仍应由真实社区版主创建，并由目标账号接受。
        </p>
      </div>

      {message ? (
        <Alert variant="success">
          <AlertTitle>版主已更新</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      {formError ? (
        <Alert variant="destructive">
          <AlertTitle>接管失败</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <label className="text-xs font-semibold text-foreground" htmlFor="owner-takeover-user">
          搜索新版主
        </label>
        <Input
          id="owner-takeover-user"
          value={query}
          disabled={takeoverMutation.isPending}
          placeholder="输入用户名"
          onChange={(event) => {
            setQuery(event.target.value);
            setSelectedUser(null);
          }}
        />
        {usersQuery.isFetching ? (
          <p className="text-xs leading-5 text-muted-foreground">正在搜索用户...</p>
        ) : null}
        {usersQuery.isError ? (
          <p className="text-xs leading-5 text-destructive">
            {getErrorDescription(usersQuery.error)}
          </p>
        ) : null}
        {users.length > 0 ? (
          <div className="border-y border-border">
            {users.map((user) => {
              const active = selectedUser?.id === user.id;

              return (
                <button
                  key={user.id}
                  type="button"
                  className={`grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-border py-3 text-left text-sm last:border-b-0 ${
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                  disabled={takeoverMutation.isPending}
                  onClick={() => setSelectedUser(user)}
                >
                  <span className="min-w-0">
                    <span className="block break-words font-semibold text-foreground [overflow-wrap:anywhere]">
                      @{user.username}
                    </span>
                    <span className="mt-1 block break-words font-mono text-xs [overflow-wrap:anywhere]">
                      {user.id}
                    </span>
                  </span>
                  <StatusToken tone={active ? "primary" : "default"}>
                    {active ? "已选择" : formatPlatformStatus(user.status)}
                  </StatusToken>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-foreground" htmlFor="owner-takeover-reason">
          接管原因
        </label>
        <Textarea
          id="owner-takeover-reason"
          value={reason}
          disabled={takeoverMutation.isPending}
          placeholder="说明为什么需要平台侧异常接管"
          className="min-h-24 border-border bg-background"
          onChange={(event) => setReason(event.target.value)}
        />
      </div>

      <label className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
        <input
          type="checkbox"
          className="mt-0.5 size-4 accent-primary"
          checked={confirmed}
          disabled={takeoverMutation.isPending}
          onChange={(event) => setConfirmed(event.target.checked)}
        />
        <span>
          我确认这是平台 owner 异常接管，会直接替换真实社区版主，并应写入平台管理审计。
        </span>
      </label>

      <Button
        type="button"
        size="sm"
        variant="destructive"
        className="h-auto min-h-9 whitespace-normal text-left"
        disabled={takeoverMutation.isPending}
        onClick={submitTakeover}
      >
        {takeoverMutation.isPending ? "提交中..." : "确认接管版主"}
      </Button>
    </section>
  );
}

function TransferFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-b border-border pb-3 last:border-b-0 md:last:border-b md:[&:nth-last-child(-n+2)]:border-b-0">
      <div className="font-mono text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 break-words text-sm text-foreground [overflow-wrap:anywhere]">
        {value}
      </div>
    </div>
  );
}

function ResponsiveActionRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex min-w-0 flex-wrap items-center gap-2 ${className ?? ""}`}>
      {children}
    </div>
  );
}

function ManageMemberRow({
  canManageModerators,
  index,
  member,
  slug,
}: {
  canManageModerators: boolean;
  index: number;
  member: CommunityMember;
  slug: string;
}) {
  const [open, setOpen] = useState(false);
  const mutation = useRemoveCommunityModeratorMutation();
  const canRemoveModerator =
    canManageModerators && member.role === "moderator" && member.status === "active";

  async function removeModerator() {
    await mutation.mutateAsync({
      slug,
      user_id: member.user.id,
    });
    setOpen(false);
  }

  return (
    <div className="grid gap-3 border-b border-border py-4 last:border-b-0 lg:grid-cols-[minmax(0,1fr)_auto]">
      <IndexedInfoRow
        className="border-b-0 py-0"
        index={String(index + 1).padStart(2, "0")}
        title={formatMemberName(member)}
        text={`${formatViewerRole(member.role)} / ${formatMemberStatus(member.status)} / 加入于 ${formatDate(member.created_at)}`}
      />
      {canRemoveModerator ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={mutation.isPending}
            onClick={() => setOpen(true)}
          >
            取消社区管理员
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>取消社区管理员</DialogTitle>
              <DialogDescription>
                将 @{member.user.username} 从社区管理员降为普通成员。后端会写入社区治理审计。
              </DialogDescription>
            </DialogHeader>
            {mutation.error ? (
              <Alert variant="destructive">
                <AlertTitle>取消失败</AlertTitle>
                <AlertDescription>{getErrorDescription(mutation.error)}</AlertDescription>
              </Alert>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                disabled={mutation.isPending}
                onClick={() => setOpen(false)}
              >
                保留
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={mutation.isPending}
                onClick={removeModerator}
              >
                {mutation.isPending ? "提交中..." : "确认取消"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

function ManageSettingsEditor({
  canEdit,
  settings,
  slug,
}: {
  canEdit: boolean;
  settings: CommunityManageSettings;
  slug: string;
}) {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const updateSettingsMutation = useUpdateCommunityManageSettingsMutation();
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      description: settings.description,
      name: settings.name,
    },
  });
  const nameValue = useWatch({ control: form.control, name: "name" }) ?? "";
  const descriptionValue =
    useWatch({ control: form.control, name: "description" }) ?? "";
  const submitError = updateSettingsMutation.error
    ? getErrorDescription(updateSettingsMutation.error)
    : null;
  const isSaving = updateSettingsMutation.isPending;

  useEffect(() => {
    form.reset({
      description: settings.description,
      name: settings.name,
    });
  }, [form, settings.description, settings.name]);

  async function handleSubmit(values: SettingsFormValues) {
    setSuccessMessage(null);

    try {
      const result = await updateSettingsMutation.mutateAsync({
        description: values.description,
        name: values.name,
        slug,
      });
      form.reset({
        description: result.settings.description,
        name: result.settings.name,
      });
      setSuccessMessage("社区资料已保存。");
    } catch {
      // Mutation state drives the visible error alert.
    }
  }

  async function saveMediaUrl(kind: "avatar" | "banner", url: string) {
    setSuccessMessage(null);
    updateSettingsMutation.reset();

    const result = await updateSettingsMutation.mutateAsync({
      [kind === "avatar" ? "avatar_url" : "banner_url"]: url,
      slug,
    });

    form.reset({
      description: result.settings.description,
      name: result.settings.name,
    });
    setSuccessMessage(kind === "avatar" ? "社区头像已保存。" : "社区背景图已保存。");

    return result;
  }

  if (!canEdit) {
    return (
      <div className="space-y-3">
        <CommunityMediaPreview settings={settings} />
        <dl className="space-y-3 border-t border-border pt-3 text-sm">
          <SettingsReadOnlyRow label="名称" value={settings.name || "--"} />
          <SettingsReadOnlyRow
            label="简介"
            value={settings.description || "暂无简介"}
          />
          <SettingsReadOnlyRow
            label="头像 URL"
            value={settings.avatar_url || "未设置"}
          />
          <SettingsReadOnlyRow
            label="横幅 URL"
            value={settings.banner_url || "未设置"}
          />
          <SettingsReadOnlyRow
            label="更新"
            value={formatDate(settings.updated_at)}
          />
        </dl>
        <p className="text-xs leading-5 text-muted-foreground">
          只有社区版主或平台 owner 覆盖可以修改名称、简介、头像和背景图；社区管理员可以查看资料和维护规则。
        </p>
      </div>
    );
  }

  return (
    <form className="space-y-3" onSubmit={form.handleSubmit(handleSubmit)}>
      {submitError ? (
        <Alert variant="destructive">
          <AlertTitle>资料保存失败</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}

      {successMessage ? (
        <Alert variant="success">
          <AlertTitle>资料已更新</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      ) : null}

      <CommunityMediaPreview
        actions={
          <ResponsiveActionRow>
            <ManagedMediaEditor
              altText={`${settings.name || slug} 的社区头像`}
              avatarFallback={<Hash className="size-9" aria-hidden="true" />}
              currentUrl={settings.avatar_url}
              displayName={settings.name || slug}
              entityLabel="社区"
              fileBaseName={`${slug}-avatar`}
              kind="avatar"
              triggerLabel={settings.avatar_url ? "更换头像" : "设置头像"}
              onSaveUrl={(url) => saveMediaUrl("avatar", url)}
            />
            <ManagedMediaEditor
              altText={`${settings.name || slug} 的社区背景图`}
              currentUrl={settings.banner_url}
              displayName={settings.name || slug}
              entityLabel="社区"
              fileBaseName={`${slug}-banner`}
              kind="banner"
              triggerLabel={settings.banner_url ? "更换背景图" : "设置背景图"}
              onSaveUrl={(url) => saveMediaUrl("banner", url)}
            />
          </ResponsiveActionRow>
        }
        settings={settings}
      />

      <div className="space-y-2">
        <label className="text-xs font-semibold text-foreground" htmlFor="manage-community-name">
          社区名称
        </label>
        <Input
          id="manage-community-name"
          disabled={isSaving}
          aria-invalid={Boolean(form.formState.errors.name)}
          placeholder="输入社区名称"
          className="border-border bg-background"
          {...form.register("name")}
        />
        <FieldMeta
          detail={`${nameValue.trim().length} 字`}
          error={form.formState.errors.name?.message}
          hint="名称会展示在社区详情和管理页。"
        />
      </div>

      <div className="space-y-2">
        <label
          className="text-xs font-semibold text-foreground"
          htmlFor="manage-community-description"
        >
          社区简介
        </label>
        <Textarea
          id="manage-community-description"
          disabled={isSaving}
          aria-invalid={Boolean(form.formState.errors.description)}
          placeholder="说明社区讨论范围和基本约定"
          className="min-h-28 border-border bg-background"
          {...form.register("description")}
        />
        <FieldMeta
          detail={`${descriptionValue.trim().length} 字`}
          error={form.formState.errors.description?.message}
          hint={`最近更新：${formatDate(settings.updated_at)}`}
        />
      </div>

      <Button
        type="submit"
        size="sm"
        className="h-auto min-h-9 whitespace-normal text-left"
        disabled={isSaving}
      >
        {isSaving ? "正在保存..." : "保存资料"}
      </Button>
    </form>
  );
}

function CommunityMediaPreview({
  actions,
  settings,
}: {
  actions?: ReactNode;
  settings: CommunityManageSettings;
}) {
  const displayName = settings.name || "社区";
  const avatarUrl = settings.avatar_url?.trim();
  const bannerUrl = settings.banner_url?.trim();

  return (
    <section className="min-w-0 overflow-hidden border-y border-border">
      <div className="relative aspect-[16/6] min-h-28 bg-background-soft">
        {bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bannerUrl}
            alt={`${displayName} 的社区背景图`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(45,212,191,0.14)_0_1px,transparent_1px_100%),linear-gradient(0deg,rgba(255,255,255,0.035)_0_1px,transparent_1px_100%)] bg-[size:24px_24px]" />
        )}
      </div>
      <div className="grid gap-3 border-t border-border p-3 sm:grid-cols-[72px_minmax(0,1fr)]">
        <div className="-mt-10 flex size-16 items-center justify-center overflow-hidden rounded-full border border-border bg-background text-primary">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={`${displayName} 的社区头像`}
              className="h-full w-full object-cover"
            />
          ) : (
            <Hash className="size-7" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0">
          <div className="break-words text-sm font-semibold text-foreground [overflow-wrap:anywhere]">
            {displayName}
          </div>
          <div className="mt-1 break-words font-mono text-xs text-muted-foreground [overflow-wrap:anywhere]">
            头像 {avatarUrl ? "已设置" : "未设置"} / 背景图{" "}
            {bannerUrl ? "已设置" : "未设置"}
          </div>
          {actions ? <div className="mt-3">{actions}</div> : null}
        </div>
      </div>
    </section>
  );
}

function SettingsReadOnlyRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="grid gap-1 border-b border-border pb-3 last:border-b-0 last:pb-0">
      <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm leading-6 text-foreground">{value}</dd>
    </div>
  );
}

function ManageRuleManager({
  canEdit,
  rules,
  slug,
}: {
  canEdit: boolean;
  rules: CommunityRule[];
  slug: string;
}) {
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [deleteRule, setDeleteRule] = useState<CommunityRule | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const deleteRuleMutation = useDeleteCommunityRuleMutation();
  const deleteError = deleteRuleMutation.error
    ? getErrorDescription(deleteRuleMutation.error)
    : null;

  async function confirmDeleteRule() {
    if (!deleteRule) {
      return;
    }

    setSuccessMessage(null);
    try {
      await deleteRuleMutation.mutateAsync({
        rule_id: deleteRule.id,
        slug,
      });
      setDeleteRule(null);
      setSuccessMessage("规则已删除。");
    } catch {
      // Mutation state drives the visible error alert.
    }
  }

  return (
    <div className="space-y-4">
      {successMessage ? (
        <Alert variant="success">
          <AlertTitle>规则已更新</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      ) : null}

      {canEdit ? (
        <CreateRuleForm
          nextPosition={getNextRulePosition(rules)}
          onCreated={(rule) => {
            setEditingRuleId(null);
            setSuccessMessage(`已新增规则「${rule.title}」。`);
          }}
          slug={slug}
        />
      ) : (
        <p className="text-sm leading-6 text-muted-foreground">
          当前账号可以查看社区规则，但不能维护规则。
        </p>
      )}

      {rules.length === 0 ? (
        <p className="text-sm leading-6 text-muted-foreground">
          暂无社区规则。
        </p>
      ) : (
        <div className="border-t border-border">
          {rules.map((rule) => {
            const isEditing = editingRuleId === rule.id;

            return (
              <div key={rule.id} className="py-3">
                {isEditing ? (
                  <RuleEditForm
                    onCancel={() => setEditingRuleId(null)}
                    onUpdated={(updatedRule) => {
                      setEditingRuleId(null);
                      setSuccessMessage(`已更新规则「${updatedRule.title}」。`);
                    }}
                    rule={rule}
                    slug={slug}
                  />
                ) : (
                  <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-3">
                    <span className="font-mono text-xs text-muted-foreground">
                      {String(rule.position).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="break-words text-sm font-semibold">
                            {rule.title}
                          </h4>
                          <p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-muted-foreground">
                            {rule.body || "暂无规则说明。"}
                          </p>
                        </div>
                        {canEdit ? (
                          <div className="flex shrink-0 flex-wrap items-center gap-3">
                            <button
                              type="button"
                              className="text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                              onClick={() => setEditingRuleId(rule.id)}
                            >
                              编辑
                            </button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => setDeleteRule(rule)}
                            >
                              删除
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog
        open={Boolean(deleteRule)}
        onOpenChange={(open) => !open && setDeleteRule(null)}
      >
        {deleteRule ? (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>删除社区规则</DialogTitle>
              <DialogDescription>
                删除后该规则会从社区规则列表移除，后端会校验当前账号是否仍有管理权限。
              </DialogDescription>
            </DialogHeader>

            {deleteError ? (
              <Alert variant="destructive">
                <AlertTitle>规则删除失败</AlertTitle>
                <AlertDescription>{deleteError}</AlertDescription>
              </Alert>
            ) : null}

            <div className="border-t border-border pt-3">
              <p className="text-sm font-semibold">{deleteRule.title}</p>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                {deleteRule.body || "暂无规则说明。"}
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                disabled={deleteRuleMutation.isPending}
                onClick={() => setDeleteRule(null)}
              >
                取消
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={deleteRuleMutation.isPending}
                onClick={confirmDeleteRule}
              >
                {deleteRuleMutation.isPending ? "正在删除..." : "确认删除"}
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}

function CreateRuleForm({
  nextPosition,
  onCreated,
  slug,
}: {
  nextPosition: number;
  onCreated: (rule: CommunityRule) => void;
  slug: string;
}) {
  const createRuleMutation = useCreateCommunityRuleMutation();
  const form = useForm<RuleFormValues>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      body: "",
      position: nextPosition,
      title: "",
    },
  });
  const titleValue = useWatch({ control: form.control, name: "title" }) ?? "";
  const bodyValue = useWatch({ control: form.control, name: "body" }) ?? "";
  const submitError = createRuleMutation.error
    ? getErrorDescription(createRuleMutation.error)
    : null;

  useEffect(() => {
    form.setValue("position", nextPosition, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });
  }, [form, nextPosition]);

  async function handleSubmit(values: RuleFormValues) {
    try {
      const result = await createRuleMutation.mutateAsync({
        body: values.body,
        position: values.position,
        slug,
        title: values.title,
      });
      form.reset({
        body: "",
        position: nextPosition + 1,
        title: "",
      });
      onCreated(result.rule);
    } catch {
      // Mutation state drives the visible error alert.
    }
  }

  return (
    <form
      className="space-y-3 border-t border-border pt-3"
      onSubmit={form.handleSubmit(handleSubmit)}
    >
      {submitError ? (
        <Alert variant="destructive">
          <AlertTitle>规则新增失败</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}

      <RuleFields
        bodyValue={bodyValue}
        disabled={createRuleMutation.isPending}
        form={form}
        idPrefix="create-community-rule"
        titleValue={titleValue}
      />

      <Button type="submit" size="sm" disabled={createRuleMutation.isPending}>
        {createRuleMutation.isPending ? "正在新增..." : "新增规则"}
      </Button>
    </form>
  );
}

function RuleEditForm({
  onCancel,
  onUpdated,
  rule,
  slug,
}: {
  onCancel: () => void;
  onUpdated: (rule: CommunityRule) => void;
  rule: CommunityRule;
  slug: string;
}) {
  const updateRuleMutation = useUpdateCommunityRuleMutation();
  const form = useForm<RuleFormValues>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      body: rule.body,
      position: rule.position,
      title: rule.title,
    },
  });
  const titleValue = useWatch({ control: form.control, name: "title" }) ?? "";
  const bodyValue = useWatch({ control: form.control, name: "body" }) ?? "";
  const submitError = updateRuleMutation.error
    ? getErrorDescription(updateRuleMutation.error)
    : null;

  useEffect(() => {
    form.reset({
      body: rule.body,
      position: rule.position,
      title: rule.title,
    });
  }, [form, rule.body, rule.position, rule.title]);

  async function handleSubmit(values: RuleFormValues) {
    try {
      const result = await updateRuleMutation.mutateAsync({
        body: values.body,
        position: values.position,
        rule_id: rule.id,
        slug,
        title: values.title,
      });
      onUpdated(result.rule);
    } catch {
      // Mutation state drives the visible error alert.
    }
  }

  return (
    <form className="space-y-3" onSubmit={form.handleSubmit(handleSubmit)}>
      {submitError ? (
        <Alert variant="destructive">
          <AlertTitle>规则更新失败</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}

      <RuleFields
        bodyValue={bodyValue}
        disabled={updateRuleMutation.isPending}
        form={form}
        idPrefix={`edit-community-rule-${rule.id}`}
        titleValue={titleValue}
      />

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={updateRuleMutation.isPending}>
          {updateRuleMutation.isPending ? "正在保存..." : "保存规则"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={updateRuleMutation.isPending}
          onClick={onCancel}
        >
          取消
        </Button>
      </div>
    </form>
  );
}

function RuleFields({
  bodyValue,
  disabled,
  form,
  idPrefix,
  titleValue,
}: {
  bodyValue: string;
  disabled: boolean;
  form: UseFormReturn<RuleFormValues>;
  idPrefix: string;
  titleValue: string;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label
          className="text-xs font-semibold text-foreground"
          htmlFor={`${idPrefix}-title`}
        >
          规则标题
        </label>
        <Input
          id={`${idPrefix}-title`}
          disabled={disabled}
          aria-invalid={Boolean(form.formState.errors.title)}
          placeholder="例如：保持讨论相关"
          className="border-border bg-background"
          {...form.register("title")}
        />
        <FieldMeta
          detail={`${titleValue.trim().length} 字`}
          error={form.formState.errors.title?.message}
          hint="标题会显示在规则列表中。"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-[96px_minmax(0,1fr)]">
        <div className="space-y-2">
          <label
            className="text-xs font-semibold text-foreground"
            htmlFor={`${idPrefix}-position`}
          >
            顺序
          </label>
          <Input
            id={`${idPrefix}-position`}
            type="number"
            min={0}
            step={1}
            disabled={disabled}
            aria-invalid={Boolean(form.formState.errors.position)}
            className="border-border bg-background"
            {...form.register("position", { valueAsNumber: true })}
          />
          <FieldMeta
            error={form.formState.errors.position?.message}
            hint="数字越小越靠前。"
          />
        </div>

        <div className="space-y-2">
          <label
            className="text-xs font-semibold text-foreground"
            htmlFor={`${idPrefix}-body`}
          >
            规则说明
          </label>
          <Textarea
            id={`${idPrefix}-body`}
            disabled={disabled}
            aria-invalid={Boolean(form.formState.errors.body)}
            placeholder="补充规则说明，可留空。"
            className="min-h-24 border-border bg-background"
            {...form.register("body")}
          />
          <FieldMeta
            detail={`${bodyValue.trim().length} 字`}
            error={form.formState.errors.body?.message}
            hint="说明用于解释规则边界。"
          />
        </div>
      </div>
    </div>
  );
}

function FieldMeta({
  detail,
  error,
  hint,
}: {
  detail?: string;
  error?: string;
  hint: string;
}) {
  return (
    <div className="flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:justify-between">
      <p className={error ? "text-destructive" : "text-muted-foreground"}>
        {error ?? hint}
      </p>
      {detail ? (
        <span className={error ? "font-mono text-destructive" : "font-mono text-muted-foreground"}>
          {detail}
        </span>
      ) : null}
    </div>
  );
}

function StatePanel({ children }: { children: ReactNode }) {
  return <div className="border-b border-border py-4">{children}</div>;
}

function isUnauthenticated(error: Error | null) {
  return error instanceof ApiError && error.code === "unauthenticated";
}

function isForbidden(error: Error | null) {
  return error instanceof ApiError && error.code === "forbidden";
}

function getManageErrorTitle(error: Error | null) {
  if (isUnauthenticated(error)) {
    return "需要登录";
  }

  if (isForbidden(error)) {
    return "需要社区权限";
  }

  return "无法加载社区管理";
}

function getManageErrorDescription(
  error: Error | null,
  context: {
    community?: Community;
    platformRole: PlatformRole | null;
    platformRoleIsInferred: boolean;
  },
) {
  if (isForbidden(error)) {
    return formatCommunityManageForbiddenDescription(context);
  }

  return getErrorDescription(error);
}

function getErrorDescription(error: Error | null) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}

function getOwnerTakeoverErrorDescription(error: unknown) {
  if (error instanceof ApiError && error.code === "not_found") {
    return "后端没有找到当前社区、目标用户或当前 active 版主。若这个社区本来就没有版主，当前后端接管接口仍要求先找到现任 active 版主，不能完成无版主社区接管；已记录为后端缺口。";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "平台接管失败。";
}

function formatCommunityManageForbiddenDescription({
  community,
  platformRole,
  platformRoleIsInferred,
}: {
  community?: Community;
  platformRole: PlatformRole | null;
  platformRoleIsInferred: boolean;
}) {
  const baseDescription = COMMUNITY_MANAGE_REQUIRED_DESCRIPTION;
  const communityName = community?.name ?? "这个社区";

  if (platformRole === "owner") {
    return `${baseDescription} 当前账号是平台 owner，但 ${communityName} 没有返回平台 owner 覆盖权限。请刷新登录状态，或确认后端已部署返回 viewer_permissions.platform_owner_override=true 的合同。`;
  }

  if (platformRole) {
    const inferredNotice = platformRoleIsInferred
      ? "当前用户接口未返回具体 platform_role，前端只能把账号识别为平台工作人员；"
      : "";

    return `${baseDescription} ${inferredNotice}当前账号具有${formatPlatformRole(platformRole)}身份，但平台 admin/staff 不自动获得 ${communityName} 的社区管理权限。`;
  }

  return baseDescription;
}

function formatPlatformRole(role: PlatformRole) {
  switch (role) {
    case "owner":
      return "平台 owner";
    case "admin":
      return "平台 admin";
    case "staff":
      return "平台 staff";
    default:
      return role;
  }
}

function formatViewerRole(role?: string) {
  switch (role) {
    case "owner":
      return "版主";
    case "moderator":
      return "社区管理员";
    case "member":
      return "成员";
    case "none":
    case "":
    case undefined:
      return "访客";
    default:
      return role;
  }
}

function formatPlatformStatus(status: string) {
  switch (status) {
    case "active":
      return "正常";
    case "disabled":
      return "已禁用";
    case "deleted":
      return "已删除";
    default:
      return status;
  }
}

function formatPermission(value?: boolean) {
  return value ? "允许" : "不可用";
}

function isModToolsQueue(queue: CommunityQueueKind) {
  return [
    "reports",
    "spam",
    "removed",
    "edited",
    "unmoderated",
    "needs_review",
  ].includes(queue);
}

function getQueueLabel(queue: string) {
  return communityQueueTabs.find((item) => item.value === queue)?.label ?? queue;
}

function formatMemberName(member: CommunityMember) {
  const displayName = member.user.display_name || member.user.username;
  return `${displayName} / @${member.user.username}`;
}

function getTransferTargetLabel(transfer: { to_display_name?: string; to_username?: string; to_user_id: string }) {
  return transfer.to_display_name || transfer.to_username || transfer.to_user_id;
}

function formatTransferStatus(status: string) {
  switch (status) {
    case "pending":
      return "等待接受";
    case "accepted":
      return "已接受";
    case "cancelled":
      return "已取消";
    case "expired":
      return "已过期";
    default:
      return status;
  }
}

function formatMemberStatus(status: string) {
  switch (status) {
    case "active":
      return "有效";
    case "banned":
      return "已封禁";
    case "left":
      return "已离开";
    default:
      return status;
  }
}

function getModeratorLimit(memberCount?: number) {
  const count = typeof memberCount === "number" ? memberCount : 0;

  if (count >= 2000) {
    return 20;
  }

  if (count >= 500) {
    return 10;
  }

  return 5;
}

function formatUserStateKind(kind: CommunityUserStateKind) {
  switch (kind) {
    case "approved":
      return "批准用户";
    case "banned":
      return "封禁用户";
    case "muted":
      return "禁言用户";
  }
}

function buildModerationUserCandidates({
  approvedUsers,
  bannedUsers,
  members,
  mutedUsers,
}: {
  approvedUsers: CommunityUserState[];
  bannedUsers: CommunityUserState[];
  members: CommunityMember[];
  mutedUsers: CommunityUserState[];
}) {
  const candidates = new Map<string, { label: string; userId: string }>();

  for (const member of members) {
    const userId = member.user.id;
    if (!userId || candidates.has(userId)) {
      continue;
    }
    candidates.set(userId, {
      label: member.user.display_name || member.user.username || userId.slice(0, 8),
      userId,
    });
  }

  for (const user of [...bannedUsers, ...mutedUsers, ...approvedUsers]) {
    if (!user.user_id || candidates.has(user.user_id)) {
      continue;
    }
    candidates.set(user.user_id, {
      label: user.display_name || user.username || user.user_id.slice(0, 8),
      userId: user.user_id,
    });
  }

  return [...candidates.values()];
}

function formatProfileStatus(status: string) {
  switch (status) {
    case "active":
      return "正常";
    case "disabled":
      return "已禁用";
    case "deleted":
      return "已注销";
    default:
      return status || "未知";
  }
}

function getProfileStatusTone(status: string): StatusTokenTone {
  switch (status) {
    case "active":
      return "success";
    case "disabled":
      return "warning";
    case "deleted":
      return "danger";
    default:
      return "default";
  }
}

function formatTemplateKind(kind: "removal-reasons" | "saved-responses") {
  switch (kind) {
    case "removal-reasons":
      return "移除原因";
    case "saved-responses":
      return "保存回复";
  }
}

function formatModAction(action: string) {
  switch (action) {
    case "approve":
      return "批准内容";
    case "remove":
      return "移除内容";
    case "spam":
      return "标记垃圾";
    case "ignore_reports":
      return "忽略举报";
    case "lock":
      return "锁定评论";
    case "pin":
      return "置顶帖子";
    case "mark_nsfw":
      return "标记 NSFW";
    case "mark_spoiler":
      return "标记剧透";
    case "set_flair":
      return "设置 flair";
    case "banned":
      return "封禁用户";
    case "muted":
      return "禁言用户";
    case "approved":
      return "批准用户";
    default:
      return action;
  }
}

function formatTargetType(targetType: string) {
  switch (targetType) {
    case "post":
      return "帖子";
    case "comment":
      return "评论";
    case "user":
      return "用户";
    case "removal_reason":
      return "移除原因";
    case "saved_response":
      return "保存回复";
    default:
      return targetType || "目标";
  }
}

function formatCount(value?: number) {
  return typeof value === "number" ? String(value) : "--";
}

function formatShortId(value?: string) {
  if (!value) {
    return "--";
  }

  return value.length > 12 ? `${value.slice(0, 8)}...` : value;
}

function getNextRulePosition(rules: CommunityRule[]) {
  if (rules.length === 0) {
    return 1;
  }

  return Math.max(...rules.map((rule) => rule.position)) + 1;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatContentStatus(status: string) {
  switch (status) {
    case "visible":
      return "可见";
    case "removed":
      return "已移除";
    case "deleted":
      return "已删除";
    case "locked":
      return "已锁定";
    case "hidden":
      return "已隐藏";
    default:
      return status;
  }
}

function formatReportTarget(targetType: string) {
  switch (targetType) {
    case "post":
      return "帖子";
    case "comment":
      return "评论";
    default:
      return targetType;
  }
}

function normalizeReportTargetType(targetType: string): "post" | "comment" {
  return targetType === "comment" ? "comment" : "post";
}

function getModQueueTargetKey(item: ModQueueItem) {
  return `${item.target_type}:${item.target_id}`;
}

