"use client";

import { useState } from "react";
import Link from "next/link";

import { rememberPostNavigationSource } from "@/components/app-shell/post-navigation-source";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { StatusToken } from "@/components/ui/data-display";
import { SortMenu } from "@/components/ui/sort-menu";
import { TextAction } from "@/components/ui/text-action";
import { useAuthSession } from "@/features/auth/auth-session";
import { useUserPostsQuery } from "@/features/post/queries";
import { RedditPostListItem } from "@/features/post/reddit-post-list-item";
import {
  formatPostSortFallbackNotice,
  formatPostSortLabel,
  postSortItems,
} from "@/features/post/sort";
import type { ListPostsResponse, Post, PostSort } from "@/features/post/types";
import { ApiError } from "@/lib/api/client";

import {
  PublicUserLayout,
  ProfileMetric,
  getDisplayName,
} from "./public-user-layout";
import { usePublicUserQuery } from "./queries";
import type { GetPublicUserResponse } from "./types";

type PublicUserPostsProps = {
  initialPostsData?: ListPostsResponse;
  initialProfileData?: GetPublicUserResponse;
  sourceHref?: string;
  sourceLabel?: string;
  username: string;
};

export function PublicUserPosts({
  initialPostsData,
  initialProfileData,
  sourceHref,
  sourceLabel,
  username,
}: PublicUserPostsProps) {
  const { isReady } = useAuthSession();
  const [sort, setSort] = useState<PostSort>("new");
  const profileQuery = usePublicUserQuery(username, isReady, initialProfileData);
  const user = profileQuery.data?.user;
  const canRequestPosts = isReady && profileQuery.isSuccess && Boolean(user);
  const postsQuery = useUserPostsQuery(
    username,
    20,
    0,
    canRequestPosts,
    sort,
    sort === "new" ? initialPostsData : undefined,
  );
  const posts = canRequestPosts ? (postsQuery.data?.posts ?? []) : [];
  const sortFallbackNotice = formatPostSortFallbackNotice(
    postsQuery.data?.requested_sort,
    postsQuery.data?.effective_sort,
  );

  if (!isReady || profileQuery.isPending) {
    return (
      <div className="py-4">
        <section className="border border-border bg-background p-4">
          <LoadingState rows={4} />
        </section>
      </div>
    );
  }

  if (profileQuery.isError) {
    return (
      <div className="py-4">
        <section className="border border-border bg-background p-4">
          {isNotFound(profileQuery.error) ? (
            <EmptyState
              title="没有找到这个用户"
              description="这个用户名不存在，或该账号当前不可公开访问。"
              action={
                <TextAction href="/communities" tone="primary">
                  浏览社区
                </TextAction>
              }
            />
          ) : (
            <ErrorState
              title={getErrorTitle(profileQuery.error, "无法加载用户主页")}
              description={getErrorDescription(profileQuery.error)}
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => profileQuery.refetch()}
                >
                  重试
                </Button>
              }
            />
          )}
        </section>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <PublicUserLayout
      activeTab="posts"
      railContent={
        <UserPostsRail
          posts={posts}
          sort={sort}
          sourceHref={
            sourceHref ?? `/users/${encodeURIComponent(user.username)}/posts`
          }
          sourceLabel={sourceLabel ?? `返回 @${user.username} 的帖子`}
        />
      }
      user={user}
    >
      <section className="bg-background">
        <div className="flex flex-col gap-3 bg-background-soft/50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusToken tone="primary">帖子视图</StatusToken>
            <StatusToken>当前页 {posts.length}</StatusToken>
            <StatusToken>公开帖子 {user.stats.post_count}</StatusToken>
            {sortFallbackNotice ? (
              <StatusToken tone="warning">{sortFallbackNotice}</StatusToken>
            ) : null}
          </div>
          <UserPostSortMenu
            disabled={postsQuery.isFetching}
            onSortChange={setSort}
            sort={sort}
          />
        </div>

        {postsQuery.isPending ? (
          <div className="p-4">
            <LoadingState rows={5} />
          </div>
        ) : null}

        {postsQuery.isError ? (
          <div className="p-4">
            <ErrorState
              title={getErrorTitle(postsQuery.error, "无法加载公开帖子")}
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
          <div className="p-4">
            <EmptyState
              title="还没有公开帖子"
              description="这个用户还没有发布可公开浏览的帖子。"
              action={
                <TextAction href="/communities" tone="primary">
                  浏览社区
                </TextAction>
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
                  href:
                    sourceHref ??
                    `/users/${encodeURIComponent(user.username)}/posts`,
                  label: sourceLabel ?? `返回 @${user.username} 的帖子`,
                }}
                authorFallback={{
                  avatarUrl: user.avatar_url,
                  displayName: getDisplayName(user),
                  username: user.username,
                }}
              />
            ))
          : null}
      </section>
    </PublicUserLayout>
  );
}

function UserPostSortMenu({
  disabled,
  onSortChange,
  sort,
}: {
  disabled: boolean;
  onSortChange: (sort: PostSort) => void;
  sort: PostSort;
}) {
  return (
    <SortMenu
      align="start"
      aria-label="选择用户帖子排序方式"
      disabled={disabled}
      items={postSortItems}
      onValueChange={onSortChange}
      value={sort}
    />
  );
}

function UserPostsRail({
  posts,
  sort,
  sourceHref,
  sourceLabel,
}: {
  posts: Post[];
  sort: PostSort;
  sourceHref: string;
  sourceLabel: string;
}) {
  const topPosts = [...posts]
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);

  return (
    <>
      <section className="bg-background-soft/35 px-4 py-4">
        <h2 className="text-sm font-semibold">当前内容</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <ProfileMetric label="排序" value={formatPostSortLabel(sort)} />
          <ProfileMetric label="当前页" value={String(posts.length)} />
        </div>
      </section>

      <section className="bg-background-soft/35 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">本页高分帖子</h2>
          <span className="font-mono text-xs text-muted-foreground">
            {topPosts.length}
          </span>
        </div>
        {topPosts.length > 0 ? (
          <div className="mt-2">
            {topPosts.map((post) => (
              <Link
                key={post.id}
                href={`/posts/${post.id}`}
                onClick={() =>
                  rememberPostNavigationSource({
                    href: sourceHref,
                    label: sourceLabel,
                    postId: post.id,
                  })
                }
                className="block py-3 text-sm transition-colors hover:text-primary"
              >
                <div className="font-mono text-xs text-muted-foreground">
                  {post.score} 分 / {post.comment_count} 条评论
                </div>
                <div className="mt-1 line-clamp-2 font-medium">{post.title}</div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            暂无可展示的公开帖子。
          </p>
        )}
      </section>
    </>
  );
}

function isNotFound(error: Error | null) {
  return error instanceof ApiError && error.code === "not_found";
}

function isUnauthenticated(error: Error | null) {
  return error instanceof ApiError && error.code === "unauthenticated";
}

function getErrorTitle(error: Error | null, fallback: string) {
  if (isUnauthenticated(error)) {
    return "公开用户帖子暂不可读";
  }

  return fallback;
}

function getErrorDescription(error: Error | null) {
  if (isUnauthenticated(error)) {
    return "这个用户的公开帖子暂时无法读取。可以先登录，或稍后再试。";
  }

  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}
