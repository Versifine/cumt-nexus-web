"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Hash } from "lucide-react";

import { rememberPostNavigationSource } from "@/components/app-shell/post-navigation-source";
import { rememberRecentCommunity } from "@/components/app-shell/recent-communities";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { StatusToken, type StatusTokenTone } from "@/components/ui/data-display";
import { TextAction } from "@/components/ui/text-action";
import { useAuthSession } from "@/features/auth/auth-session";
import { resolvePlatformRole, type PlatformRole } from "@/features/auth/platform-role";
import { useCurrentUserQuery } from "@/features/auth/queries";
import { DisabledMessageShareAction } from "@/features/message/disabled-share-action";
import { PostSortMenu } from "@/features/post/post-sort-menu";
import { useCommunityPostsQuery } from "@/features/post/queries";
import { RedditPostListItem } from "@/features/post/reddit-post-list-item";
import {
  formatPostSortFallbackNotice,
  formatPostSortLabel,
} from "@/features/post/sort";
import type { ListPostsResponse, Post, PostSort } from "@/features/post/types";
import { ApiError } from "@/lib/api/client";

import { CommunityFollowButton } from "./community-follow-button";
import { canAccessCommunityManagement } from "./permissions";
import { useCommunityQuery } from "./queries";
import type { Community, GetCommunityResponse } from "./types";

type CommunityDetailProps = {
  initialCommunityData?: GetCommunityResponse;
  initialPostsData?: ListPostsResponse;
  slug: string;
};

