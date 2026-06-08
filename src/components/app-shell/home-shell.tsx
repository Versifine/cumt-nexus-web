"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  rememberPostNavigationSource,
  type PostNavigationSource,
} from "@/components/app-shell/post-navigation-source";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TextAction } from "@/components/ui/text-action";
import { useAuthSession } from "@/features/auth/auth-session";
import { useLatestPostsQuery } from "@/features/post/queries";
import { RedditPostListItem } from "@/features/post/reddit-post-list-item";
import {
  formatPostSortFallbackNotice,
  formatPostSortLabel,
  postSortItems,
} from "@/features/post/sort";
import type {
  FeedSource,
  ListPostsResponse,
  Post,
  PostSort,
} from "@/features/post/types";
import { ApiError } from "@/lib/api/client";

const guideItems = [
  "先进入具体社区，再发布帖子。",
  "投票会改变帖子分数，取消投票会恢复状态。",
  "社区申请通过前不会创建公开社区。",
];

const feedSortHrefs: Record<PostSort, string> = {
  best: "/",
  hot: "/hot",
  new: "/new",
  top: "/top",
  rising: "/rising",
};

type HomeShellProps = {
  initialPostsData?: ListPostsResponse;
  initialSort?: PostSort;
  source?: FeedSource;
};

type PostSourceContext = Omit<PostNavigationSource, "postId">;

export function HomeShell({
  initialPostsData,
  initialSort = "new",
  source = "recommended",
}: HomeShellProps) {
  const { isReady } = useAuthSession();
  const router = useRouter();
  const pathname = usePathname();
  const sort = initialSort;
  const postSource = getHomePostSource(pathname, sort);
  const canReadLatestPosts = isReady;
  const latestPostsQuery = useLatestPostsQuery(
    20,
    0,
    canReadLatestPosts,
    sort,
    source,
    initialPostsData,
  );
  const posts = canReadLatestPosts ? (latestPostsQuery.data?.posts ?? []) : [];
  const sortFallbackNotice = formatPostSortFallbackNotice(
    latestPostsQuery.data?.requested_sort,
    latestPostsQuery.data?.effective_sort,
  );

  return (
    <div className="grid grid-cols-1 gap-0 xl:grid-cols-[minmax(0,1fr)_312px]">
      <section className="min-w-0">
        <section className="border border-border bg-background">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="px-3 py-3 sm:px-4">
              <h1 className="text-base font-semibold text-foreground">
                {formatPostSortLabel(sort)}讨论
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                公开信息流
              </p>
              {sortFallbackNotice ? (
                <p className="mt-2 max-w-2xl text-xs leading-5 text-warning">
                  {sortFallbackNotice}
                </p>
              ) : null}
            </div>
            <div className="px-3 pb-3 sm:px-4 sm:pb-0">
              <FeedSortTabs
                disabled={!canReadLatestPosts || latestPostsQuery.isFetching}
                onSortChange={(nextSort) => {
                  if (nextSort !== sort) {
                    router.push(getHomeFeedHref(nextSort));
                  }
                }}
                sort={sort}
              />
            </div>
          </div>
        </section>

        <section className="mt-3 border-x border-border bg-background">
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
            <div>
              {posts.map((post) => (
                <RedditPostListItem
                  key={post.id}
                  post={post}
                  source={postSource}
                />
              ))}
            </div>
          ) : null}
        </section>
      </section>

      <RightRail
        canReadLatestPosts={canReadLatestPosts}
        posts={posts}
        sortFallbackNotice={sortFallbackNotice}
        source={postSource}
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
      <TabsList className="max-w-full justify-start overflow-x-auto rounded-none border-border bg-background p-0">
        <TabsTrigger
          value="best"
          disabled={disabled}
          className="rounded-none border-r border-border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        >
          推荐
        </TabsTrigger>
        {postSortItems.slice(1).map((item) => (
          <TabsTrigger
            key={item.value}
            value={item.value}
            disabled={disabled}
            className="rounded-none border-r border-border last:border-r-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

function getHomeFeedHref(sort: PostSort) {
  return feedSortHrefs[sort] ?? "/";
}

function getHomePostSource(pathname: string, sort: PostSort): PostSourceContext {
  if (pathname === "/hot" || sort === "hot") {
    return {
      href: "/hot",
      label: "返回热门",
    };
  }

  if (pathname === "/new") {
    return {
      href: "/new",
      label: "返回最新",
    };
  }

  if (pathname === "/top" || sort === "top") {
    return {
      href: "/top",
      label: "返回最高",
    };
  }

  if (pathname === "/rising" || sort === "rising") {
    return {
      href: "/rising",
      label: "返回上升",
    };
  }

  return {
    href: "/",
    label: "返回首页",
  };
}

function RightRail({
  canReadLatestPosts,
  posts,
  sortFallbackNotice,
  source,
  sort,
}: {
  canReadLatestPosts: boolean;
  posts: Post[];
  sortFallbackNotice: string | null;
  source: PostSourceContext;
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
          <h2 className="mt-3 text-lg font-semibold leading-7">
            今天从{formatPostSortLabel(sort)}讨论开始。
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {sortFallbackNotice ??
              "排序由后端返回结果决定，右侧只保留和当前信息流有关的上下文。"}
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
                      href: source.href,
                      label: source.label,
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
    return "公开信息流暂时无法读取。可以先浏览社区，或登录后再试。";
  }

  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}
