"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Hash, PencilLine } from "lucide-react";

import { rememberPostNavigationSource } from "@/components/app-shell/post-navigation-source";
import { rememberRecentCommunity } from "@/components/app-shell/recent-communities";
import {
  ReviewDesk,
  ReviewDeskBoard,
  ReviewDeskInspector,
  ReviewDeskState,
} from "@/components/app-shell/review-desk";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { InfiniteListStatus } from "@/components/feedback/infinite-list-status";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { StatusToken, type StatusTokenTone } from "@/components/ui/data-display";
import { TextAction } from "@/components/ui/text-action";
import { useAuthSession } from "@/features/auth/auth-session";
import { resolvePlatformRole, type PlatformRole } from "@/features/auth/platform-role";
import { useCurrentUserQuery } from "@/features/auth/queries";
import { DisabledMessageShareAction } from "@/features/message/disabled-share-action";
import { createMessageShareSnapshot } from "@/features/message/share";
import { PostSortMenu } from "@/features/post/post-sort-menu";
import { useInfiniteCommunityPostsQuery } from "@/features/post/queries";
import { RedditPostListItem } from "@/features/post/reddit-post-list-item";
import {
  formatPostSortFallbackNotice,
  formatPostSortLabel,
} from "@/features/post/sort";
import type { ListPostsResponse, Post, PostSort } from "@/features/post/types";
import { ApiError } from "@/lib/api/client";
import { useInfiniteScrollTrigger } from "@/lib/hooks/use-infinite-scroll-trigger";
import { cn } from "@/lib/utils";

import { CommunityFollowButton } from "./community-follow-button";
import {
  canAccessCommunityManagement,
  canModerateCommunityContent,
} from "./permissions";
import { useCommunityQuery, useCommunityRulesQuery } from "./queries";
import type { Community, CommunityRule, GetCommunityResponse } from "./types";

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
  const postsQuery = useInfiniteCommunityPostsQuery(
    slug,
    20,
    canShowCommunityContent,
    sort,
    sort === "new" && !isAuthenticated ? initialPostsData : undefined,
  );
  const postPages = postsQuery.data?.pages ?? [];
  const firstPostPage = postPages[0];
  const posts = canShowCommunityContent ? getUniquePosts(postPages) : [];
  const sortFallbackNotice = formatPostSortFallbackNotice(
    firstPostPage?.requested_sort,
    firstPostPage?.effective_sort,
  );
  const isInitialPostsLoading = postsQuery.isLoading && posts.length === 0;
  const hasNextPostsPage = Boolean(postsQuery.hasNextPage);
  const isFetchingNextPostsPage = postsQuery.isFetchingNextPage;
  const fetchNextPostsPage = postsQuery.fetchNextPage;
  const loadMorePosts = useCallback(() => {
    void fetchNextPostsPage();
  }, [fetchNextPostsPage]);
  const loadMoreRef = useInfiniteScrollTrigger({
    enabled:
      canShowCommunityContent &&
      posts.length > 0 &&
      hasNextPostsPage &&
      !isFetchingNextPostsPage,
    onLoadMore: loadMorePosts,
  });

  useEffect(() => {
    if (community) {
      rememberRecentCommunity(community);
    }
  }, [community]);

  return (
    <ReviewDesk className="max-w-[1180px]">
      {!isReady || communityQuery.isPending ? (
        <ReviewDeskState>
          <LoadingState rows={3} />
        </ReviewDeskState>
      ) : communityQuery.isError ? (
        <ReviewDeskState>
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
        </ReviewDeskState>
      ) : community ? (
        <ReviewDeskBoard
          className="xl:grid-cols-[minmax(0,1fr)_320px]"
          inspector={
            <CommunityRail
              community={community}
              isAuthenticated={isAuthenticated}
              isPostsLoading={isInitialPostsLoading}
              platformRole={platformRole}
              platformRoleIsInferred={platformRoleIsInferred}
              posts={posts}
            />
          }
        >
          <CommunityHeader
            canManageCommunity={canManageCommunity}
            community={community}
          />
            <CommunityPostStream
              canPostInCommunity={canPostInCommunity}
              community={community}
              hasNextPostsPage={hasNextPostsPage}
              isFetchingNextPostsPage={isFetchingNextPostsPage}
              isInitialPostsLoading={isInitialPostsLoading}
              isAuthenticated={isAuthenticated}
              loadMorePosts={loadMorePosts}
              loadMoreRef={loadMoreRef}
              posts={posts}
              postsQueryError={postsQuery.error}
              postsQueryIsError={postsQuery.isError}
              postsQueryIsFetching={postsQuery.isFetching}
              postsQueryIsSuccess={postsQuery.isSuccess}
              refetchPosts={() => postsQuery.refetch()}
              setSort={setSort}
              sort={sort}
              sortFallbackNotice={sortFallbackNotice}
            />
        </ReviewDeskBoard>
      ) : (
        <ReviewDeskState>
          <EmptyState
            className="bg-surface-raised"
            title="没有找到社区"
            description="这个社区不存在，或当前不可公开浏览。"
            action={
              <TextAction href="/communities" tone="primary">
                浏览社区
              </TextAction>
            }
          />
        </ReviewDeskState>
      )}
    </ReviewDesk>
  );
}