export function CommunityDetail({
  initialCommunityData,
  initialPostsData,
  slug,
}: CommunityDetailProps) {
  const { isReady, token } = useAuthSession();
  const currentUserQuery = useCurrentUserQuery();
  const [sort, setSort] = useState<PostSort>("new");
  const isAuthenticated = Boolean(token);
  const platformRole = resolvePlatformRole(currentUserQuery.data);
  const platformRoleIsInferred =
    currentUserQuery.data?.is_platform_staff === true &&
    !currentUserQuery.data?.platform_role;
  const communityQueryScope = isAuthenticated ? "viewer" : "public";
  const communityQuery = useCommunityQuery(
    slug,
    isReady,
    isAuthenticated ? undefined : initialCommunityData,
    communityQueryScope,
  );
  const community = communityQuery.data?.community;
  const canPostInCommunity = canPostToCommunity(community, isAuthenticated);
  const canManageCommunity = canManageThisCommunity(community, platformRole);
  const canShowCommunityContent =
    isReady && communityQuery.isSuccess && Boolean(community);
  const postsQuery = useCommunityPostsQuery(
    slug,
    20,
    0,
    canShowCommunityContent,
    sort,
    sort === "new" ? initialPostsData : undefined,
  );
  const posts = canShowCommunityContent ? (postsQuery.data?.posts ?? []) : [];
  const sortFallbackNotice = formatPostSortFallbackNotice(
    postsQuery.data?.requested_sort,
    postsQuery.data?.effective_sort,
  );

  useEffect(() => {
    if (community) {
      rememberRecentCommunity(community);
    }
  }, [community]);

  return (
    <div className="grid grid-cols-1 gap-0 py-2 xl:grid-cols-[minmax(0,1fr)_280px] xl:gap-8">
      <div className="min-w-0">
        <section className="bg-background">
          {!isReady || communityQuery.isPending ? (
            <div className="border-b border-border py-4">
              <LoadingState rows={3} />
            </div>
          ) : communityQuery.isError ? (
            <div className="border-b border-border py-4">
              <ErrorState
                title={getErrorTitle(communityQuery.error, "无法加载社区")}
                description={getErrorDescription(communityQuery.error)}
                action={
                  isUnauthenticated(communityQuery.error) ? (
                    <TextAction href="/communities" tone="primary">
                      浏览社区
                    </TextAction>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="px-1 hover:bg-transparent hover:text-primary"
                      onClick={() => communityQuery.refetch()}
                    >
                      重试
                    </Button>
                  )
                }
              />
            </div>
          ) : community ? (
            <CommunityHeader
              canManageCommunity={canManageCommunity}
              community={community}
            />
          ) : null}
          {community ? (
            <div>
            <div className="flex min-h-12 flex-col gap-3 border-t border-border py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold">社区帖子</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  当前按{formatPostSortLabel(sort)}排序
                </p>
                {sortFallbackNotice ? (
                  <p className="mt-2 max-w-2xl text-xs leading-5 text-warning">
                    {sortFallbackNotice}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <PostSortMenu
                  aria-label="选择社区帖子排序方式"
                  disabled={postsQuery.isFetching}
                  onSortChange={setSort}
                  sort={sort}
                />
                {canPostInCommunity && community ? (
                  <TextAction
                    href={`/communities/${encodeURIComponent(community.slug)}/new`}
                    tone="primary"
                  >
                    发布帖子
                  </TextAction>
                ) : null}
              </div>
            </div>

            {postsQuery.isPending ? (
              <div className="border-b border-border py-4">
                <LoadingState rows={5} />
              </div>
            ) : null}

            {postsQuery.isError ? (
              <div className="border-b border-border py-4">
                <ErrorState
                  title={getErrorTitle(postsQuery.error, "无法加载帖子")}
                  description={getErrorDescription(postsQuery.error)}
                  action={
                    isUnauthenticated(postsQuery.error) ? (
                      <TextAction href="/communities" tone="primary">
                        浏览社区
                      </TextAction>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => postsQuery.refetch()}
                      >
                        重试
                      </Button>
                    )
                  }
                />
              </div>
            ) : null}

            {postsQuery.isSuccess && posts.length === 0 ? (
              <div className="border-b border-border">
                <EmptyState
                  title="还没有帖子"
                  description="这个社区还没有形成可公开浏览的讨论。"
                  action={
                    canPostInCommunity ? (
                      <TextAction
                        href={`/communities/${encodeURIComponent(community.slug)}/new`}
                        tone="primary"
                      >
                        发布第一条帖子
                      </TextAction>
                    ) : isAuthenticated ? (
                      <TextAction href="/community-applications/new" tone="primary">
                        申请社区
                      </TextAction>
                    ) : (
                      <TextAction href="/communities" tone="primary">
                        浏览其他社区
                      </TextAction>
                    )
                  }
                />
              </div>
            ) : null}

            {postsQuery.isSuccess && posts.length > 0
              ? posts.map((post) => (
                  <RedditPostListItem
                    key={post.id}
                    post={post}
                    source={{
                      href: `/communities/${community.slug}`,
                      label: `返回 /${community.slug}`,
                    }}
                    communityFallback={community}
                    showCommunity={false}
                  />
                ))
              : null}
            </div>
          ) : null}
        </section>
      </div>

      {community ? (
        <CommunityRail
          community={community}
          isAuthenticated={isAuthenticated}
          isPostsLoading={postsQuery.isPending}
          platformRole={platformRole}
          platformRoleIsInferred={platformRoleIsInferred}
          posts={posts}
        />
      ) : null}
    </div>
  );
}

function CommunityHeader({
  canManageCommunity,
  community,
}: {
  canManageCommunity: boolean;
  community: Community;
}) {
  const managePath = `/communities/${encodeURIComponent(community.slug)}/manage`;

  return (
    <div className="border-b border-border py-4">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-3">
            <CommunityIcon community={community} />
            <div className="min-w-0">
              <h1 className="break-words text-xl font-semibold leading-7 tracking-normal text-foreground sm:text-2xl">
                {community.name}
              </h1>
              <p className="mt-1 truncate font-mono text-xs text-primary">
                /{community.slug}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusToken>{formatCommunityKind(community.kind)}</StatusToken>
            <StatusToken>{formatCommunityVisibility(community.visibility)}</StatusToken>
            <StatusToken tone={getStatusTone(community.status)}>
              {formatCommunityStatus(community.status)}
            </StatusToken>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            {community.description || "这个社区还没有填写描述。"}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:pt-1">
          {canManageCommunity ? (
            <TextAction href={managePath} tone="primary">
              管理社区
            </TextAction>
          ) : null}
          <DisabledMessageShareAction
            className="h-9 text-sm font-semibold"
            iconClassName="size-4"
            label="发送给好友"
          />
          <CommunityFollowButton community={community} />
        </div>
      </div>
    </div>
  );
}

function CommunityIcon({ community }: { community: Community }) {
  return (
    <div
      className="flex size-10 shrink-0 items-center justify-center bg-background-soft text-primary"
      aria-label={`/${community.slug} 的社区图标`}
    >
      <Hash className="size-5" aria-hidden="true" />
    </div>
  );
}

function CommunityRail({
  community,
  isAuthenticated,
  isPostsLoading,
  platformRole,
  platformRoleIsInferred,
  posts,
}: {
  community: Community;
  isAuthenticated: boolean;
  isPostsLoading: boolean;
  platformRole: PlatformRole | null;
  platformRoleIsInferred: boolean;
  posts: Post[];
}) {
  const topPosts = [...posts].sort((left, right) => right.score - left.score).slice(0, 3);
  const canPost = canPostToCommunity(community, isAuthenticated);
  const canManage = canManageThisCommunity(community, platformRole);
  const hasPlatformOwnerOverride =
    community.viewer_permissions?.platform_owner_override === true ||
    platformRole === "owner";

  return (
    <aside className="border-t border-border px-0 py-5 xl:border-l xl:border-t-0 xl:pl-5">
      <div className="sticky top-20 right-rail-scroll space-y-6">
        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">社区动态</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {formatCommunitySummary(community, posts)}
          </p>
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            创建于 {formatDate(community.created_at)}
          </p>
        </section>

        <section className="border-b border-border pb-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">高分帖子</h2>
            <span className="font-mono text-xs text-muted-foreground">
              {topPosts.length}
            </span>
          </div>
          {isPostsLoading ? (
            <LoadingState rows={2} />
          ) : topPosts.length > 0 ? (
            <div className="divide-y divide-border">
              {topPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/posts/${post.id}`}
                  onClick={() =>
                    rememberPostNavigationSource({
                      href: `/communities/${community.slug}`,
                      label: `返回 /${community.slug}`,
                      postId: post.id,
                    })
                  }
                  className="block py-3 transition-colors hover:text-primary"
                >
                  <div className="font-mono text-xs text-muted-foreground">
                    {post.score} 分 / {post.comment_count ?? 0} 条评论
                  </div>
                  <div className="mt-1 line-clamp-2 text-sm font-medium">
                    {post.title}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              暂无可展示的公开帖子。
            </p>
          )}
        </section>

        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">社区操作</h2>
          <div className="mt-3 flex flex-col border-t border-border">
            {canPost ? (
              <TextAction
                href={`/communities/${encodeURIComponent(community.slug)}/new`}
                variant="bar"
              >
                发布帖子
              </TextAction>
            ) : isAuthenticated ? (
              <TextAction href="/community-applications/new" variant="bar">
                申请社区
              </TextAction>
            ) : (
              <TextAction
                href={`/login?next=${encodeURIComponent(
                  `/communities/${community.slug}/new`,
                )}`}
                variant="bar"
              >
                登录后参与
              </TextAction>
            )}
            {canManage ? (
              <TextAction
                href={`/communities/${encodeURIComponent(community.slug)}/manage`}
                variant="bar"
              >
                管理社区
              </TextAction>
            ) : null}
            <DisabledMessageShareAction
              className="h-auto justify-start border-b border-border px-3 py-3 text-sm font-semibold"
              iconClassName="size-4"
              label="发送给好友（待接入）"
            />
          </div>
          {hasPlatformOwnerOverride ? (
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              当前通过平台 owner 身份显示管理入口，真实社区角色仍为
              {formatViewerRole(community.viewer_role)}。
            </p>
          ) : null}
          {isAuthenticated && !canPost ? (
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              当前账号暂不能在本社区发帖；如需创建新社区，可以提交社区申请。
            </p>
          ) : null}
          {!isAuthenticated ? (
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              登录后会按后端 viewer 权限显示发帖入口；社区管理入口只在具备权限时显示。
            </p>
          ) : null}
          {isAuthenticated && platformRole && !canManage ? (
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              平台身份为 {formatPlatformRole(platformRole)}
              {platformRoleIsInferred
                ? "，但当前用户接口未返回具体 platform_role，前端只能按平台工作人员识别"
                : ""}
              {platformRole === "owner"
                ? "，但没有收到平台 owner 覆盖权限；请刷新登录状态或确认后端已部署新合同。"
                : "，但平台 admin/staff 不自动获得社区管理权限。"}
            </p>
          ) : null}
        </section>

        <section>
          <h2 className="text-sm font-semibold">继续浏览</h2>
          <div className="mt-3 flex flex-col border-t border-border">
            <TextAction href="/communities" variant="bar">
              浏览社区
            </TextAction>
            <TextAction href="/" variant="bar">
              返回信息流
            </TextAction>
          </div>
        </section>
      </div>
    </aside>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatCommunitySummary(community: Community, posts: Post[]) {
  const parts = [`/${community.slug}`];

  if (typeof community.member_count === "number") {
    parts.push(`${community.member_count} 名成员`);
  }

  if (posts.length > 0) {
    parts.push(`${posts.length} 篇当前帖子`);
  }

  return parts.join(" / ");
}

function isUnauthenticated(error: Error | null) {
  return error instanceof ApiError && error.code === "unauthenticated";
}

function canPostToCommunity(
  community: Community | undefined,
  isAuthenticated: boolean,
) {
  if (!community || !isAuthenticated) {
    return false;
  }

  return community.viewer_permissions?.can_post !== false;
}

function canManageThisCommunity(
  community: Community | undefined,
  platformRole?: PlatformRole | null,
) {
  return canAccessCommunityManagement(community, platformRole);
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

function getErrorTitle(error: Error | null, fallback: string) {
  if (isUnauthenticated(error)) {
    return "公开社区暂不可读";
  }

  return fallback;
}

function getErrorDescription(error: Error | null) {
  if (isUnauthenticated(error)) {
    return "这个社区暂时无法公开读取。可以先浏览其他社区，或登录后再试。";
  }

  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}

function formatCommunityKind(kind: string) {
  switch (kind) {
    case "system":
      return "系统社区";
    case "user":
    case "user_created":
      return "用户社区";
    default:
      return kind;
  }
}

function formatCommunityVisibility(visibility: string) {
  switch (visibility) {
    case "public":
      return "公开";
    case "restricted":
      return "受限";
    case "private":
      return "私密";
    default:
      return visibility;
  }
}

function formatCommunityStatus(status: string) {
  switch (status) {
    case "active":
      return "已启用";
    case "archived":
      return "已归档";
    case "suspended":
      return "已暂停";
    case "pending":
      return "待审核";
    default:
      return status;
  }
}

function getStatusTone(status: string): StatusTokenTone {
  switch (status) {
    case "active":
      return "success";
    case "archived":
      return "warning";
    case "suspended":
      return "danger";
    default:
      return "default";
  }
}

