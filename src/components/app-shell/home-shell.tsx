"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import {
  rememberPostNavigationSource,
  type PostNavigationSource,
} from "@/components/app-shell/post-navigation-source";
import {
  RightRail as AppRightRail,
  RightRailAction,
  RightRailActionList,
  RightRailRaisedList,
  RightRailSection,
} from "@/components/app-shell/right-rail";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { TextAction } from "@/components/ui/text-action";
import { useAuthSession } from "@/features/auth/auth-session";
import {
  formatFeedSourceDescription,
  formatFeedSourceLabel,
  getFeedHref,
  getFeedReturnLabel,
} from "@/features/feed/source";
import { PostSortMenu } from "@/features/post/post-sort-menu";
import {
  prefetchInfiniteLatestPostsQuery,
  useInfiniteLatestPostsQuery,
} from "@/features/post/queries";
import { RedditPostListItem } from "@/features/post/reddit-post-list-item";
import {
  formatPostSortFallbackNotice,
  formatPostSortLabel,
} from "@/features/post/sort";
import type {
  FeedSource,
  ListPostsResponse,
  Post,
  PostSort,
} from "@/features/post/types";
import { ApiError } from "@/lib/api/client";

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
  const { isReady, token } = useAuthSession();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const sort = initialSort;
  const requiresAuth = source === "following";
  const isFollowingFeed = source === "following";
  const postSource = getHomePostSource(pathname, source, sort);
  const canReadLatestPosts = isReady && (!requiresAuth || Boolean(token));
  const viewerInitialPostsData = token ? undefined : initialPostsData;
  const latestPostsQuery = useInfiniteLatestPostsQuery(
    20,
    canReadLatestPosts,
    sort,
    source,
    viewerInitialPostsData,
  );
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const feedPages = latestPostsQuery.data?.pages ?? [];
  const firstFeedPage = feedPages[0];
  const posts = canReadLatestPosts ? getUniqueFeedPosts(feedPages) : [];
  const sortFallbackNotice = formatPostSortFallbackNotice(
    firstFeedPage?.requested_sort,
    firstFeedPage?.effective_sort,
  );
  const hasPosts = posts.length > 0;
  const hasNextPostsPage = Boolean(latestPostsQuery.hasNextPage);
  const isFetchingNextPostsPage = latestPostsQuery.isFetchingNextPage;
  const isInitialPostsLoading =
    canReadLatestPosts && latestPostsQuery.isLoading && !hasPosts;
  const isSyncingPosts =
    canReadLatestPosts &&
    latestPostsQuery.isFetching &&
    !isFetchingNextPostsPage &&
    hasPosts;
  const fetchNextPostsPage = latestPostsQuery.fetchNextPage;

  useEffect(() => {
    if (!canReadLatestPosts || isInitialPostsLoading) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const warmSources: FeedSource[] = token
        ? ["recommended", "all", "following"]
        : ["recommended", "all"];

      for (const warmSource of warmSources) {
        if (warmSource === source) {
          continue;
        }

        void prefetchInfiniteLatestPostsQuery(queryClient, {
          limit: 20,
          offset: 0,
          sort,
          source: warmSource,
        });
      }
    }, 260);

    return () => window.clearTimeout(timeoutId);
  }, [
    canReadLatestPosts,
    isInitialPostsLoading,
    queryClient,
    sort,
    source,
    token,
  ]);

  useEffect(() => {
    if (
      !canReadLatestPosts ||
      !hasPosts ||
      !hasNextPostsPage ||
      isFetchingNextPostsPage
    ) {
      return;
    }

    const node = loadMoreRef.current;

    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void fetchNextPostsPage();
        }
      },
      {
        rootMargin: "520px 0px",
      },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [
    canReadLatestPosts,
    fetchNextPostsPage,
    hasNextPostsPage,
    hasPosts,
    isFetchingNextPostsPage,
  ]);

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
      <section className="min-w-0">
        <div className="space-y-4">
          <div className="rounded-lg bg-surface px-4 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <h1 className="text-xl font-semibold leading-7 text-foreground">
                  {formatFeedSourceLabel(source)}讨论
                </h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                  {getFeedIntroText(source, sort, Boolean(token))}
                </p>
                {sortFallbackNotice ? (
                  <p className="mt-2 max-w-2xl text-xs leading-5 text-warning">
                    {sortFallbackNotice}
                  </p>
                ) : null}
                {isSyncingPosts ? (
                  <p
                    className="mt-2 inline-flex items-center gap-2 rounded-sm bg-primary-muted px-2 py-1 text-xs font-medium text-primary"
                    aria-live="polite"
                  >
                    <span
                      className="size-1.5 rounded-full bg-primary"
                      aria-hidden="true"
                    />
                    正在同步最新内容
                  </p>
                ) : null}
              </div>
              <div className="flex max-w-full sm:items-end">
                <PostSortMenu
                  aria-label="选择信息流排序方式"
                  disabled={!canReadLatestPosts || isInitialPostsLoading}
                  onSortChange={(nextSort) => {
                    if (nextSort !== sort) {
                      router.push(getFeedHref(source, nextSort));
                    }
                  }}
                  sort={sort}
                />
              </div>
            </div>
          </div>

          {!isReady ? (
            <div className="rounded-lg bg-surface px-4 py-5">
              <LoadingState rows={5} />
            </div>
          ) : null}

          {isInitialPostsLoading ? (
            <div className="rounded-lg bg-surface px-4 py-5">
              <LoadingState rows={5} />
            </div>
          ) : null}

          {canReadLatestPosts && latestPostsQuery.isError && !hasPosts ? (
            <div className="rounded-lg bg-surface px-4 py-5">
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

          {isReady && requiresAuth && !token ? (
            <div className="rounded-lg bg-surface px-4 py-5">
              <EmptyState
                title="登录后查看关注信息流"
                description="关注流只展示你关注的社区和用户发布的公开讨论。登录后可以回到这里继续浏览。"
                action={
                  <div className="flex flex-col items-stretch justify-center gap-2 sm:flex-row">
                    <TextAction
                      href={`/login?next=${encodeURIComponent(pathname)}`}
                      tone="primary"
                    >
                      去登录
                    </TextAction>
                    <TextAction
                      href={`/register?next=${encodeURIComponent(pathname)}`}
                    >
                      创建账号
                    </TextAction>
                  </div>
                }
              />
            </div>
          ) : null}

          {canReadLatestPosts &&
          latestPostsQuery.isSuccess &&
          !latestPostsQuery.isFetching &&
          !hasPosts ? (
            <div className="rounded-lg bg-surface px-4 py-5">
              <EmptyState
                title={isFollowingFeed ? "关注流还没有帖子" : "还没有帖子"}
                description={
                  isFollowingFeed
                    ? "关注社区或用户后，相关公开讨论会出现在这里。"
                    : "公开社区开始发布内容后，最新帖子会出现在这里。"
                }
                action={
                  isFollowingFeed ? (
                    <div className="flex flex-col items-stretch justify-center gap-2 sm:flex-row">
                      <TextAction href="/communities" tone="primary">
                        浏览社区
                      </TextAction>
                      <TextAction href="/search?scope=users">搜索用户</TextAction>
                    </div>
                  ) : (
                    <TextAction href="/communities">去社区看看</TextAction>
                  )
                }
              />
            </div>
          ) : null}

          {canReadLatestPosts && hasPosts ? (
            <div className="space-y-2">
              {posts.map((post) => (
                <RedditPostListItem
                  key={post.id}
                  onRememberSource={(postId) =>
                    rememberPostNavigationSource({
                      href: postSource.href,
                      label: postSource.label,
                      postId,
                    })
                  }
                  post={post}
                  source={postSource}
                />
              ))}
              <div
                ref={loadMoreRef}
                className="flex min-h-16 items-center justify-center rounded-lg bg-surface px-4 py-3 text-xs text-muted-foreground"
                aria-live="polite"
              >
                {isFetchingNextPostsPage ? (
                  <span className="inline-flex items-center gap-2 font-medium text-primary">
                    <span
                      className="size-1.5 rounded-full bg-primary"
                      aria-hidden="true"
                    />
                    正在加载更多讨论
                  </span>
                ) : hasNextPostsPage ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      void fetchNextPostsPage();
                    }}
                  >
                    加载更多
                  </Button>
                ) : (
                  <span>已经到底了</span>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <RightRail
        canReadLatestPosts={canReadLatestPosts}
        feedSource={source}
        posts={posts}
        sortFallbackNotice={sortFallbackNotice}
      />
    </div>
  );
}

function getFeedIntroText(
  source: FeedSource,
  sort: PostSort,
  hasToken: boolean,
) {
  if (source === "following") {
    return hasToken
      ? `只展示你关注的社区和用户发布的公开讨论，当前按${formatPostSortLabel(sort)}排序。`
      : "登录后查看你关注的社区和用户。";
  }

  return `${formatFeedSourceDescription(source)}当前按${formatPostSortLabel(sort)}排序。`;
}

function getHomePostSource(
  pathname: string,
  source: FeedSource,
  sort: PostSort,
): PostSourceContext {
  return {
    href: getFeedHref(source, sort) || pathname,
    label: getFeedReturnLabel(source, sort),
  };
}

function getUniqueFeedPosts(pages: ListPostsResponse[]) {
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

function RightRail({
  canReadLatestPosts,
  feedSource,
  posts,
  sortFallbackNotice,
}: {
  canReadLatestPosts: boolean;
  feedSource: FeedSource;
  posts: Post[];
  sortFallbackNotice: string | null;
}) {
  const activeCommunities = getActiveCommunities(posts).slice(0, 4);

  return (
    <AppRightRail>
      <RightRailSection
        title={`${formatFeedSourceLabel(feedSource)}信息流`}
        description={getRailDescription(feedSource, sortFallbackNotice)}
      >
        <RightRailActionList>
          <RightRailAction href="/communities" tone="primary">
            浏览社区
          </RightRailAction>
          <RightRailAction href="/community-applications/new">
            申请社区
          </RightRailAction>
        </RightRailActionList>
      </RightRailSection>

      <RightRailSection title="当前流里的社区">
        {activeCommunities.length > 0 ? (
          <RightRailRaisedList>
            {activeCommunities.map((community) => (
              <Link
                key={community.slug}
                href={`/communities/${community.slug}`}
                className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm transition-colors first:rounded-t-md last:rounded-b-md hover:bg-surface-hover hover:text-primary"
              >
                <span className="min-w-0 truncate font-medium">
                  {community.name}
                </span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  {community.count} 篇
                </span>
              </Link>
            ))}
          </RightRailRaisedList>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            {getTopPostsEmptyText(feedSource, canReadLatestPosts)}
          </p>
        )}
      </RightRailSection>
    </AppRightRail>
  );
}

function getRailDescription(
  source: FeedSource,
  sortFallbackNotice: string | null,
) {
  if (sortFallbackNotice) {
    return sortFallbackNotice;
  }

  if (source === "following") {
    return "这里按你关注的社区和用户聚合公开讨论，不混入普通全站帖子。";
  }

  return "这里按当前来源展示公开讨论。右侧只保留能继续浏览的社区入口。";
}

function getTopPostsEmptyText(
  source: FeedSource,
  canReadLatestPosts: boolean,
) {
  if (source === "following") {
    return "关注社区或用户并产生公开讨论后会出现在这里。";
  }

  return canReadLatestPosts ? "当前帖子还没有形成社区聚合。" : "正在准备公开帖子流。";
}

function getActiveCommunities(posts: Post[]) {
  const communities = new Map<
    string,
    {
      count: number;
      name: string;
      slug: string;
    }
  >();

  for (const post of posts) {
    const slug = post.community?.slug?.trim() || post.community_slug?.trim();

    if (!slug) {
      continue;
    }

    const current = communities.get(slug);
    const name =
      post.community?.name?.trim() ||
      post.community_name?.trim() ||
      `/${slug}`;

    communities.set(slug, {
      count: (current?.count ?? 0) + 1,
      name,
      slug,
    });
  }

  return [...communities.values()].sort((left, right) => right.count - left.count);
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

