"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, Hash } from "lucide-react";

import { rememberPostNavigationSource } from "@/components/app-shell/post-navigation-source";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TextAction } from "@/components/ui/text-action";
import { useAuthSession } from "@/features/auth/auth-session";
import { getMarkdownPlainTextSummary } from "@/features/content/markdown-summary";
import { ApiError } from "@/lib/api/client";

import { useInfiniteSearchQuery } from "./queries";
import type {
  SearchCommunityResult,
  SearchPostResult,
  SearchScope,
} from "./types";

const scopeOptions: Array<{ label: string; value: SearchScope }> = [
  { label: "全部", value: "all" },
  { label: "社区", value: "communities" },
  { label: "帖子", value: "posts" },
];

type SearchQueryIssue = {
  description: string;
  title: string;
};

export function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isReady } = useAuthSession();
  const query = searchParams.get("q")?.trim() ?? "";
  const scope = normalizeScope(searchParams.get("scope"));
  const queryIssue = getSearchQueryIssue(query);
  const searchQuery = useInfiniteSearchQuery(
    { limit: 20, q: query, scope },
    isReady && !queryIssue,
  );
  const pages = searchQuery.data?.pages ?? [];
  const communities = pages.flatMap((page) => page.communities);
  const posts = pages.flatMap((page) => page.posts);
  const resultCount = communities.length + posts.length;
  const loadedPages = pages.length;
  const sourceHref = getSearchSourceHref(query, scope);

  function updateScope(nextScope: SearchScope) {
    router.replace(getSearchSourceHref(query, nextScope));
  }

  return (
    <div className="grid grid-cols-1 gap-0 py-2 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0">
        <section className="bg-background">
          <div className="flex flex-col gap-3 border-b border-border py-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-normal text-foreground">
                {query ? `搜索：${query}` : "搜索"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                使用顶部搜索框输入关键词；这里切换搜索范围并查看结果。
              </p>
            </div>
            <ScopeTabs
              disabled={!isReady || searchQuery.isFetching}
              onScopeChange={updateScope}
              scope={scope}
            />
          </div>
        </section>

        <section className="bg-background">
          {!isReady ? (
            <div className="border-b border-border p-4">
              <LoadingState rows={3} />
            </div>
          ) : null}

          {isReady && !query ? (
            <div className="border-b border-border p-4">
              <EmptyState
                title="输入关键词开始搜索"
                description="可以搜索社区名称、slug、帖子标题和正文；结果会按相关度和新鲜度综合排序。"
              />
            </div>
          ) : null}

          {isReady && queryIssue ? (
            <div className="border-b border-border p-4">
              <ErrorState
                title={queryIssue.title}
                description={queryIssue.description}
              />
            </div>
          ) : null}

          {isReady && query && !queryIssue && searchQuery.isPending ? (
            <div className="border-b border-border p-4">
              <LoadingState rows={5} />
            </div>
          ) : null}

          {isReady && query && !queryIssue && searchQuery.isError ? (
            <div className="border-b border-border p-4">
              <ErrorState
                title={getErrorTitle()}
                description={getErrorDescription(searchQuery.error)}
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => searchQuery.refetch()}
                  >
                    重试
                  </Button>
                }
              />
            </div>
          ) : null}

          {isReady && query && !queryIssue && searchQuery.isSuccess && resultCount === 0 ? (
            <div className="border-b border-border p-4">
              <EmptyState
                title="没有找到结果"
                description="换一个更完整的关键词，或直接搜索社区 slug、帖子标题里的核心词。"
              />
            </div>
          ) : null}

          {isReady && query && !queryIssue && searchQuery.isSuccess && resultCount > 0 ? (
            <>
              <SearchSummaryBar
                hasMore={Boolean(searchQuery.hasNextPage)}
                isRefreshing={searchQuery.isFetching && !searchQuery.isFetchingNextPage}
                loadedPages={loadedPages}
                resultCount={resultCount}
                scope={scope}
              />

              {scope !== "posts" ? (
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

              {scope !== "communities" ? (
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
                hasNextPage={Boolean(searchQuery.hasNextPage)}
                isFetching={searchQuery.isFetchingNextPage}
                onLoadMore={() => searchQuery.fetchNextPage()}
              />
            </>
          ) : null}
        </section>
      </div>

      <SearchRail
        communityCount={communities.length}
        isSearching={searchQuery.isFetching}
        postCount={posts.length}
        query={query}
        queryIssue={queryIssue}
        scope={scope}
      />
    </div>
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
      <TabsList className="rounded-none bg-transparent p-0">
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
    <div className="grid gap-0 border-b border-border bg-background md:grid-cols-4">
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
    <div className="border-b border-border px-3 py-3 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
      <div className="font-mono text-[11px] uppercase text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
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
    <section>
      <div className="flex items-center justify-between border-b border-border py-3 text-xs">
        <h2 className="font-semibold text-foreground">{title}</h2>
        <span className="font-mono text-muted-foreground">{count}</span>
      </div>
      {children}
    </section>
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
    <article className="grid grid-cols-[32px_minmax(0,1fr)] border-b border-border bg-background py-3">
      <div className="flex items-start justify-center pt-1 text-primary">
        <Hash className="size-5" aria-hidden="true" />
      </div>
      <Link
        href={`/communities/${community.slug}`}
        className="block min-w-0 pl-3"
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
    <article className="grid grid-cols-[32px_minmax(0,1fr)] border-b border-border bg-background py-3">
      <div className="flex items-start justify-center pt-1 text-muted-foreground">
        <FileText className="size-5" aria-hidden="true" />
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
    <p className="border-b border-border py-4 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

function LoadMoreResults({
  hasNextPage,
  isFetching,
  onLoadMore,
}: {
  hasNextPage: boolean;
  isFetching: boolean;
  onLoadMore: () => void;
}) {
  if (!hasNextPage) {
    return (
      <div className="border-b border-border py-4 text-center text-sm text-muted-foreground">
        已显示当前可加载的全部结果。
      </div>
    );
  }

  return (
    <div className="border-b border-border py-4 text-center">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isFetching}
        onClick={onLoadMore}
      >
        {isFetching ? "正在加载" : "加载更多结果"}
      </Button>
    </div>
  );
}

function SearchRail({
  communityCount,
  isSearching,
  postCount,
  query,
  queryIssue,
  scope,
}: {
  communityCount: number;
  isSearching: boolean;
  postCount: number;
  query: string;
  queryIssue: SearchQueryIssue | null;
  scope: SearchScope;
}) {
  return (
    <aside className="border-t border-border py-5 xl:border-l xl:border-t-0 xl:pl-5">
      <div className="sticky top-20 space-y-6">
        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">当前搜索</h2>
          <p className="mt-3 break-words text-lg font-semibold tracking-normal">
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
        </section>

        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">结果</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            社区{" "}
            <span className="font-mono text-foreground">
              {query ? communityCount : "--"}
            </span>{" "}
            个，帖子{" "}
            <span className="font-mono text-foreground">
              {query ? postCount : "--"}
            </span>{" "}
            篇。
          </p>
        </section>

        <section>
          <h2 className="text-sm font-semibold">搜索能力</h2>
          <div className="mt-3 divide-y divide-border border-y border-border">
            <SearchHint label="排序" value="相关度优先，兼顾新鲜度" />
            <SearchHint label="社区" value="名称、描述、slug" />
            <SearchHint label="帖子" value="标题、社区、正文摘要" />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold">继续浏览</h2>
          <div className="mt-3 flex flex-col border-t border-border">
            <TextAction href="/communities" variant="bar">
              浏览社区
            </TextAction>
            <TextAction href="/" variant="bar">
              信息流首页
            </TextAction>
          </div>
        </section>
      </div>
    </aside>
  );
}

function SearchHint({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[56px_minmax(0,1fr)] gap-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
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

  if (query.length < 2) {
    return {
      title: "关键词太短",
      description: "请至少输入 2 个字符，搜索结果会更准确。",
    };
  }

  if (query.length > 80) {
    return {
      title: "关键词太长",
      description: "请缩短关键词，保留社区名、slug 或帖子标题里的核心词。",
    };
  }

  return null;
}

function normalizeScope(value: string | null): SearchScope {
  if (value === "communities" || value === "posts") {
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
    default:
      return "全部";
  }
}

function cnScopeTrigger() {
  return [
    "rounded-none border-b border-transparent px-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary",
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

function getErrorTitle() {
  return "无法完成搜索";
}

function getErrorDescription(error: Error | null) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}
