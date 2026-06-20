"use client";

import { useCallback } from "react";

import {
  RightRail,
  RightRailAction,
  RightRailActionList,
  RightRailSection,
} from "@/components/app-shell/right-rail";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { InfiniteListStatus } from "@/components/feedback/infinite-list-status";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { TextAction } from "@/components/ui/text-action";
import { useAuthSession } from "@/features/auth/auth-session";
import { ApiError } from "@/lib/api/client";
import { useInfiniteScrollTrigger } from "@/lib/hooks/use-infinite-scroll-trigger";

import { RedditPostListItem } from "./reddit-post-list-item";
import { useInfiniteSavedPostsQuery } from "./queries";
import type { ListPostsResponse, Post } from "./types";

export function SavedPostsPage() {
  const { isReady, token } = useAuthSession();
  const isAuthenticated = Boolean(token);
  const savedPostsQuery = useInfiniteSavedPostsQuery(
    20,
    isReady && isAuthenticated,
  );
  const postPages = savedPostsQuery.data?.pages ?? [];
  const posts = getUniquePosts(postPages);
  const isInitialPostsLoading = savedPostsQuery.isLoading && posts.length === 0;
  const hasNextPostsPage = Boolean(savedPostsQuery.hasNextPage);
  const isFetchingNextPostsPage = savedPostsQuery.isFetchingNextPage;
  const fetchNextPostsPage = savedPostsQuery.fetchNextPage;
  const loadMorePosts = useCallback(() => {
    void fetchNextPostsPage();
  }, [fetchNextPostsPage]);
  const loadMoreRef = useInfiniteScrollTrigger({
    enabled:
      isReady &&
      isAuthenticated &&
      posts.length > 0 &&
      hasNextPostsPage &&
      !isFetchingNextPostsPage,
    onLoadMore: loadMorePosts,
  });

  return (
    <div className="grid grid-cols-1 gap-0 py-2 xl:grid-cols-[minmax(0,1fr)_280px]">
      <section className="min-w-0">
        <section className="border-b border-border bg-background py-4">
          <h1 className="text-xl font-semibold leading-7 tracking-normal">
            我的收藏
          </h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            保存过的公开帖子会集中在这里，取消收藏后会从列表移除。
          </p>
        </section>

        <section className="bg-background">
          {!isReady ? (
            <div className="border-b border-border p-4">
              <LoadingState rows={5} />
            </div>
          ) : null}

          {isReady && !isAuthenticated ? (
            <div className="border-b border-border p-4">
              <EmptyState
                title="登录后查看收藏"
                description="收藏列表属于你的账号数据。登录后可以继续阅读保存过的公开帖子。"
                action={
                  <div className="flex flex-col items-stretch justify-center gap-2 sm:flex-row">
                    <TextAction href="/login?next=%2Fsaved" tone="primary">
                      去登录
                    </TextAction>
                    <TextAction href="/register?next=%2Fsaved">
                      创建账号
                    </TextAction>
                  </div>
                }
              />
            </div>
          ) : null}

          {isAuthenticated && isInitialPostsLoading ? (
            <div className="border-b border-border p-4">
              <LoadingState rows={5} />
            </div>
          ) : null}

          {isAuthenticated && savedPostsQuery.isError && posts.length === 0 ? (
            <div className="border-b border-border p-4">
              <ErrorState
                title={getErrorTitle(savedPostsQuery.error)}
                description={getErrorDescription(savedPostsQuery.error)}
                action={
                  isUnauthenticated(savedPostsQuery.error) ? (
                    <TextAction href="/login?next=%2Fsaved" tone="primary">
                      去登录
                    </TextAction>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => savedPostsQuery.refetch()}
                    >
                      重试
                    </Button>
                  )
                }
              />
            </div>
          ) : null}

          {isAuthenticated &&
          savedPostsQuery.isSuccess &&
          !savedPostsQuery.isFetching &&
          posts.length === 0 ? (
            <div className="border-b border-border p-4">
              <EmptyState
                title="还没有收藏"
                description="在信息流或帖子详情中点击收藏，帖子会出现在这里。"
                action={
                  <TextAction href="/" tone="primary">
                    信息流首页
                  </TextAction>
                }
              />
            </div>
          ) : null}

          {isAuthenticated && posts.length > 0 ? (
            <div className="space-y-2">
              {posts.map((post) => (
                <RedditPostListItem
                  key={post.id}
                  post={post}
                  source={{
                    href: "/saved",
                    label: "返回收藏",
                  }}
                />
              ))}
              <InfiniteListStatus
                ref={loadMoreRef}
                hasNextPage={hasNextPostsPage}
                isFetching={isFetchingNextPostsPage}
                loadingLabel="正在加载更多收藏"
                loadMoreLabel="加载更多收藏"
                onLoadMore={loadMorePosts}
              />
            </div>
          ) : null}
        </section>
      </section>

      <SavedPostsRail
        isAuthenticated={isAuthenticated}
        isLoading={!isReady || isInitialPostsLoading}
        posts={posts}
      />
    </div>
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

function SavedPostsRail({
  isAuthenticated,
  isLoading,
  posts,
}: {
  isAuthenticated: boolean;
  isLoading: boolean;
  posts: Post[];
}) {
  return (
    <RightRail>
      <RightRailSection
        title="收藏上下文"
        description={
          <>
            {isAuthenticated ? "当前账号" : "未登录状态"}的收藏列表
            {isLoading ? "正在加载" : `已加载 ${posts.length} 篇帖子`}。
          </>
        }
      />

      <RightRailSection title="继续浏览">
        <RightRailActionList>
          <RightRailAction href="/">信息流首页</RightRailAction>
          <RightRailAction href="/all">浏览全站</RightRailAction>
          <RightRailAction href="/communities">浏览社区</RightRailAction>
        </RightRailActionList>
      </RightRailSection>
    </RightRail>
  );
}

function isUnauthenticated(error: Error | null) {
  return error instanceof ApiError && error.code === "unauthenticated";
}

function getErrorTitle(error: Error | null) {
  if (isUnauthenticated(error)) {
    return "需要登录";
  }

  return "无法加载收藏";
}

function getErrorDescription(error: Error | null) {
  if (isUnauthenticated(error)) {
    return "请先登录后查看你的收藏列表。";
  }

  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}

