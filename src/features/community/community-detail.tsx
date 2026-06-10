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
import { InfoRow, StatusToken, type StatusTokenTone } from "@/components/ui/data-display";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TextAction } from "@/components/ui/text-action";
import { useAuthSession } from "@/features/auth/auth-session";
import { useCommunityPostsQuery } from "@/features/post/queries";
import { RedditPostListItem } from "@/features/post/reddit-post-list-item";
import {
  formatPostSortFallbackNotice,
  formatPostSortLabel,
  postSortItems,
} from "@/features/post/sort";
import type { ListPostsResponse, Post, PostSort } from "@/features/post/types";
import { ApiError } from "@/lib/api/client";

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
  const [sort, setSort] = useState<PostSort>("new");
  const isAuthenticated = Boolean(token);
  const communityQuery = useCommunityQuery(slug, isReady, initialCommunityData);
  const community = communityQuery.data?.community;
  const canPostInCommunity = community?.viewer_permissions?.can_post === true;
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
    <div className="grid grid-cols-1 gap-0 py-4 xl:grid-cols-[minmax(0,1fr)_312px]">
      <div className="min-w-0">
        <TextAction href="/communities" variant="bar">
          浏览社区
        </TextAction>

        <section className="mt-3 border border-border bg-background">
          {!isReady || communityQuery.isPending ? (
            <div className="p-4">
              <LoadingState rows={3} />
            </div>
          ) : communityQuery.isError ? (
            <div className="p-4">
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
                      variant="outline"
                      size="sm"
                      onClick={() => communityQuery.refetch()}
                    >
                      重试
                    </Button>
                  )
                }
              />
            </div>
          ) : community ? (
            <CommunityHeader community={community} posts={posts} />
          ) : null}
        </section>

        {community ? (
          <section className="mt-3 border-x border-border bg-background">
            <div className="flex min-h-12 flex-col gap-3 border-b border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
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
              <div className="flex flex-wrap items-center gap-2">
                <CommunityPostSortTabs
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
              <div className="border-b border-border p-4">
                <LoadingState rows={5} />
              </div>
            ) : null}

            {postsQuery.isError ? (
              <div className="border-b border-border p-4">
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
              <div className="border-b border-border p-4">
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
          </section>
        ) : null}
      </div>

      {community ? (
        <CommunityRail
          community={community}
          isAuthenticated={isAuthenticated}
          isPostsLoading={postsQuery.isPending}
          posts={posts}
        />
      ) : null}
    </div>
  );
}

function CommunityHeader({
  community,
  posts,
}: {
  community: Community;
  posts: Post[];
}) {
  const totalScore = posts.reduce((total, post) => total + post.score, 0);
  const authors = new Set(posts.map((post) => post.author_id)).size;

  return (
    <div className="grid gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
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

      <div className="grid grid-cols-3 border border-border text-center">
        <HeaderMetric label="帖子" value={String(posts.length)} />
        <HeaderMetric label="总分" value={String(totalScore)} />
        <HeaderMetric label="作者" value={String(authors)} />
      </div>
    </div>
  );
}

function HeaderMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-border p-2 last:border-r-0">
      <div className="font-mono text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}

function CommunityIcon({ community }: { community: Community }) {
  return (
    <div
      className="flex size-12 shrink-0 items-center justify-center border border-border bg-secondary text-primary"
      aria-label={`/${community.slug} 的社区图标`}
    >
      <Hash className="size-5" aria-hidden="true" />
    </div>
  );
}

function CommunityPostSortTabs({
  disabled,
  onSortChange,
  sort,
}: {
  disabled: boolean;
  onSortChange: (sort: PostSort) => void;
  sort: PostSort;
}) {
  return (
    <Tabs value={sort} onValueChange={(value) => onSortChange(value as PostSort)}>
      <TabsList className="h-9 max-w-full justify-start overflow-x-auto rounded-none border border-border bg-background p-0">
        {postSortItems.map((item) => (
          <TabsTrigger
            key={item.value}
            value={item.value}
            disabled={disabled}
            className="h-9 rounded-none border-r border-border px-3 text-xs last:border-r-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

function CommunityRail({
  community,
  isAuthenticated,
  isPostsLoading,
  posts,
}: {
  community: Community;
  isAuthenticated: boolean;
  isPostsLoading: boolean;
  posts: Post[];
}) {
  const topPosts = [...posts].sort((left, right) => right.score - left.score).slice(0, 3);
  const canPost = community.viewer_permissions?.can_post === true;
  const canManage =
    community.viewer_permissions?.can_manage === true ||
    community.viewer_permissions?.can_moderate === true;

  return (
    <aside className="border-t border-border bg-background-soft/45 px-4 py-5 xl:border-l xl:border-t-0">
      <div className="sticky top-20 space-y-5">
        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">社区上下文</h2>
          <div className="mt-3 divide-y divide-border border-y border-border">
            <InfoRow label="Slug" value={`/${community.slug}`} />
            <InfoRow label="状态" value={formatCommunityStatus(community.status)} />
            <InfoRow
              label="可见性"
              value={formatCommunityVisibility(community.visibility)}
            />
            <InfoRow label="类型" value={formatCommunityKind(community.kind)} />
            <InfoRow label="创建" value={formatDate(community.created_at)} />
          </div>
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
          <div className="mt-3 flex flex-col border-y border-border">
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
          </div>
          {isAuthenticated && !canPost ? (
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              当前账号暂不能在本社区发帖；如需创建新社区，可以提交社区申请。
            </p>
          ) : null}
          {!isAuthenticated ? (
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              登录后会按后端 viewer 权限显示发帖和社区管理入口。
            </p>
          ) : null}
        </section>

        <section>
          <h2 className="text-sm font-semibold">继续浏览</h2>
          <div className="mt-3 flex flex-col border-y border-border">
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

function isUnauthenticated(error: Error | null) {
  return error instanceof ApiError && error.code === "unauthenticated";
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
