"use client";

import {
  forwardRef,
  useCallback,
  useMemo,
  useRef,
  type FormEvent,
  type RefObject,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  FileText,
  Hash,
  Loader2,
  Search,
  UserRound,
  X,
} from "lucide-react";

import { rememberPostNavigationSource } from "@/components/app-shell/post-navigation-source";
import {
  RightRail,
  RightRailAction,
  RightRailActionList,
  RightRailInfoList,
  RightRailInfoRow,
  RightRailSection,
} from "@/components/app-shell/right-rail";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthSession } from "@/features/auth/auth-session";
import { getMarkdownPlainTextSummary } from "@/features/content/markdown-summary";
import { ApiError } from "@/lib/api/client";
import { useInfiniteScrollTrigger } from "@/lib/hooks/use-infinite-scroll-trigger";

import { useInfiniteSearchQuery } from "./queries";
import type {
  SearchCommunityResult,
  SearchPostResult,
  SearchScope,
  SearchUserResult,
} from "./types";

const scopeOptions: Array<{ label: string; value: SearchScope }> = [
  { label: "全部", value: "all" },
  { label: "用户", value: "users" },
  { label: "社区", value: "communities" },
  { label: "帖子", value: "posts" },
];

type SearchQueryIssue = {
  description: string;
  title: string;
};

type SearchPageProps = {
  initialSearchParams?: Record<string, string | string[] | undefined>;
};

