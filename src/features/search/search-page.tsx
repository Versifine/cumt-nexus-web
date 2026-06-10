"use client";

import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, Hash, Search } from "lucide-react";

import { rememberPostNavigationSource } from "@/components/app-shell/post-navigation-source";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TextAction } from "@/components/ui/text-action";
import { useAuthSession } from "@/features/auth/auth-session";
import { getMarkdownPlainTextSummary } from "@/features/content/markdown-summary";
import { ApiError } from "@/lib/api/client";

import { useSearchQuery } from "./queries";
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

export function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isReady } = useAuthSession();
  const query = searchParams.get("q")?.trim() ?? "";
  const scope = normalizeScope(searchParams.get("scope"));
  const searchQuery = useSearchQuery(
    { limit: 20, offset: 0, q: query, scope },
    isReady,
  );
  const communities = searchQuery.data?.communities ?? [];
  const posts = searchQuery.data?.posts ?? [];
  const resultCount = communities.length + posts.length;
  const sourceHref = getSearchSourceHref(query, scope);

  function submitSearch(nextQuery: string) {
    if (!nextQuery) {
      router.push("/search");
      return;
    }

    router.push(`/search?q=${encodeURIComponent(nextQuery)}&scope=${scope}`);
  }

  function updateScope(nextScope: SearchScope) {
    router.replace(getSearchSourceHref(query, nextScope));
  }

  return (
    <div className="grid grid-cols-1 gap-0 xl:grid-cols-[minmax(0,1fr)_312px]">
      <div className="min-w-0">
        <section className="border border-border bg-background">
          <div className="flex flex-col gap-3 border-b border-border px-3 py-3 sm:px-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-normal text-foreground">
                搜索
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                搜索社区和帖子，结果地址会保留关键词和范围。
              </p>
            </div>
            <ScopeTabs
              disabled={!isReady || searchQuery.isFetching}
              onScopeChange={updateScope}
              scope={scope}
            />
          </div>

          <SearchControls
            key={`${query}:${scope}`}
            initialQuery={query}
            isFetching={searchQuery.isFetching}
            isReady={isReady}
            onSubmitSearch={submitSearch}
          />
        </section>

        <section className="mt-3 border-x border-border bg-background">
          {!isReady ? (
            <div className="border-b border-border p-4">
              <LoadingState rows={3} />
            </div>
          ) : null}

          {isReady && !query ? (
            <div className="border-b border-border p-4">
              <EmptyState
                title="输入关键词开始搜索"
                description="可以搜索社区名称、slug、帖子标题和正文摘要。"
              />
            </div>
          ) : null}

          {isReady && query && searchQuery.isPending ? (
            <div className="border-b border-border p-4">
              <LoadingState rows={5} />
            </div>
          ) : null}

          {isReady && query && searchQuery.isError ? (
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

          {isReady && query && searchQuery.isSuccess && resultCount === 0 ? (
            <div className="border-b border-border p-4">
              <EmptyState
                title="没有找到结果"
                description="换一个关键词，或切换搜索范围再试。"
              />
            </div>
          ) : null}

          {isReady && query && searchQuery.isSuccess && resultCount > 0 ? (
            <>
              {scope !== "posts" ? (
                <SearchResultSection count={communities.length} title="社区">
                  {communities.length > 0 ? (
                    communities.map((community) => (
                      <CommunityResultRow
                        key={community.id}
                        community={community}
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
                        sourceHref={sourceHref}
                      />
                    ))
                  ) : (
                    <EmptyResultRow>当前范围内没有帖子结果。</EmptyResultRow>
                  )}
                </SearchResultSection>
              ) : null}
            </>
          ) : null}
        </section>
      </div>

      <SearchRail
        communityCount={communities.length}
        isSearching={searchQuery.isFetching}
        postCount={posts.length}
        query={query}
        scope={scope}
      />
    </div>
  );
}

function SearchControls({
  initialQuery,
  isFetching,
  isReady,
  onSubmitSearch,
}: {
  initialQuery: string;
  isFetching: boolean;
  isReady: boolean;
  onSubmitSearch: (query: string) => void;
}) {
  const [draft, setDraft] = useState(initialQuery);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmitSearch(draft.trim());
  }

  return (
    <form
      className="grid gap-3 px-3 py-3 sm:px-4 md:grid-cols-[minmax(0,1fr)_auto]"
      onSubmit={submitSearch}
    >
      <label className="sr-only" htmlFor="search-query">
        搜索关键词
      </label>
      <div className="relative min-w-0">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id="search-query"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="输入社区名、slug、帖子标题或正文关键词"
          className="rounded-none pl-9"
          disabled={!isReady}
        />
      </div>
      <Button type="submit" disabled={!isReady || isFetching || !draft.trim()}>
        搜索
      </Button>
    </form>
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
      <TabsList className="rounded-none border border-border bg-background p-0">
        {scopeOptions.map((option, index) => (
          <TabsTrigger
            key={option.value}
            value={option.value}
            disabled={disabled}
            className={cnScopeTrigger(index)}
          >
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
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
      <div className="grid grid-cols-[42px_minmax(0,1fr)] border-b border-border bg-background-soft/45 sm:grid-cols-[48px_minmax(0,1fr)]">
        <div className="border-r border-border" />
        <div className="flex items-center justify-between px-3 py-2 text-xs sm:px-4">
          <h2 className="font-semibold text-foreground">{title}</h2>
          <span className="font-mono text-muted-foreground">{count}</span>
        </div>
      </div>
      {children}
    </section>
  );
}

function CommunityResultRow({
  community,
}: {
  community: SearchCommunityResult;
}) {
  return (
    <article className="grid grid-cols-[42px_minmax(0,1fr)] border-b border-border bg-background transition-colors hover:bg-background-soft/60 sm:grid-cols-[48px_minmax(0,1fr)]">
      <div className="flex items-start justify-center border-r border-border bg-background-soft/45 py-3 text-primary">
        <Hash className="size-5" aria-hidden="true" />
      </div>
      <Link
        href={`/communities/${community.slug}`}
        className="block min-w-0 px-3 py-3 sm:px-4"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5 text-muted-foreground">
          <span className="font-semibold text-foreground">/{community.slug}</span>
          <span aria-hidden="true">·</span>
          <span>{formatCommunityStatus(community.status)}</span>
          <span aria-hidden="true">·</span>
          <span>{formatDate(community.created_at)}</span>
        </div>
        <h3 className="mt-1 break-words text-base font-semibold leading-6 tracking-normal text-foreground sm:text-lg">
          {community.name}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
          {community.description || "暂无描述。"}
        </p>
      </Link>
    </article>
  );
}

function PostResultRow({
  post,
  sourceHref,
}: {
  post: SearchPostResult;
  sourceHref: string;
}) {
  const postHref = `/posts/${post.id}`;

  function rememberSource() {
    rememberPostNavigationSource({
      href: sourceHref,
      label: "返回搜索结果",
      postId: post.id,
    });
  }

  return (
    <article className="grid grid-cols-[42px_minmax(0,1fr)] border-b border-border bg-background transition-colors hover:bg-background-soft/60 sm:grid-cols-[48px_minmax(0,1fr)]">
      <div className="flex items-start justify-center border-r border-border bg-background-soft/45 py-3 text-muted-foreground">
        <FileText className="size-5" aria-hidden="true" />
      </div>
      <div className="min-w-0 px-3 py-3 sm:px-4">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5 text-muted-foreground">
          <Link
            href={`/communities/${encodeURIComponent(post.community_slug)}`}
            className="font-semibold text-foreground hover:text-primary"
          >
            /{post.community_slug}
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
            {post.title}
          </Link>
        </h3>
        {post.body_excerpt ? (
          <Link
            href={postHref}
            onClick={rememberSource}
            className="mt-2 line-clamp-3 block text-sm leading-6 text-muted-foreground hover:text-foreground"
          >
            {getMarkdownPlainTextSummary(post.body_excerpt)}
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function EmptyResultRow({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-[42px_minmax(0,1fr)] border-b border-border sm:grid-cols-[48px_minmax(0,1fr)]">
      <div className="border-r border-border bg-background-soft/45" />
      <p className="px-3 py-4 text-sm text-muted-foreground sm:px-4">
        {children}
      </p>
    </div>
  );
}

function SearchRail({
  communityCount,
  isSearching,
  postCount,
  query,
  scope,
}: {
  communityCount: number;
  isSearching: boolean;
  postCount: number;
  query: string;
  scope: SearchScope;
}) {
  return (
    <aside className="border-t border-border bg-background-soft/45 px-4 py-5 xl:border-l xl:border-t-0">
      <div className="sticky top-20 space-y-5">
        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">当前搜索</h2>
          <p className="mt-3 break-words text-lg font-semibold tracking-normal">
            {query || "未输入关键词"}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            范围：{formatScope(scope)}
            {isSearching ? "，正在刷新结果。" : "。"}
          </p>
        </section>

        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">结果</h2>
          <div className="mt-3 grid grid-cols-2 border border-border text-center">
            <RailMetric label="社区" value={query ? String(communityCount) : "--"} />
            <RailMetric label="帖子" value={query ? String(postCount) : "--"} />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold">继续浏览</h2>
          <div className="mt-3 flex flex-col border-y border-border">
            <TextAction href="/communities" variant="bar">
              浏览社区
            </TextAction>
            <TextAction href="/" variant="bar">
              返回信息流
            </TextAction>
          </div>
        </section>
      </div>
    </aside>
  );
}

function RailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-border p-3 last:border-r-0">
      <div className="font-mono text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}

function getSearchSourceHref(query: string, scope: SearchScope) {
  if (!query) {
    return `/search?scope=${scope}`;
  }

  return `/search?q=${encodeURIComponent(query)}&scope=${scope}`;
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

function cnScopeTrigger(index: number) {
  return [
    "rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
    index < scopeOptions.length - 1 ? "border-r border-border" : "",
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