function getUniquePosts(pages: ListPostsResponse[]) {
  const seenPostIds = new Set<string>();
  const posts: Post[] = [];

  for (const page of pages) {
    for (const post of page.posts) {
      if (seenPostIds.has(post.id)) {
        continue;
      }

      seenPostIds.add(post.id);
      posts.push(post);
    }
  }

  return posts;
}

function CommunityHeader({
  canManageCommunity,
  community,
}: {
  canManageCommunity: boolean;
  community: Community;
}) {
  const managePath = `/communities/${encodeURIComponent(community.slug)}/manage`;
  const messageShare = createMessageShareSnapshot({
    shareId: community.slug,
    shareType: "community",
    snapshotCreatedAt: community.updated_at || community.created_at,
    summary: community.description,
    targetUrl: `/communities/${encodeURIComponent(community.slug)}`,
    thumbnailUrl: community.avatar_url,
    title: community.name,
  });

  return (
    <section className="nexus-soft-transition overflow-hidden rounded-lg bg-surface shadow-sm">
      <CommunityBanner community={community} />
      <div className="p-4 sm:p-5">
        <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-3">
              <CommunityIcon community={community} />
              <div className="min-w-0">
                <p className="truncate font-mono text-[11px] font-semibold uppercase text-primary">
                  /{community.slug}
                </p>
                <h1 className="mt-1 break-words text-2xl font-semibold leading-8 tracking-normal text-foreground sm:text-3xl">
                  {community.name}
                </h1>
              </div>
            </div>
            <p className="mt-3 max-w-3xl break-words text-sm leading-6 text-muted-foreground [overflow-wrap:anywhere]">
              {community.description || "这个社区还没有填写描述。"}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusToken>{formatCommunityKind(community.kind)}</StatusToken>
              <StatusToken>{formatCommunityVisibility(community.visibility)}</StatusToken>
              <StatusToken tone={getStatusTone(community.status)}>
                {formatCommunityStatus(community.status)}
              </StatusToken>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
          {canManageCommunity ? (
            <TextAction href={managePath} tone="primary">
              管理社区
            </TextAction>
          ) : null}
          <DisabledMessageShareAction
            className="h-9 text-sm font-semibold"
            iconClassName="size-4"
            label="发送给好友"
            share={messageShare}
          />
          <CommunityFollowButton community={community} />
        </div>
        </div>
      </div>
    </section>
  );
}