export function SearchPage({ initialSearchParams }: SearchPageProps) {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchParams = useMemo(
    () => createUrlSearchParams(initialSearchParams),
    [initialSearchParams],
  );
  const { isReady } = useAuthSession();
  const query = searchParams.get("q")?.trim() ?? "";
  const scope = normalizeScope(searchParams.get("scope"));
  const queryIssue = getSearchQueryIssue(query);
  const searchQuery = useInfiniteSearchQuery(
    { limit: 20, q: query, scope },
    isReady && !queryIssue,
  );
  const pages = searchQuery.data?.pages ?? [];
  const users = pages.flatMap((page) => page.users ?? []);
  const communities = pages.flatMap((page) => page.communities);
  const posts = pages.flatMap((page) => page.posts);
  const resultCount = users.length + communities.length + posts.length;
  const loadedPages = pages.length;
  const sourceHref = getSearchSourceHref(query, scope);
  const hasNextResultsPage = Boolean(searchQuery.hasNextPage);
  const isFetchingNextResultsPage = searchQuery.isFetchingNextPage;
  const fetchNextResultsPage = searchQuery.fetchNextPage;
  const loadMoreResults = useCallback(() => {
    void fetchNextResultsPage();
  }, [fetchNextResultsPage]);
  const loadMoreRef = useInfiniteScrollTrigger({
    enabled:
      isReady &&
      query.length > 0 &&
      !queryIssue &&
      resultCount > 0 &&
      hasNextResultsPage &&
      !isFetchingNextResultsPage,
    onLoadMore: loadMoreResults,
  });

  function updateScope(nextScope: SearchScope) {
    router.replace(getSearchSourceHref(query, nextScope));
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = searchInputRef.current?.value.trim() ?? "";

    router.push(getSearchSourceHref(nextQuery, scope));
  }

  function clearSearch() {
    if (searchInputRef.current) {
      searchInputRef.current.value = "";
      searchInputRef.current.focus();
    }

    router.push(getSearchSourceHref("", scope));
  }

  return (
    <div className="grid grid-cols-1 gap-6 py-2 xl:grid-cols-[minmax(0,760px)_260px] xl:justify-center">
      <div className="min-w-0 space-y-6">
        <SearchCommandPanel
          inputRef={searchInputRef}
          isReady={isReady}
          isSearching={searchQuery.isFetching}
          onClear={clearSearch}
          onScopeChange={updateScope}
          onSubmit={submitSearch}
          query={query}
          queryIssue={queryIssue}
          scope={scope}
        />

        <div className="min-w-0" aria-live="polite">
          {!isReady ? (
            <SearchStatePanel>
              <LoadingState rows={3} />
            </SearchStatePanel>
          ) : null}

          {isReady && !query ? (
            <EmptyState
              title="输入关键词开始搜索"
              description="可以搜索用户、社区、slug、帖子标题和正文；结果会按相关度和新鲜度综合排序。"
              className="bg-surface shadow-[inset_0_0_0_1px_var(--border)]"
            />
          ) : null}

          {isReady && queryIssue ? (
            <ErrorState
              title={queryIssue.title}
              description={queryIssue.description}
            />
          ) : null}

          {isReady && query && !queryIssue && searchQuery.isPending ? (
            <SearchStatePanel>
              <LoadingState rows={5} />
            </SearchStatePanel>
          ) : null}

          {isReady && query && !queryIssue && searchQuery.isError ? (
            <ErrorState
              title={getErrorTitle()}
              description={getErrorDescription(searchQuery.error)}
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => searchQuery.refetch()}
                >
                  重试
                </Button>
              }
            />
          ) : null}

          {isReady && query && !queryIssue && searchQuery.isSuccess && resultCount === 0 ? (
            <EmptyState
              title="没有找到结果"
              description="换一个更完整的关键词，或直接搜索用户名、社区 slug、帖子标题里的核心词。"
              className="bg-surface shadow-[inset_0_0_0_1px_var(--border)]"
            />
          ) : null}

          {isReady && query && !queryIssue && searchQuery.isSuccess && resultCount > 0 ? (
            <div className="space-y-4">
              <SearchSummaryBar
                hasMore={Boolean(searchQuery.hasNextPage)}
                isRefreshing={searchQuery.isFetching && !searchQuery.isFetchingNextPage}
                loadedPages={loadedPages}
                resultCount={resultCount}
                scope={scope}
              />

              {scope !== "communities" && scope !== "posts" ? (
                <SearchResultSection count={users.length} title="用户">
                  {users.length > 0 ? (
                    users.map((user) => (
                      <UserResultRow
                        key={user.id}
                        query={query}
                        user={user}
                      />
                    ))
                  ) : (
                    <EmptyResultRow>当前范围内没有用户结果。</EmptyResultRow>
                  )}
                </SearchResultSection>
              ) : null}

              {scope !== "posts" && scope !== "users" ? (
                <SearchResultSection count={communities.length} title="社区">
                  {communities.length > 0 ? (
                    communities.map((community) => (
                      <CommunityResultRow
                        key={community.id}
                        community={community}
                        query={query}
                      />
                    ))
                  ) : (
                    <EmptyResultRow>当前范围内没有社区结果。</EmptyResultRow>
                  )}
                </SearchResultSection>
              ) : null}

              {scope !== "communities" && scope !== "users" ? (
                <SearchResultSection count={posts.length} title="帖子">
                  {posts.length > 0 ? (
                    posts.map((post) => (
                      <PostResultRow
                        key={post.id}
                        post={post}
                        query={query}
                        sourceHref={sourceHref}
                      />
                    ))
                  ) : (
                    <EmptyResultRow>当前范围内没有帖子结果。</EmptyResultRow>
                  )}
                </SearchResultSection>
              ) : null}

              <LoadMoreResults
                ref={loadMoreRef}
                hasNextPage={hasNextResultsPage}
                isFetching={isFetchingNextResultsPage}
                onLoadMore={loadMoreResults}
              />
            </div>
          ) : null}
        </div>
      </div>

      <SearchRail
        communityCount={communities.length}
        isSearching={searchQuery.isFetching}
        postCount={posts.length}
        query={query}
        queryIssue={queryIssue}
        scope={scope}
        userCount={users.length}
      />
    </div>
  );
}

function createUrlSearchParams(
  input: Record<string, string | string[] | undefined> = {},
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string") {
      params.set(key, value);
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item);
      }
    }
  }

  return params;
}

function SearchStatePanel({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-lg bg-surface p-4 shadow-[inset_0_0_0_1px_var(--border)]">
      {children}
    </section>
  );
}

