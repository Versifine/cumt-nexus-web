"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  MessageSquare,
} from "lucide-react";

import { PageNav } from "@/components/app-shell/page-nav";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import {
  InfoRow,
  MetricBlock,
  StatusToken,
  type StatusTokenTone,
} from "@/components/ui/data-display";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TextAction } from "@/components/ui/text-action";
import { useAuthSession } from "@/features/auth/auth-session";
import { useCommunityPostsQuery } from "@/features/post/queries";
import type { Post, PostSort } from "@/features/post/types";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

import { useCommunityQuery } from "./queries";
import type { Community } from "./types";

type CommunityDetailProps = {
  slug: string;
};

export function CommunityDetail({ slug }: CommunityDetailProps) {
  const { isReady, token } = useAuthSession();
  const [sort, setSort] = useState<PostSort>("new");
  const canRequestCommunity = isReady && Boolean(token);
  const communityQuery = useCommunityQuery(slug, canRequestCommunity);
  const canShowCommunityContent =
    canRequestCommunity && communityQuery.isSuccess && Boolean(communityQuery.data?.community);
  const postsQuery = useCommunityPostsQuery(slug, 20, 0, canShowCommunityContent, sort);
  const community = canRequestCommunity ? communityQuery.data?.community : undefined;
  const posts = canShowCommunityContent ? (postsQuery.data?.posts ?? []) : [];
  const loginHref = `/login?next=${encodeURIComponent(`/communities/${slug}`)}`;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-[1280px] px-4 py-6 md:px-6">
        <PageNav backHref="/communities" backLabel="返回社区索引" />

        <section className="py-6">
          {!isReady ? (
            <LoadingState rows={2} />
          ) : !token ? (
            <ErrorState
              title="需要登录"
              description="请先登录后查看社区详情和帖子。"
              action={
                <TextAction href={loginHref} tone="primary">
                  登录
                </TextAction>
              }
            />
          ) : communityQuery.isPending ? (
            <LoadingState rows={2} />
          ) : communityQuery.isError ? (
            <ErrorState
              title={getErrorTitle(communityQuery.error, "无法加载社区")}
              description={getErrorDescription(communityQuery.error)}
              action={
                isUnauthenticated(communityQuery.error) ? (
                  <TextAction href={loginHref} tone="primary">
                    登录
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
          ) : community ? (
            <CommunityHero community={community} slug={slug} posts={posts} />
          ) : null}
        </section>

        {canShowCommunityContent ? (
          <section className="grid gap-8 border-t border-border pt-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0">
              <div className="border-b border-border pb-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="font-mono text-xs uppercase text-primary">
                      POSTS / 社区帖子
                    </div>
                    <h2 className="mt-2 text-2xl font-black tracking-normal">
                      {formatSortLabel(sort)}讨论
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                      社区帖子流支持最新和热门排序，进入帖子后再参与投票和评论。
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <CommunityPostSortTabs
                      disabled={postsQuery.isFetching}
                      onSortChange={setSort}
                      sort={sort}
                    />
                    <TextAction href={`/communities/${slug}/new`} tone="primary">
                      发布帖子
                    </TextAction>
                  </div>
                </div>
              </div>

              <div className="py-5">
                {postsQuery.isPending ? (
                  <div className="border-b border-border pb-5">
                    <LoadingState rows={5} />
                  </div>
                ) : null}

                {postsQuery.isError ? (
                  <ErrorState
                    title={getErrorTitle(postsQuery.error, "无法加载帖子")}
                    description={getErrorDescription(postsQuery.error)}
                    action={
                      isUnauthenticated(postsQuery.error) ? (
                        <TextAction href={loginHref} tone="primary">
                          登录
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
                ) : null}

                {postsQuery.isSuccess && posts.length === 0 ? (
                  <EmptyState
                    title="还没有帖子"
                    description="发布第一条帖子，让这个社区开始形成讨论。"
                    action={
                      <TextAction href={`/communities/${slug}/new`} tone="primary">
                        发布第一条帖子
                      </TextAction>
                    }
                  />
                ) : null}

                {postsQuery.isSuccess && posts.length > 0 ? (
                  <div className="divide-y divide-border border-b border-border">
                    {posts.map((post, index) => (
                      <PostRow key={post.id} index={index} post={post} />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <CommunityRail
              community={community}
              posts={posts}
              isPostsLoading={postsQuery.isPending}
            />
          </section>
        ) : null}
      </div>
    </main>
  );
}

function CommunityHero({
  community,
  slug,
  posts,
}: {
  community: Community;
  slug: string;
  posts: Post[];
}) {
  const totalScore = posts.reduce((total, post) => total + post.score, 0);
  const authors = new Set(posts.map((post) => post.author_id)).size;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
      <div className="min-w-0">
        <div className="font-mono text-xs uppercase text-primary">
          CUMT NEXUS / 社区现场
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <StatusToken tone="primary">/{community.slug}</StatusToken>
          <StatusToken>{formatCommunityKind(community.kind)}</StatusToken>
          <StatusToken>{formatCommunityVisibility(community.visibility)}</StatusToken>
          <StatusToken tone={getStatusTone(community.status)}>
            {formatCommunityStatus(community.status)}
          </StatusToken>
        </div>
        <h1 className="mt-4 break-words text-5xl font-black leading-[0.95] tracking-normal text-foreground md:text-6xl">
          {community.name}
        </h1>
        <p className="mt-5 max-w-3xl text-sm leading-6 text-muted-foreground">
          {community.description || "暂无描述。"}
        </p>
        <div className="mt-5 flex flex-col gap-3 border-y border-border py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            当前社区内容会在这里形成线性讨论流，发帖入口保持可见但不压过阅读焦点。
          </p>
          <TextAction href={`/communities/${slug}/new`} tone="primary">
            发布帖子
          </TextAction>
        </div>
      </div>

      <div className="grid grid-cols-3 border border-border text-center">
        <MetricBlock label="帖子" value={String(posts.length)} />
        <MetricBlock label="总分" value={String(totalScore)} />
        <MetricBlock label="作者" value={String(authors)} />
      </div>
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
      <TabsList className="rounded-none border-border bg-background p-0">
        <TabsTrigger
          value="new"
          disabled={disabled}
          className="rounded-none border-r border-border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        >
          最新
        </TabsTrigger>
        <TabsTrigger
          value="hot"
          disabled={disabled}
          className="rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        >
          热门
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

function PostRow({ index, post }: { index: number; post: Post }) {
  return (
    <Link
      href={`/posts/${post.id}`}
      className="group grid gap-4 py-5 transition-colors hover:bg-background-soft/70 md:grid-cols-[72px_minmax(0,1fr)_112px]"
    >
      <div className="flex items-center gap-3 md:block">
        <div className="font-mono text-xs text-muted-foreground">
          {String(index + 1).padStart(2, "0")}
        </div>
        <div className="mt-0 flex items-center gap-1 text-xs text-muted-foreground md:mt-4">
          <ArrowUp
            className={cn("size-3", post.my_vote === 1 ? "text-primary" : null)}
            aria-hidden="true"
          />
          <span className="font-mono">{post.upvote_count}</span>
          <ArrowDown
            className={cn("size-3", post.my_vote === -1 ? "text-primary" : null)}
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="border border-border px-2 py-0.5 font-mono">
            作者 {formatShortId(post.author_id)}
          </span>
          <span>发布于 {formatDate(post.created_at)}</span>
          <span>{formatPostStatus(post.status)}</span>
        </div>
        <h3 className="mt-3 text-xl font-semibold leading-7 tracking-normal text-foreground transition-colors group-hover:text-primary">
          {post.title}
        </h3>
        <p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          {post.body}
        </p>
      </div>

      <div className="flex items-center gap-3 text-sm text-muted-foreground md:flex-col md:items-end md:justify-center">
        <span className="border border-border bg-background px-2.5 py-1 font-mono text-foreground">
          {post.score}
        </span>
        <span className="inline-flex items-center gap-1 text-xs">
          <MessageSquare className="size-3" aria-hidden="true" />
          详情
        </span>
        <ArrowRight
          className="hidden size-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary md:block"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}

function CommunityRail({
  community,
  posts,
  isPostsLoading,
}: {
  community?: Community;
  posts: Post[];
  isPostsLoading: boolean;
}) {
  const topPosts = posts.slice(0, 3);

  return (
    <aside className="border-t border-border pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
      <div className="sticky top-6 space-y-8">
        <section className="border-b border-border pb-6">
          <div className="font-mono text-xs uppercase text-muted-foreground">
            社区上下文
          </div>
          <div className="mt-3 divide-y divide-border border-y border-border">
            <InfoRow label="状态" value={community ? formatCommunityStatus(community.status) : "--"} />
            <InfoRow label="可见性" value={community ? formatCommunityVisibility(community.visibility) : "--"} />
            <InfoRow label="创建" value={community ? formatDate(community.created_at) : "--"} />
            <InfoRow label="更新" value={community ? formatDate(community.updated_at) : "--"} />
          </div>
        </section>

        <section className="border-b border-border pb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">高分帖子</h2>
            <span className="font-mono text-xs text-muted-foreground">
              TOP {topPosts.length}
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
                  className="block py-3 transition-colors hover:text-primary"
                >
                  <div className="font-mono text-xs text-muted-foreground">
                    {post.score} 分
                  </div>
                  <div className="mt-1 line-clamp-2 text-sm font-medium">
                    {post.title}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              还没有可展示的帖子。
            </p>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold">发布前确认</h2>
          <div className="mt-3 divide-y divide-border border-y border-border">
            {["标题具体，便于被搜索和理解。", "正文写清背景、问题或观点。", "内容应属于当前社区的讨论范围。"].map(
              (item, index) => (
                <div key={item} className="flex gap-3 py-3 text-sm leading-6">
                  <span className="font-mono text-xs text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-muted-foreground">{item}</span>
                </div>
              ),
            )}
          </div>
        </section>
      </div>
    </aside>
  );
}

function formatShortId(value: string) {
  return value.slice(0, 8);
}

function formatSortLabel(sort: PostSort) {
  return sort === "hot" ? "热门" : "最新";
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
    return "需要登录";
  }

  return fallback;
}

function getErrorDescription(error: Error | null) {
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

function formatPostStatus(status: string) {
  switch (status) {
    case "visible":
      return "可见";
    case "archived":
      return "已归档";
    case "hidden":
      return "已隐藏";
    default:
      return status;
  }
}