function CommunityBanner({ community }: { community: Community }) {
  const bannerUrl = community.banner_url?.trim();

  if (bannerUrl) {
    return (
      <div className="h-36 overflow-hidden bg-background-soft sm:h-44">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={bannerUrl}
          alt={`/${community.slug} 的社区背景`}
          className="size-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className="flex h-28 items-center justify-end bg-background-soft px-5 text-primary/35 sm:h-36">
      <Hash className="size-14" aria-hidden="true" />
    </div>
  );
}

function CommunityIcon({ community }: { community: Community }) {
  const avatarUrl = community.avatar_url?.trim();

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={`/${community.slug} 的社区头像`}
        className="size-11 shrink-0 rounded-md bg-background-soft object-cover sm:size-12"
      />
    );
  }

  return (
    <span
      className="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary sm:size-12"
      aria-label={`/${community.slug} 的社区图标`}
    >
      <Hash className="size-5" aria-hidden="true" />
    </span>
  );
}

type CommunityPostStreamProps = {
  canPostInCommunity: boolean;
  community: Community;
  hasNextPostsPage: boolean;
  isAuthenticated: boolean;
  isFetchingNextPostsPage: boolean;
  isInitialPostsLoading: boolean;
  loadMorePosts: () => void;
  loadMoreRef: RefObject<HTMLDivElement | null>;
  posts: Post[];
  postsQueryError: Error | null;
  postsQueryIsError: boolean;
  postsQueryIsFetching: boolean;
  postsQueryIsSuccess: boolean;
  refetchPosts: () => void;
  setSort: (sort: PostSort) => void;
  sort: PostSort;
  sortFallbackNotice: string | null;
};