function SearchCommandPanel({
  inputRef,
  isReady,
  isSearching,
  onClear,
  onScopeChange,
  onSubmit,
  query,
  queryIssue,
  scope,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  isReady: boolean;
  isSearching: boolean;
  onClear: () => void;
  onScopeChange: (scope: SearchScope) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  query: string;
  queryIssue: SearchQueryIssue | null;
  scope: SearchScope;
}) {
  return (
    <section className="space-y-4">
      <div className="min-w-0">
        <p className="font-mono text-[11px] leading-5 text-primary">检索</p>
        <h1 className="mt-1 break-words text-2xl font-semibold leading-8 tracking-normal text-foreground">
          {query ? `搜索：${query}` : "搜索站内内容"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          输入用户名、社区 slug、帖子标题或正文关键词，结果会按相关度和新鲜度综合排序。
        </p>
      </div>

      <div>
        <ScopeTabs
          disabled={!isReady}
          onScopeChange={onScopeChange}
          scope={scope}
        />
      </div>

      <form
        className="group relative flex h-12 min-w-0 items-center gap-2 bg-transparent px-0 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-border/70 after:transition-[height,background-color] after:duration-150 hover:after:bg-muted-foreground/45 focus-within:after:h-0.5 focus-within:after:bg-primary"
        onSubmit={onSubmit}
        role="search"
      >
        <label className="sr-only" htmlFor="search-page-input">
          搜索关键词
        </label>
        <Search
          className="ml-0.5 size-4 shrink-0 text-subtle-foreground transition-colors group-focus-within:text-primary"
          aria-hidden="true"
        />
        <input
          id="search-page-input"
          key={`${scope}:${query}`}
          ref={inputRef}
          defaultValue={query}
          className="h-full min-w-0 flex-1 bg-transparent px-2 text-sm text-foreground outline-none placeholder:text-subtle-foreground disabled:cursor-not-allowed disabled:opacity-60 sm:px-3"
          placeholder="搜索用户、社区、帖子"
          disabled={!isReady}
        />
        {query ? (
          <button
            type="button"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={onClear}
            aria-label="清空搜索"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : null}
        <button
          type="submit"
          className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 px-1.5 text-sm font-semibold text-primary transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!isReady || isSearching}
        >
          {isSearching ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <ArrowRight className="size-4" aria-hidden="true" />
          )}
          {isSearching ? "搜索中" : "搜索"}
        </button>
      </form>

      {queryIssue ? (
        <p className="mt-3 text-sm leading-6 text-destructive">
          {queryIssue.description}
        </p>
      ) : null}
    </section>
  );
}

