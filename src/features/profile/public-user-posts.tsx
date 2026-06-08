"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import Link from "next/link";
import { User } from "lucide-react";

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
import type { ListPostsResponse, Post, PostSort } from "@/features/post/types";
import { ApiError } from "@/lib/api/client";

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

  return (
    <div className="grid grid-cols-1 gap-0 py-4 xl:grid-cols-[minmax(0,1fr)_312px]">
      <div className="min-w-0">
        <TextAction href={`/users/${encodeURIComponent(username)}`} variant="bar">
          返回用户主页
        </TextAction>

        <section className="mt-3 border border-border bg-background">
          {!isReady || profileQuery.isPending ? (
            <div className="p-4">
              <LoadingState rows={3} />
            </div>
          ) : profileQuery.isError ? (
            <div className="p-4">
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
            </div>
          ) : user ? (
            <UserPostsHeader posts={posts} user={user} />
          ) : null}
        </section>

        {user ? (
          <section className="mt-3 border-x border-border bg-background">
            <div className="flex min-h-12 flex-col gap-3 border-b border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold">公开帖子</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  当前按{formatSortLabel(sort)}排序
                </p>
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
        ) : null}
      </div>

      {user ? <UserPostsRail user={user} posts={posts} sort={sort} /> : null}
    </div>
  );
}

function UserPostsHeader({
  posts,
  user,
}: {
  posts: Post[];
  user: PublicUser;
}) {
  const displayName = getDisplayName(user);
  const totalScore = posts.reduce((total, post) => total + post.score, 0);

  return (
    <div className="grid gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-3">
          <ProfileAvatar user={user} />
          <div className="min-w-0">
            <h1 className="break-words text-xl font-semibold leading-7 tracking-normal text-foreground sm:text-2xl">
              {displayName} 的帖子
            </h1>
            <p className="mt-1 truncate font-mono text-xs text-primary">
              @{user.username}
            </p>
          </div>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          {user.headline || "这个用户还没有写个人签名。"}
        </p>
      </div>

      <div className="grid grid-cols-3 border border-border text-center">
        <HeaderMetric label="公开帖子" value={String(user.stats.post_count)} />
        <HeaderMetric label="当前页" value={String(posts.length)} />
        <HeaderMetric label="总分" value={String(totalScore)} />
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
      <TabsList className="h-9 rounded-none border border-border bg-background p-0">
        <TabsTrigger
          value="new"
          disabled={disabled}
          className="h-9 rounded-none border-r border-border px-3 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        >
          最新
        </TabsTrigger>
        <TabsTrigger
          value="hot"
          disabled={disabled}
          className="h-9 rounded-none px-3 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        >
          热门
        </TabsTrigger>
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
    <aside className="border-t border-border bg-background-soft/45 px-4 py-5 xl:border-l xl:border-t-0">
      <div className="sticky top-20 space-y-5">
        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">用户上下文</h2>
          <div className="mt-3 divide-y divide-border border-y border-border">
            <InfoRow label="昵称" value={getDisplayName(user)} />
            <InfoRow label="用户名" value={`@${user.username}`} />
            <InfoRow label="排序" value={formatSortLabel(sort)} />
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

        <section>
          <h2 className="text-sm font-semibold">继续浏览</h2>
          <div className="mt-3 flex flex-col border-y border-border">
            <TextAction
              href={`/users/${encodeURIComponent(user.username)}`}
              variant="bar"
            >
              返回用户主页
            </TextAction>
            <TextAction
              href={`/users/${encodeURIComponent(user.username)}/comments`}
              variant="bar"
            >
              查看公开评论
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

function ProfileAvatar({ user }: { user: PublicUser }) {
  if (user.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={`${getDisplayName(user)} 的头像`}
        className="size-12 shrink-0 rounded-full border border-border object-cover"
      />
    );
  }

  return (
    <div
      className="flex size-12 shrink-0 items-center justify-center rounded-full border border-border bg-secondary font-black text-primary"
      aria-label={`${getDisplayName(user)} 的头像占位`}
    >
      <User className="size-5" aria-hidden="true" />
    </div>
  );
}

function getDisplayName(user: PublicUser) {
  return user.display_name || user.username;
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
