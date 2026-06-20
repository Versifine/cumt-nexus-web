"use client";

import { useCallback, useState } from "react";
import Link from "next/link";

import { rememberPostNavigationSource } from "@/components/app-shell/post-navigation-source";
import {
  RightRailRaisedList,
  RightRailSection,
} from "@/components/app-shell/right-rail";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { InfiniteListStatus } from "@/components/feedback/infinite-list-status";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { TextAction } from "@/components/ui/text-action";
import { useAuthSession } from "@/features/auth/auth-session";
import { PostSortMenu } from "@/features/post/post-sort-menu";
import { useInfiniteUserPostsQuery } from "@/features/post/queries";
import { RedditPostListItem } from "@/features/post/reddit-post-list-item";
import {
  formatPostSortFallbackNotice,
  formatPostSortLabel,
} from "@/features/post/sort";
import type { ListPostsResponse, Post, PostSort } from "@/features/post/types";
import { ApiError } from "@/lib/api/client";
import { useInfiniteScrollTrigger } from "@/lib/hooks/use-infinite-scroll-trigger";

import {
  PublicUserLayout,
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
  const { isReady, token } = useAuthSession();
  const [sort, setSort] = useState<PostSort>("new");
  const profileQuery = usePublicUserQuery(username, isReady, initialProfileData);
  const user = profileQuery.data?.user;
  const canRequestPosts = isReady && profileQuery.isSuccess && Boolean(user);
  const postsQuery = useInfiniteUserPostsQuery(
    username,
    20,
    canRequestPosts,
    sort,
    sort === "new" && !token ? initialPostsData : undefined,
  );
  const postPages = postsQuery.data?.pages ?? [];
  const firstPostPage = postPages[0];
  const posts = canRequestPosts ? getUniquePosts(postPages) : [];
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
      canRequestPosts &&
      posts.length > 0 &&
      hasNextPostsPage &&
      !isFetchingNextPostsPage,
    onLoadMore: loadMorePosts,
  });

  if (!isReady || profileQuery.isPending) {
    return (
      <div className="py-4">
        <section className="bg-background p-4">
          <LoadingState rows={4} />
        </section>
      </div>
    );
  }

  if (profileQuery.isError) {
    return (
      <div className="py-4">
        <section className="bg-background p-4">
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
        <div className="flex flex-col gap-3 border-b border-border py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">公开帖子</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              已加载 {posts.length} 篇 / 共 {user.stats.post_count} 篇
              {sortFallbackNotice ? ` · ${sortFallbackNotice}` : ""}
            </p>
          </div>
          <PostSortMenu
            aria-label="选择用户帖子排序方式"
            disabled={isInitialPostsLoading}
            onSortChange={setSort}
            sort={sort}
          />
        </div>

        {isInitialPostsLoading ? (
          <div className="p-4">
            <LoadingState rows={5} />
          </div>
        ) : null}

        {postsQuery.isError && posts.length === 0 ? (
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

        {postsQuery.isSuccess && !postsQuery.isFetching && posts.length === 0 ? (
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

        {posts.length > 0 ? (
          <div className="space-y-2">
            {posts.map((post) => (
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
    </PublicUserLayout>
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
      <RightRailSection title="当前内容">
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          按 {formatPostSortLabel(sort)} 排序，已加载{" "}
          <span className="font-mono text-foreground">{posts.length}</span>{" "}
          篇公开帖子。
        </p>
      </RightRailSection>

      <RightRailSection title="本页高分帖子" meta={topPosts.length}>
        {topPosts.length > 0 ? (
          <RightRailRaisedList>
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
                className="block px-3 py-2.5 text-sm transition-colors first:rounded-t-md last:rounded-b-md hover:bg-surface-hover hover:text-primary"
              >
                <div className="font-mono text-xs text-muted-foreground">
                  {post.score} 分 / {post.comment_count} 条评论
                </div>
                <div className="mt-1 line-clamp-2 font-medium">{post.title}</div>
              </Link>
            ))}
          </RightRailRaisedList>
        ) : (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            暂无可展示的公开帖子。
          </p>
        )}
      </RightRailSection>
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