function ScopeTabs({
  disabled,
  onScopeChange,
  scope,
}: {
  disabled: boolean;
  onScopeChange: (scope: SearchScope) => void;
  scope: SearchScope;
}) {
  return (
    <Tabs value={scope} onValueChange={(value) => onScopeChange(value as SearchScope)}>
      <TabsList className="flex h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
        {scopeOptions.map((option) => (
          <TabsTrigger
            key={option.value}
            value={option.value}
            disabled={disabled}
            className={cnScopeTrigger()}
          >
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

function SearchSummaryBar({
  hasMore,
  isRefreshing,
  loadedPages,
  resultCount,
  scope,
}: {
  hasMore: boolean;
  isRefreshing: boolean;
  loadedPages: number;
  resultCount: number;
  scope: SearchScope;
}) {
  return (
    <div className="grid gap-3 rounded-lg bg-surface px-4 py-3 shadow-[inset_0_0_0_1px_var(--border)] md:grid-cols-4">
      <SearchMetric label="范围" value={formatScope(scope)} />
      <SearchMetric label="已加载" value={`${resultCount} 条`} />
      <SearchMetric label="页数" value={`${Math.max(loadedPages, 1)} 页`} />
      <SearchMetric
        label="排序"
        value={isRefreshing ? "刷新中" : hasMore ? "相关度优先" : "已到末尾"}
      />
    </div>
  );
}

function SearchMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="font-mono text-[11px] uppercase leading-5 text-subtle-foreground">
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-semibold text-foreground">
        {value}
      </div>
    </div>
  );
}

function HighlightedText({ query, text }: { query: string; text: string }) {
  const needle = query.trim();

  if (!needle) {
    return <>{text}</>;
  }

  const index = text.toLowerCase().indexOf(needle.toLowerCase());

  if (index < 0) {
    return <>{text}</>;
  }

  const before = text.slice(0, index);
  const match = text.slice(index, index + needle.length);
  const after = text.slice(index + needle.length);

  return (
    <>
      {before}
      <mark className="bg-primary/20 px-0.5 text-primary">{match}</mark>
      {after}
    </>
  );
}

function SearchResultSection({
  children,
  count,
  title,
}: {
  children: ReactNode;
  count: number;
  title: string;
}) {
  return (
    <section className="rounded-lg bg-surface p-3 shadow-[inset_0_0_0_1px_var(--border)]">
      <div className="flex items-center justify-between px-1 pb-3 text-xs">
        <h2 className="font-semibold text-foreground">{title}</h2>
        <span className="font-mono text-subtle-foreground">{count}</span>
      </div>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function UserResultRow({
  query,
  user,
}: {
  query: string;
  user: SearchUserResult;
}) {
  const displayName = user.display_name || user.username;
  const headline = user.headline?.trim();
  const bioExcerpt = user.bio_excerpt?.trim();

  return (
    <article className="group grid grid-cols-[40px_minmax(0,1fr)] rounded-md px-2 py-3 transition-colors hover:bg-surface-raised">
      <div className="flex items-start justify-center pt-1">
        <SearchUserAvatar displayName={displayName} user={user} />
      </div>
      <Link
        href={`/users/${encodeURIComponent(user.username)}`}
        className="block min-w-0 pl-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5 text-muted-foreground">
          <span className="font-semibold text-foreground">
            @<HighlightedText query={query} text={user.username} />
          </span>
          <span aria-hidden="true">·</span>
          <span>{formatUserStatus(user.status)}</span>
          <span aria-hidden="true">·</span>
          <span>{formatDate(user.created_at)}</span>
        </div>
        <h3 className="mt-1 break-words text-base font-semibold leading-6 tracking-normal text-foreground sm:text-lg">
          <HighlightedText query={query} text={displayName} />
        </h3>
        {headline ? (
          <p className="mt-2 line-clamp-1 text-sm font-medium leading-6 text-foreground">
            <HighlightedText query={query} text={headline} />
          </p>
        ) : null}
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
          <HighlightedText
            query={query}
            text={bioExcerpt || "这个用户还没有填写公开简介。"}
          />
        </p>
      </Link>
    </article>
  );
}

function SearchUserAvatar({
  displayName,
  user,
}: {
  displayName: string;
  user: SearchUserResult;
}) {
  if (user.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatar_url}
        alt={`${displayName} 的头像`}
        className="size-9 rounded-full bg-background-soft object-cover"
      />
    );
  }

  return (
    <span
      className="flex size-9 items-center justify-center rounded-full bg-background-soft text-primary"
      aria-label={`${displayName} 的头像占位`}
    >
      <UserRound className="size-4" aria-hidden="true" />
    </span>
  );
}

function CommunityResultRow({
  community,
  query,
}: {
  community: SearchCommunityResult;
  query: string;
}) {
  return (
    <article className="group grid grid-cols-[40px_minmax(0,1fr)] rounded-md px-2 py-3 transition-colors hover:bg-surface-raised">
      <div className="flex items-start justify-center pt-1">
        <span className="inline-flex size-9 items-center justify-center rounded-sm bg-background-soft text-primary transition-colors group-hover:bg-primary/10">
          <Hash className="size-5" aria-hidden="true" />
        </span>
      </div>
      <Link
        href={`/communities/${community.slug}`}
        className="block min-w-0 pl-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5 text-muted-foreground">
          <span className="font-semibold text-foreground">
            /<HighlightedText query={query} text={community.slug} />
          </span>
          <span aria-hidden="true">·</span>
          <span>{formatCommunityStatus(community.status)}</span>
          <span aria-hidden="true">·</span>
          <span>{formatDate(community.created_at)}</span>
        </div>
        <h3 className="mt-1 break-words text-base font-semibold leading-6 tracking-normal text-foreground sm:text-lg">
          <HighlightedText query={query} text={community.name} />
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
          <HighlightedText
            query={query}
            text={community.description || "暂无描述。"}
          />
        </p>
      </Link>
    </article>
  );
}

function PostResultRow({
  post,
  query,
  sourceHref,
}: {
  post: SearchPostResult;
  query: string;
  sourceHref: string;
}) {
  const postHref = `/posts/${post.id}`;
  const excerpt = getMarkdownPlainTextSummary(post.body_excerpt);

  function rememberSource() {
    rememberPostNavigationSource({
      href: sourceHref,
      label: "返回搜索结果",
      postId: post.id,
    });
  }

  return (
    <article className="group grid grid-cols-[40px_minmax(0,1fr)] rounded-md px-2 py-3 transition-colors hover:bg-surface-raised">
      <div className="flex items-start justify-center pt-1">
        <span className="inline-flex size-9 items-center justify-center rounded-sm bg-background-soft text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
          <FileText className="size-5" aria-hidden="true" />
        </span>
      </div>
      <div className="min-w-0 pl-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5 text-muted-foreground">
          <Link
            href={`/communities/${encodeURIComponent(post.community_slug)}`}
            className="font-semibold text-foreground hover:text-primary"
          >
            /<HighlightedText query={query} text={post.community_slug} />
          </Link>
          <span aria-hidden="true">·</span>
          <span>{formatDate(post.created_at)}</span>
          {post.status !== "visible" ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{formatPostStatus(post.status)}</span>
            </>
          ) : null}
        </div>
        <h3 className="mt-1 break-words text-base font-semibold leading-6 tracking-normal text-foreground sm:text-lg">
          <Link href={postHref} onClick={rememberSource} className="hover:text-primary">
            <HighlightedText query={query} text={post.title} />
          </Link>
        </h3>
        {excerpt ? (
          <Link
            href={postHref}
            onClick={rememberSource}
            className="mt-2 line-clamp-3 block text-sm leading-6 text-muted-foreground hover:text-foreground"
          >
            <HighlightedText query={query} text={excerpt} />
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function EmptyResultRow({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md bg-background-soft/60 px-3 py-4 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

const LoadMoreResults = forwardRef<HTMLDivElement, {
  hasNextPage: boolean;
  isFetching: boolean;
  onLoadMore: () => void;
}>(function LoadMoreResults({
  hasNextPage,
  isFetching,
  onLoadMore,
}, ref) {
  if (!hasNextPage) {
    return (
      <div
        ref={ref}
        className="text-center text-sm text-muted-foreground"
      >
        <span className="inline-flex rounded-md bg-surface px-3 py-2 shadow-[inset_0_0_0_1px_var(--border)]">
          已显示当前可加载的全部结果。
        </span>
      </div>
    );
  }

  return (
    <div ref={ref} className="text-center">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={isFetching}
        onClick={onLoadMore}
      >
        {isFetching ? "正在加载" : "加载更多结果"}
      </Button>
    </div>
  );
});

function SearchRail({
  communityCount,
  isSearching,
  postCount,
  query,
  queryIssue,
  scope,
  userCount,
}: {
  communityCount: number;
  isSearching: boolean;
  postCount: number;
  query: string;
  queryIssue: SearchQueryIssue | null;
  scope: SearchScope;
  userCount: number;
}) {
  return (
    <RightRail>
      <RightRailSection title="当前搜索">
        <p className="mt-2 break-words text-lg font-semibold tracking-normal text-foreground">
          {query || "未输入关键词"}
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          范围：{formatScope(scope)}
          {queryIssue
            ? "，关键词需要调整。"
            : isSearching
              ? "，正在刷新结果。"
              : "。"}
        </p>
        <RightRailActionList>
          <RightRailAction href="/communities" tone="primary">
            浏览社区
          </RightRailAction>
          <RightRailAction href="/">信息流首页</RightRailAction>
        </RightRailActionList>
      </RightRailSection>

      <RightRailSection title="结果概览">
        <RightRailInfoList>
          <RightRailInfoRow label="用户" value={query ? userCount : "--"} />
          <RightRailInfoRow label="社区" value={query ? communityCount : "--"} />
          <RightRailInfoRow label="帖子" value={query ? postCount : "--"} />
        </RightRailInfoList>
      </RightRailSection>
    </RightRail>
  );
}

function getSearchSourceHref(query: string, scope: SearchScope) {
  if (!query) {
    return `/search?scope=${scope}`;
  }

  return `/search?q=${encodeURIComponent(query)}&scope=${scope}`;
}

function getSearchQueryIssue(query: string): SearchQueryIssue | null {
  if (!query) {
    return null;
  }

  if ([...query].length > 100) {
    return {
      title: "关键词太长",
      description: "请缩短关键词，保留用户名、社区名、slug 或帖子标题里的核心词。",
    };
  }

  return null;
}

function normalizeScope(value: string | null): SearchScope {
  if (value === "communities" || value === "posts" || value === "users") {
    return value;
  }

  return "all";
}

function formatScope(scope: SearchScope) {
  switch (scope) {
    case "communities":
      return "社区";
    case "posts":
      return "帖子";
    case "users":
      return "用户";
    default:
      return "全部";
  }
}

function cnScopeTrigger() {
  return [
    "h-8 rounded-sm px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-background-soft hover:text-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none",
  ].join(" ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatCommunityStatus(status: string) {
  switch (status) {
    case "active":
      return "活跃";
    case "archived":
      return "已归档";
    case "suspended":
      return "已暂停";
    default:
      return status;
  }
}

function formatPostStatus(status: string) {
  switch (status) {
    case "visible":
      return "可见";
    case "archived":
      return "已归档";
    case "hidden":
      return "已隐藏";
    case "deleted":
      return "已删除";
    case "removed":
      return "已移除";
    default:
      return status;
  }
}

function formatUserStatus(status: string) {
  switch (status) {
    case "active":
      return "活跃";
    case "suspended":
      return "已暂停";
    case "deleted":
      return "已删除";
    default:
      return status;
  }
}

function getErrorTitle() {
  return "无法完成搜索";
}

function getErrorDescription(error: Error | null) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}

