"use client";

import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Hash, Search } from "lucide-react";

import { PageNav } from "@/components/app-shell/page-nav";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TextAction } from "@/components/ui/text-action";
import { useAuthSession } from "@/features/auth/auth-session";
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
  const { isReady, token } = useAuthSession();
  const query = searchParams.get("q")?.trim() ?? "";
  const scope = normalizeScope(searchParams.get("scope"));
  const canSearch = isReady && Boolean(token);
  const searchQuery = useSearchQuery(
    { limit: 20, offset: 0, q: query, scope },
    canSearch,
  );

  const communities = searchQuery.data?.communities ?? [];
  const posts = searchQuery.data?.posts ?? [];
  const resultCount = communities.length + posts.length;
  const loginHref = `/login?next=${encodeURIComponent(
    query ? `/search?q=${encodeURIComponent(query)}&scope=${scope}` : "/search",
  )}`;

  const metrics = useMemo(
    () => [
      { label: "社区", value: canSearch && query ? String(communities.length) : "--" },
      { label: "帖子", value: canSearch && query ? String(posts.length) : "--" },
      { label: "范围", value: formatScope(scope) },
    ],
    [canSearch, communities.length, posts.length, query, scope],
  );

  function submitSearch(nextQuery: string) {
    if (!nextQuery) {
      router.push("/search");
      return;
    }

    router.push(`/search?q=${encodeURIComponent(nextQuery)}&scope=${scope}`);
  }

  function updateScope(nextScope: SearchScope) {
    if (!query) {
      router.replace(`/search?scope=${nextScope}`);
      return;
    }

    router.replace(`/search?q=${encodeURIComponent(query)}&scope=${nextScope}`);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-[1180px] px-4 py-6 md:px-6">
        <PageNav backHref="/" backLabel="返回最新讨论" />

        <header className="border-b border-border pb-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div className="min-w-0">
              <div className="font-mono text-xs uppercase text-primary">
                CUMT NEXUS / 搜索
              </div>
              <h1 className="mt-4 text-5xl font-black leading-[0.95] tracking-normal text-foreground md:text-6xl">
                搜索社区和帖子
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
                搜索关键词和范围会保留在 URL 中，方便返回、分享和复查。
              </p>
            </div>

            <div className="grid grid-cols-3 border border-border text-center">
              {metrics.map((metric) => (
                <div key={metric.label} className="border-r border-border p-3 last:border-r-0">
                  <div className="font-mono text-[11px] uppercase text-muted-foreground">
                    {metric.label}
                  </div>
                  <div className="mt-2 truncate text-xl font-black">
                    {metric.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <SearchControls
            key={query}
            initialQuery={query}
            isFetching={searchQuery.isFetching}
            isReady={isReady}
            onScopeChange={updateScope}
            onSubmitSearch={submitSearch}
            scope={scope}
          />
        </header>

        <section className="py-5">
          {!isReady ? (
            <div className="border-b border-border pb-5">
              <LoadingState rows={3} />
            </div>
          ) : null}

          {isReady && !token ? (
            <EmptyState
              title="登录后使用搜索"
              description="搜索需要身份上下文，登录后可以检索可见社区和帖子。"
              action={
                <TextAction href={loginHref} tone="primary">
                  登录
                </TextAction>
              }
            />
          ) : null}

          {canSearch && !query ? (
            <EmptyState
              title="输入关键词开始搜索"
              description="可以搜索社区名称、slug、帖子标题和正文摘要。"
            />
          ) : null}

          {canSearch && query && searchQuery.isPending ? (
            <div className="border-b border-border pb-5">
              <LoadingState rows={5} />
            </div>
          ) : null}

          {canSearch && query && searchQuery.isError ? (
            <ErrorState
              title={getErrorTitle(searchQuery.error)}
              description={getErrorDescription(searchQuery.error)}
              action={
                isUnauthenticated(searchQuery.error) ? (
                  <TextAction href={loginHref} tone="primary">
                    登录
                  </TextAction>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => searchQuery.refetch()}
                  >
                    重试
                  </Button>
                )
              }
            />
          ) : null}

          {canSearch && query && searchQuery.isSuccess && resultCount === 0 ? (
            <EmptyState
              title="没有找到结果"
              description="换一个关键词，或切换搜索范围再试。"
            />
          ) : null}

          {canSearch && query && searchQuery.isSuccess && resultCount > 0 ? (
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0 space-y-8">
                {scope !== "posts" ? (
                  <ResultSection
                    count={communities.length}
                    label="COMMUNITIES"
                    title="社区结果"
                  >
                    {communities.length > 0 ? (
                      <div className="divide-y divide-border border-b border-border">
                        {communities.map((community, index) => (
                          <CommunityResultRow
                            key={community.id}
                            community={community}
                            index={index}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="border-b border-border pb-4 text-sm text-muted-foreground">
                        当前范围内没有社区结果。
                      </p>
                    )}
                  </ResultSection>
                ) : null}

                {scope !== "communities" ? (
                  <ResultSection count={posts.length} label="POSTS" title="帖子结果">
                    {posts.length > 0 ? (
                      <div className="divide-y divide-border border-b border-border">
                        {posts.map((post, index) => (
                          <PostResultRow key={post.id} index={index} post={post} />
                        ))}
                      </div>
                    ) : (
                      <p className="border-b border-border pb-4 text-sm text-muted-foreground">
                        当前范围内没有帖子结果。
                      </p>
                    )}
                  </ResultSection>
                ) : null}
              </div>

              <aside className="border-t border-border pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                <div className="sticky top-6 space-y-6">
                  <section className="border-b border-border pb-6">
                    <div className="font-mono text-xs uppercase text-muted-foreground">
                      当前搜索
                    </div>
                    <h2 className="mt-3 break-words text-2xl font-black">
                      {query}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      范围：{formatScope(scope)}。结果由后端搜索接口返回，前端不伪造高亮和排序。
                    </p>
                  </section>
                  <section>
                    <h2 className="text-sm font-semibold">下一步</h2>
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
            </div>
          ) : null}
        </section>
      </div>
    </main>
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
      <TabsList className="rounded-none border-border bg-background p-0">
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

function SearchControls({
  initialQuery,
  isFetching,
  isReady,
  onScopeChange,
  onSubmitSearch,
  scope,
}: {
  initialQuery: string;
  isFetching: boolean;
  isReady: boolean;
  onScopeChange: (scope: SearchScope) => void;
  onSubmitSearch: (query: string) => void;
  scope: SearchScope;
}) {
  const [draft, setDraft] = useState(initialQuery);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmitSearch(draft.trim());
  }

  return (
    <form
      className="mt-5 grid gap-3 border-y border-border py-4 md:grid-cols-[minmax(0,1fr)_auto_auto]"
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
      <ScopeTabs
        disabled={!isReady || isFetching}
        scope={scope}
        onScopeChange={onScopeChange}
      />
      <Button type="submit" disabled={!isReady || !draft.trim()}>
        搜索
      </Button>
    </form>
  );
}

function ResultSection({
  children,
  count,
  label,
  title,
}: {
  children: ReactNode;
  count: number;
  label: string;
  title: string;
}) {
  return (
    <section>
      <div className="mb-2 flex items-end justify-between border-b border-border pb-3">
        <div>
          <div className="font-mono text-xs uppercase text-primary">{label}</div>
          <h2 className="mt-1 text-xl font-black">{title}</h2>
        </div>
        <span className="border border-border px-2.5 py-1 font-mono text-xs">
          {count}
        </span>
      </div>
      {children}
    </section>
  );
}

function CommunityResultRow({
  community,
  index,
}: {
  community: SearchCommunityResult;
  index: number;
}) {
  return (
    <Link
      href={`/communities/${community.slug}`}
      className="group grid gap-4 py-5 transition-colors hover:bg-background-soft/70 md:grid-cols-[56px_minmax(0,1fr)_120px]"
    >
      <div className="flex items-center gap-3 md:block">
        <div className="font-mono text-xs text-muted-foreground">
          {String(index + 1).padStart(2, "0")}
        </div>
        <div className="mt-0 flex size-8 items-center justify-center border border-border text-primary md:mt-4">
          <Hash className="size-4" aria-hidden="true" />
        </div>
      </div>
      <div className="min-w-0">
        <div className="font-mono text-xs text-primary">/{community.slug}</div>
        <h3 className="mt-2 text-xl font-black group-hover:text-primary">
          {community.name}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
          {community.description || "暂无描述。"}
        </p>
      </div>
      <div className="flex items-center justify-end gap-2 text-sm font-semibold text-muted-foreground group-hover:text-primary">
        打开
        <ArrowRight
          className="size-4 transition-transform group-hover:translate-x-1"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}

function PostResultRow({
  index,
  post,
}: {
  index: number;
  post: SearchPostResult;
}) {
  return (
    <Link
      href={`/posts/${post.id}`}
      className="group grid gap-4 py-5 transition-colors hover:bg-background-soft/70 md:grid-cols-[56px_minmax(0,1fr)_120px]"
    >
      <div className="font-mono text-xs text-muted-foreground">
        {String(index + 1).padStart(2, "0")}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="border border-border px-2 py-0.5 font-mono">
            /{post.community_slug}
          </span>
          <span>发布于 {formatDate(post.created_at)}</span>
        </div>
        <h3 className="mt-3 text-xl font-semibold leading-7 group-hover:text-primary">
          {post.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
          {post.body_excerpt || "暂无摘要。"}
        </p>
      </div>
      <div className="flex items-center justify-end gap-2 text-sm font-semibold text-muted-foreground group-hover:text-primary">
        查看
        <ArrowRight
          className="size-4 transition-transform group-hover:translate-x-1"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
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

function isUnauthenticated(error: Error | null) {
  return error instanceof ApiError && error.code === "unauthenticated";
}

function getErrorTitle(error: Error | null) {
  if (isUnauthenticated(error)) {
    return "需要登录";
  }

  return "无法完成搜索";
}

function getErrorDescription(error: Error | null) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}
