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
import { TextAction } from "@/components/ui/text-action";
import { useAuthSession } from "@/features/auth/auth-session";
import {
  formatFeedSourceDescription,
  formatFeedSourceLabel,
  getFeedHref,
  getFeedReturnLabel,
} from "@/features/feed/source";
import { PostSortMenu } from "@/features/post/post-sort-menu";
import { useLatestPostsQuery } from "@/features/post/queries";
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
  const router = useRouter();
  const pathname = usePathname();
  const sort = initialSort;
  const requiresAuth = source === "following";
  const isFollowingFeed = source === "following";
  const postSource = getHomePostSource(pathname, source, sort);
  const canReadLatestPosts = isReady && (!requiresAuth || Boolean(token));
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
    <div className="grid grid-cols-1 gap-0 xl:grid-cols-[minmax(0,1fr)_280px]">
      <section className="min-w-0">
        <div className="bg-background">
          <div className="border-b border-border pb-3">
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
              </div>
              <div className="flex max-w-full sm:items-end">
                <PostSortMenu
                  aria-label="选择信息流排序方式"
                  disabled={!canReadLatestPosts || latestPostsQuery.isFetching}
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

          {isReady && requiresAuth && !token ? (
            <div className="py-5">
              <EmptyState
                title="登录后查看关注信息流"
                description="关注流只展示与你关注社区有关的内容。登录后可以回到这里继续浏览。"
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
          posts.length === 0 ? (
            <div className="py-5">
              <EmptyState
                title={isFollowingFeed ? "关注流还没有帖子" : "还没有帖子"}
                description={
                  isFollowingFeed
                    ? "关注社区后，相关公开讨论会出现在这里。"
                    : "公开社区开始发布内容后，最新帖子会出现在这里。"
                }
                action={<TextAction href="/communities">去社区看看</TextAction>}
              />
            </div>
          ) : null}

          {canReadLatestPosts &&
          latestPostsQuery.isSuccess &&
          posts.length > 0 ? (
            <div className="border-t border-border">
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
      ? `只展示你关注社区中的公开讨论，当前按${formatPostSortLabel(sort)}排序。`
      : "登录后查看你关注的社区入口。";
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
    <aside className="border-t border-border px-0 py-5 xl:border-l xl:border-t-0 xl:pl-5">
      <div className="sticky top-20 right-rail-scroll space-y-6">
        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">
            {formatFeedSourceLabel(feedSource)}信息流
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {getRailDescription(feedSource, sortFallbackNotice)}
          </p>
          <div className="mt-4 flex flex-col border-t border-border">
            <TextAction href="/communities" tone="primary" variant="bar">
              浏览社区
            </TextAction>
            <TextAction href="/community-applications/new" variant="bar">
              申请社区
            </TextAction>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold">当前流里的社区</h3>
          {activeCommunities.length > 0 ? (
            <div className="divide-y divide-border">
              {activeCommunities.map((community) => (
                <Link
                  key={community.slug}
                  href={`/communities/${community.slug}`}
                  className="flex items-center justify-between gap-3 py-3 text-sm transition-colors hover:text-primary"
                >
                  <span className="min-w-0 truncate font-medium">
                    {community.name}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {community.count} 篇
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              {getTopPostsEmptyText(feedSource, canReadLatestPosts)}
            </p>
          )}
        </section>
      </div>
    </aside>
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
    return "这里按关注社区聚合公开讨论，不混入普通全站帖子。";
  }

  return "这里按当前来源展示公开讨论。右侧只保留能继续浏览的社区入口。";
}

function getTopPostsEmptyText(
  source: FeedSource,
  canReadLatestPosts: boolean,
) {
  if (source === "following") {
    return "关注社区并产生公开讨论后会出现在这里。";
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

