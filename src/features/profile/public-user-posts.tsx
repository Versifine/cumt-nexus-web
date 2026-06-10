"use client";

import { useState } from "react";
import Link from "next/link";

import { rememberPostNavigationSource } from "@/components/app-shell/post-navigation-source";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { InfoRow } from "@/components/ui/data-display";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  formatDate,
  getDisplayName,
} from "./public-user-layout";
import { usePublicUserQuery } from "./queries";
import type { GetPublicUserResponse, PublicUser } from "./types";

type PublicUserPostsProps = {
  initialPostsData?: ListPostsResponse;
  initialProfileData?: GetPublicUserResponse;
  username: string;
};

export function PublicUserPosts({
  initialPostsData,
  initialProfileData,
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
      railContent={<UserPostsRail posts={posts} sort={sort} user={user} />}
      user={user}
    >
      <section className="mt-3 border-x border-border bg-background">
        <div className="flex min-h-12 flex-col gap-3 border-b border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">公开帖子</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              当前按{formatPostSortLabel(sort)}排序，帖子预览复用全站信息流规则。
            </p>
            {sortFallbackNotice ? (
              <p className="mt-2 max-w-2xl text-xs leading-5 text-warning">
                {sortFallbackNotice}
              </p>
            ) : null}
          </div>
          <UserPostSortTabs
            disabled={postsQuery.isFetching}
            onSortChange={setSort}
            sort={sort}
          />
        </div>

        {postsQuery.isPending ? (
          <div className="border-b border-border p-4">
            <LoadingState rows={5} />
          </div>
        ) : null}

        {postsQuery.isError ? (
          <div className="border-b border-border p-4">
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
          <div className="border-b border-border p-4">
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
                  href: `/users/${encodeURIComponent(user.username)}/posts`,
                  label: `返回 @${user.username} 的帖子`,
                }}
                authorFallback={{
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

function UserPostSortTabs({
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

function UserPostsRail({
  posts,
  sort,
  user,
}: {
  posts: Post[];
  sort: PostSort;
  user: PublicUser;
}) {
  const topPosts = [...posts].sort((left, right) => right.score - left.score).slice(0, 3);

  return (
    <>
      <section className="border-b border-border pb-5">
        <h2 className="text-sm font-semibold">帖子上下文</h2>
        <div className="mt-3 divide-y divide-border border-y border-border">
          <InfoRow label="排序" value={formatPostSortLabel(sort)} />
          <InfoRow label="当前页" value={String(posts.length)} />
          <InfoRow label="公开帖子" value={String(user.stats.post_count)} />
          <InfoRow label="加入" value={formatDate(user.created_at)} />
        </div>
      </section>

      <section className="border-b border-border pb-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">高分帖子</h2>
          <span className="font-mono text-xs text-muted-foreground">
            {topPosts.length}
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
                    href: `/users/${encodeURIComponent(user.username)}/posts`,
                    label: `返回 @${user.username} 的帖子`,
                    postId: post.id,
                  })
                }
                className="block py-3 transition-colors hover:text-primary"
              >
                <div className="font-mono text-xs text-muted-foreground">
                  {post.score} 分 / {post.comment_count} 条评论
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
