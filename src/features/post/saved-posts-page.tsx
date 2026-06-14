"use client";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { TextAction } from "@/components/ui/text-action";
import { useAuthSession } from "@/features/auth/auth-session";
import { ApiError } from "@/lib/api/client";

import { RedditPostListItem } from "./reddit-post-list-item";
import { useSavedPostsQuery } from "./queries";
import type { Post } from "./types";

export function SavedPostsPage() {
  const { isReady, token } = useAuthSession();
  const isAuthenticated = Boolean(token);
  const savedPostsQuery = useSavedPostsQuery(20, 0, isReady && isAuthenticated);
  const posts = savedPostsQuery.data?.posts ?? [];

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

          {isAuthenticated && savedPostsQuery.isLoading ? (
            <div className="border-b border-border p-4">
              <LoadingState rows={5} />
            </div>
          ) : null}

          {isAuthenticated && savedPostsQuery.isError ? (
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

          {isAuthenticated && savedPostsQuery.isSuccess && posts.length > 0
            ? posts.map((post) => (
                <RedditPostListItem
                  key={post.id}
                  post={post}
                  source={{
                    href: "/saved",
                    label: "返回收藏",
                  }}
                />
              ))
            : null}
        </section>
      </section>

      <SavedPostsRail
        isAuthenticated={isAuthenticated}
        isLoading={!isReady || savedPostsQuery.isLoading}
        posts={posts}
      />
    </div>
  );
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
    <aside className="border-t border-border py-5 xl:border-l xl:border-t-0 xl:pl-5">
      <div className="sticky top-20 right-rail-scroll space-y-6">
        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">收藏上下文</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {isAuthenticated ? "当前账号" : "未登录状态"}的收藏列表
            {isLoading ? "正在加载" : `当前页有 ${posts.length} 篇帖子`}。
          </p>
        </section>

        <section>
          <h2 className="text-sm font-semibold">继续浏览</h2>
          <div className="mt-3 flex flex-col border-t border-border">
            <TextAction href="/" variant="bar">
              信息流首页
            </TextAction>
            <TextAction href="/all" variant="bar">
              浏览全站
            </TextAction>
            <TextAction href="/communities" variant="bar">
              浏览社区
            </TextAction>
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

