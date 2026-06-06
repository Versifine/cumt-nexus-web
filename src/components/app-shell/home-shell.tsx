"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowDown, ArrowUp, MessageSquare } from "lucide-react";

import { rememberPostNavigationSource } from "@/components/app-shell/post-navigation-source";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { MetricBlock } from "@/components/ui/data-display";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TextAction } from "@/components/ui/text-action";
import { useAuthSession } from "@/features/auth/auth-session";
import { useLatestPostsQuery } from "@/features/post/queries";
import type { Post, PostSort } from "@/features/post/types";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const guideItems = [
  "先进入具体社区，再发布帖子。",
  "投票会改变帖子分数，取消投票会恢复状态。",
  "社区申请通过前不会创建公开社区。",
];

export function HomeShell() {
  const { isReady } = useAuthSession();
  const [sort, setSort] = useState<PostSort>("new");
  const canReadLatestPosts = isReady;
  const latestPostsQuery = useLatestPostsQuery(20, 0, canReadLatestPosts, sort);
  const posts = canReadLatestPosts ? (latestPostsQuery.data?.posts ?? []) : [];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px]">
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="min-w-0"
      >
        <section className="border-b border-border pb-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="font-mono text-xs uppercase text-primary">
                CUMT NEXUS / 最新讨论
              </div>
              <h1 className="mt-4 text-5xl font-black leading-[0.95] tracking-normal text-foreground md:text-6xl 2xl:text-7xl">
                <span className="block whitespace-nowrap">校园里的</span>
                <span className="block whitespace-nowrap">最新讨论</span>
              </h1>
            </div>

            <div className="grid grid-cols-3 border border-border text-center sm:min-w-80">
              <MetricBlock label="帖子" value={String(posts.length)} />
              <MetricBlock
                label="总分"
                value={String(
                  posts.reduce((total, post) => total + post.score, 0),
                )}
              />
              <MetricBlock
                label="状态"
                value={canReadLatestPosts ? formatSortLabel(sort) : "准备中"}
              />
            </div>
          </div>
        </section>

        <section className="border-b border-border py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">社区信息流</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                公开帖子流会直接展示给访客；登录后同一接口补充投票状态和个人权限。
              </p>
            </div>
            <FeedSortTabs
              disabled={!canReadLatestPosts || latestPostsQuery.isFetching}
              onSortChange={setSort}
              sort={sort}
            />
          </div>
        </section>

        <section>
          {!isReady ? (
            <div className="border-b border-border py-5">
              <LoadingState rows={5} />
            </div>
          ) : null}

          {canReadLatestPosts && latestPostsQuery.isLoading ? (
            <div className="border-b border-border py-5">
              <LoadingState rows={5} />
            </div>
          ) : null}

          {canReadLatestPosts && latestPostsQuery.isError ? (
            <div className="py-5">
              <ErrorState
                title={getErrorTitle(latestPostsQuery.error)}
                description={getErrorDescription(latestPostsQuery.error)}
                action={
                  isUnauthenticated(latestPostsQuery.error) ? (
                    <TextAction href="/communities" tone="primary">
                      浏览社区
                    </TextAction>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => latestPostsQuery.refetch()}
                    >
                      重试
                    </Button>
                  )
                }
              />
            </div>
          ) : null}

          {canReadLatestPosts &&
          latestPostsQuery.isSuccess &&
          posts.length === 0 ? (
            <div className="py-5">
              <EmptyState
                title="还没有帖子"
                description="公开社区开始发布内容后，最新帖子会出现在这里。"
                action={<TextAction href="/communities">去社区看看</TextAction>}
              />
            </div>
          ) : null}

          {canReadLatestPosts &&
          latestPostsQuery.isSuccess &&
          posts.length > 0 ? (
            <div className="divide-y divide-border border-b border-border">
              {posts.map((post, index) => (
                <LatestPostRow key={post.id} index={index} post={post} />
              ))}
            </div>
          ) : null}
        </section>
      </motion.section>

      <RightRail
        canReadLatestPosts={canReadLatestPosts}
        posts={posts}
        sort={sort}
      />
    </div>
  );
}

function FeedSortTabs({
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

function LatestPostRow({ index, post }: { index: number; post: Post }) {
  return (
    <Link
      href={`/posts/${post.id}`}
      onClick={() =>
        rememberPostNavigationSource({
          href: "/",
          label: "返回首页",
          postId: post.id,
        })
      }
      className="group grid gap-4 py-5 transition-colors hover:bg-background-soft/70 md:grid-cols-[72px_minmax(0,1fr)_96px]"
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
            社区 {formatShortId(post.community_id)}
          </span>
          <span>作者 {formatShortId(post.author_id)}</span>
          <span>发布于 {formatDate(post.created_at)}</span>
        </div>
        <h2 className="mt-3 text-xl font-semibold leading-7 tracking-normal text-foreground transition-colors group-hover:text-primary">
          {post.title}
        </h2>
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
          讨论
        </span>
      </div>
    </Link>
  );
}

function RightRail({
  canReadLatestPosts,
  posts,
  sort,
}: {
  canReadLatestPosts: boolean;
  posts: Post[];
  sort: PostSort;
}) {
  const topPosts = posts.slice(0, 3);

  return (
    <aside className="border-t border-border bg-background-soft/45 px-4 py-6 md:px-6 xl:border-l xl:border-t-0">
      <div className="sticky top-20 space-y-8">
        <section className="border-b border-border pb-6">
          <div className="font-mono text-xs uppercase text-muted-foreground">
            右侧上下文
          </div>
          <h2 className="mt-3 text-2xl font-black leading-tight">
            今天从{formatSortLabel(sort)}讨论开始。
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            排序由后端返回结果决定，右侧只保留和当前信息流有关的上下文。
          </p>
          <div className="mt-4 flex flex-col border-y border-border">
            <TextAction href="/communities" tone="primary" variant="bar">
              选择社区
            </TextAction>
            <TextAction href="/community-applications/new" variant="bar">
              申请社区
            </TextAction>
          </div>
        </section>

        <section className="border-b border-border pb-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">高分讨论</h3>
            <span className="font-mono text-xs text-muted-foreground">
              TOP {topPosts.length}
            </span>
          </div>
          {topPosts.length > 0 ? (
            <div className="divide-y divide-border">
              {topPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/posts/${post.id}`}
                  onClick={() =>
                    rememberPostNavigationSource({
                      href: "/",
                      label: "返回首页",
                      postId: post.id,
                    })
                  }
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
              {canReadLatestPosts
                ? "等待帖子数据加载后展示。"
                : "正在准备公开帖子流。"}
            </p>
          )}
        </section>

        <section>
          <h3 className="text-sm font-semibold">社区使用提示</h3>
          <div className="mt-3 divide-y divide-border border-y border-border">
            {guideItems.map((item, index) => (
              <div key={item} className="flex gap-3 py-3 text-sm leading-6">
                <span className="font-mono text-xs text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
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

function getErrorTitle(error: Error | null) {
  if (isUnauthenticated(error)) {
    return "公开信息流暂不可读";
  }

  return "无法加载最新帖子";
}

function getErrorDescription(error: Error | null) {
  if (isUnauthenticated(error)) {
    return "前端已按游客身份请求公开帖子流；如果仍返回认证错误，需要后端保持 optional Bearer 公开读取合同。";
  }

  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}