function CommunityPostStream({
  canPostInCommunity,
  community,
  hasNextPostsPage,
  isAuthenticated,
  isFetchingNextPostsPage,
  isInitialPostsLoading,
  loadMorePosts,
  loadMoreRef,
  posts,
  postsQueryError,
  postsQueryIsError,
  postsQueryIsFetching,
  postsQueryIsSuccess,
  refetchPosts,
  setSort,
  sort,
  sortFallbackNotice,
}: CommunityPostStreamProps) {
  return (
    <section className="space-y-3">
      <div className="flex min-h-9 flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
        {sortFallbackNotice ? (
          <p className="text-xs leading-5 text-warning">{sortFallbackNotice}</p>
        ) : (
          <span className="hidden text-xs text-muted-foreground sm:inline">
            当前按{formatPostSortLabel(sort)}排序
          </span>
        )}
        <PostSortMenu
          aria-label="选择社区帖子排序方式"
          disabled={isInitialPostsLoading}
          onSortChange={setSort}
          sort={sort}
        />
      </div>

      {isInitialPostsLoading ? (
        <ReviewDeskState className="bg-surface shadow-none">
          <LoadingState rows={5} />
        </ReviewDeskState>
      ) : null}

      {postsQueryIsError && posts.length === 0 ? (
        <ReviewDeskState className="bg-surface shadow-none">
          <ErrorState
            title={getErrorTitle(postsQueryError, "无法加载帖子")}
            description={getErrorDescription(postsQueryError)}
            action={
              isUnauthenticated(postsQueryError) ? (
                <TextAction href="/communities" tone="primary">
                  浏览社区
                </TextAction>
              ) : (
                <Button variant="outline" size="sm" onClick={refetchPosts}>
                  重试
                </Button>
              )
            }
          />
        </ReviewDeskState>
      ) : null}

      {postsQueryIsSuccess && !postsQueryIsFetching && posts.length === 0 ? (
        <ReviewDeskState className="bg-surface shadow-none">
          <EmptyState
            className="bg-surface-raised"
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
        </ReviewDeskState>
      ) : null}

      {posts.length > 0 ? (
        <div className="space-y-2">
          {posts.map((post) => (
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
          ))}
          <InfiniteListStatus
            ref={loadMoreRef}
            hasNextPage={hasNextPostsPage}
            isFetching={isFetchingNextPostsPage}
            loadingLabel="正在加载更多帖子"
            loadMoreLabel="加载更多帖子"
            onLoadMore={loadMorePosts}
          />
        </div>
      ) : null}
    </section>
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
  const canEditRules = canModerateCommunityContent(community, platformRole);
  const canReadRules = isAuthenticated || canEditRules;
  const rulesQuery = useCommunityRulesQuery(
    community.slug,
    canReadRules,
  );
  const rules = rulesQuery.data?.rules ?? [];
  const messageShare = createMessageShareSnapshot({
    shareId: community.slug,
    shareType: "community",
    snapshotCreatedAt: community.updated_at || community.created_at,
    summary: community.description,
    targetUrl: `/communities/${encodeURIComponent(community.slug)}`,
    thumbnailUrl: community.avatar_url,
    title: community.name,
  });
  const hasPlatformOwnerOverride =
    community.viewer_permissions?.platform_owner_override === true ||
    platformRole === "owner";

  return (
    <div className="space-y-4">
      <CommunityRulesPanel
        canEditRules={canEditRules}
        community={community}
        isAuthenticated={isAuthenticated}
        isError={rulesQuery.isError}
        isLoading={rulesQuery.isPending && rulesQuery.fetchStatus !== "idle"}
        isQueryEnabled={canReadRules}
        onRetry={() => rulesQuery.refetch()}
        rules={rules}
      />

      <ReviewDeskInspector title="高分帖子" description={`${topPosts.length} 条`}>
        {isPostsLoading ? (
          <LoadingState rows={2} />
        ) : topPosts.length > 0 ? (
          <div className="overflow-hidden rounded-md bg-surface-raised">
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
                className="group block px-3 py-3 transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="font-mono text-[11px] text-muted-foreground">
                  {post.score} 分 / {post.comment_count ?? 0} 条评论
                </div>
                <div className="mt-1 line-clamp-2 text-sm font-semibold text-foreground group-hover:text-primary">
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
      </ReviewDeskInspector>

      <ReviewDeskInspector title="社区操作">
        <div className="space-y-1">
          {canPost ? (
            <RailActionLink
              href={`/communities/${encodeURIComponent(community.slug)}/new`}
              tone="primary"
            >
              发布帖子
            </RailActionLink>
          ) : isAuthenticated ? (
            <RailActionLink href="/community-applications/new" tone="primary">
              申请社区
            </RailActionLink>
          ) : (
            <RailActionLink
              href={`/login?next=${encodeURIComponent(
                `/communities/${community.slug}/new`,
              )}`}
              tone="primary"
            >
              登录后参与
            </RailActionLink>
          )}
          {canManage ? (
            <RailActionLink
              href={`/communities/${encodeURIComponent(community.slug)}/manage`}
            >
              管理社区
            </RailActionLink>
          ) : null}
          <DisabledMessageShareAction
            className="h-10 justify-start px-1.5 text-sm font-semibold hover:bg-transparent hover:text-primary"
            iconClassName="size-4"
            label="发送给好友"
            share={messageShare}
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
      </ReviewDeskInspector>

      <ReviewDeskInspector title="继续浏览">
        <div className="space-y-1">
          <RailActionLink href="/communities">浏览社区</RailActionLink>
          <RailActionLink href="/">返回信息流</RailActionLink>
        </div>
      </ReviewDeskInspector>
    </div>
  );
}

function CommunityRulesPanel({
  canEditRules,
  community,
  isAuthenticated,
  isError,
  isLoading,
  isQueryEnabled,
  onRetry,
  rules,
}: {
  canEditRules: boolean;
  community: Community;
  isAuthenticated: boolean;
  isError: boolean;
  isLoading: boolean;
  isQueryEnabled: boolean;
  onRetry: () => void;
  rules: CommunityRule[];
}) {
  const editHref = `/communities/${encodeURIComponent(community.slug)}/manage/rules`;
  const visibleRules = [...rules]
    .sort((left, right) => left.position - right.position)
    .slice(0, 5);

  return (
    <ReviewDeskInspector
      title="社区规则"
      description={
        canEditRules
          ? "管理人员可以直接进入规则工作区维护。"
          : "这里显示社区规则；公开读取能力以后端权限为准。"
      }
    >
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-primary">
          <BookOpen className="size-3.5" aria-hidden="true" />
          {isLoading ? "读取中" : `${rules.length} 条规则`}
        </span>
        {canEditRules ? (
          <Link
            href={editHref}
            className="inline-flex min-h-8 items-center gap-1.5 border-b border-transparent px-0.5 text-xs font-semibold text-primary transition-colors hover:border-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <PencilLine className="size-3.5" aria-hidden="true" />
            编辑规则
          </Link>
        ) : null}
      </div>

      {!isQueryEnabled ? (
        <div className="mt-4 rounded-md bg-surface-raised p-3">
          <p className="text-sm leading-6 text-muted-foreground">
            登录后会按当前账号权限读取社区规则；公开规则读取合同尚未接入。
          </p>
          <Link
            href={`/login?next=${encodeURIComponent(
              `/communities/${community.slug}`,
            )}`}
            className="mt-2 inline-flex min-h-8 items-center border-b border-transparent px-0.5 text-xs font-semibold text-primary transition-colors hover:border-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            登录查看
          </Link>
        </div>
      ) : isLoading ? (
        <div className="mt-4 rounded-md bg-surface-raised p-3">
          <LoadingState rows={2} />
        </div>
      ) : isError ? (
        <div className="mt-4 rounded-md bg-surface-raised p-3">
          <p className="text-sm leading-6 text-muted-foreground">
            规则暂时不可读取，可能需要登录或管理权限。
          </p>
          {isAuthenticated ? (
            <button
              type="button"
              className="mt-2 inline-flex min-h-8 items-center border-b border-transparent px-0.5 text-xs font-semibold text-primary transition-colors hover:border-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={onRetry}
            >
              重试
            </button>
          ) : null}
        </div>
      ) : visibleRules.length > 0 ? (
        <div className="mt-4 space-y-2">
          {visibleRules.map((rule) => (
            <article
              key={rule.id}
              className="rounded-md bg-surface-raised px-3 py-3"
            >
              <div className="font-mono text-[11px] text-primary">
                {String(rule.position).padStart(2, "0")}
              </div>
              <h3 className="mt-1 break-words text-sm font-semibold text-foreground [overflow-wrap:anywhere]">
                {rule.title}
              </h3>
              {rule.body ? (
                <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted-foreground">
                  {rule.body}
                </p>
              ) : null}
            </article>
          ))}
          {rules.length > visibleRules.length ? (
            <p className="text-xs text-muted-foreground">
              还有 {rules.length - visibleRules.length} 条规则，可进入管理页查看。
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 rounded-md bg-surface-raised p-3">
          <p className="text-sm leading-6 text-muted-foreground">
            暂无社区规则。
          </p>
          {canEditRules ? (
            <Link
              href={editHref}
              className="mt-2 inline-flex min-h-8 items-center border-b border-transparent px-0.5 text-xs font-semibold text-primary transition-colors hover:border-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              添加第一条规则
            </Link>
          ) : null}
        </div>
      )}
    </ReviewDeskInspector>
  );
}

function RailActionLink({
  children,
  className,
  href,
  tone = "default",
}: {
  children: ReactNode;
  className?: string;
  href: string;
  tone?: "default" | "primary";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex min-h-10 items-center justify-between gap-3 rounded-md px-1.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        tone === "primary"
          ? "text-primary hover:text-foreground"
          : "text-foreground hover:text-primary",
        className,
      )}
    >
      <span>{children}</span>
      <ArrowRight
        className="size-4 text-muted-foreground transition duration-150 group-hover:translate-x-1 group-hover:text-primary motion-reduce:transform-none"
        aria-hidden="true"
      />
    </Link>
  );
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
