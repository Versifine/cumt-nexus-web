"use client";

import Link from "next/link";
import { Hash } from "lucide-react";

import { rememberRecentCommunity } from "@/components/app-shell/recent-communities";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { InfoRow } from "@/components/ui/data-display";
import { TextAction } from "@/components/ui/text-action";
import { useAuthSession } from "@/features/auth/auth-session";
import { ApiError } from "@/lib/api/client";

import { useCommunitiesQuery } from "./queries";
import type { Community } from "./types";

export function CommunityList() {
  const { token } = useAuthSession();
  const isAuthenticated = Boolean(token);
  const communitiesQuery = useCommunitiesQuery();
  const communities = communitiesQuery.data?.communities ?? [];
  const activeCount = communities.filter(
    (community) => community.status === "active",
  ).length;
  const publicCount = communities.filter(
    (community) => community.visibility === "public",
  ).length;

  return (
    <div className="grid grid-cols-1 gap-0 py-4 xl:grid-cols-[minmax(0,1fr)_312px]">
      <div className="min-w-0">
        <section className="border border-border bg-background">
          <CommunityListHeader
            activeCount={activeCount}
            communities={communities}
            isLoading={communitiesQuery.isLoading}
            publicCount={publicCount}
          />
        </section>

        <section className="mt-3 border-x border-border bg-background">
          <div className="flex min-h-12 flex-col gap-3 border-b border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">社区列表</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                选择一个社区进入对应帖子流
              </p>
            </div>
            <CommunityApplicationAction isAuthenticated={isAuthenticated} />
          </div>

          {communitiesQuery.isLoading ? (
            <div className="border-b border-border p-4">
              <LoadingState rows={5} />
            </div>
          ) : null}

          {communitiesQuery.isError ? (
            <div className="border-b border-border p-4">
              <ErrorState
                title={getErrorTitle(communitiesQuery.error)}
                description={getErrorDescription(communitiesQuery.error)}
                action={
                  isUnauthenticated(communitiesQuery.error) ? (
                    <TextAction href="/login" tone="primary">
                      登录
                    </TextAction>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => communitiesQuery.refetch()}
                    >
                      重试
                    </Button>
                  )
                }
              />
            </div>
          ) : null}

          {communitiesQuery.isSuccess && communities.length === 0 ? (
            <div className="border-b border-border p-4">
              <EmptyState
                title="还没有社区"
                description="公开社区创建并启用后，会出现在这里。"
                action={
                  isAuthenticated ? (
                    <TextAction href="/community-applications/new" tone="primary">
                      申请第一个社区
                    </TextAction>
                  ) : (
                    <TextAction
                      href={`/login?next=${encodeURIComponent(
                        "/community-applications/new",
                      )}`}
                      tone="primary"
                    >
                      登录后申请
                    </TextAction>
                  )
                }
              />
            </div>
          ) : null}

          {communitiesQuery.isSuccess && communities.length > 0
            ? communities.map((community) => (
                <CommunityRow key={community.id} community={community} />
              ))
            : null}
        </section>
      </div>

      <CommunityListRail
        activeCount={activeCount}
        communities={communities}
        isAuthenticated={isAuthenticated}
        isLoading={communitiesQuery.isLoading}
        publicCount={publicCount}
      />
    </div>
  );
}

function CommunityListHeader({
  activeCount,
  communities,
  isLoading,
  publicCount,
}: {
  activeCount: number;
  communities: Community[];
  isLoading: boolean;
  publicCount: number;
}) {
  return (
    <div className="grid gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex size-12 shrink-0 items-center justify-center border border-border bg-secondary text-primary"
            aria-label="社区图标"
          >
            <Hash className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="break-words text-xl font-semibold leading-7 tracking-normal text-foreground sm:text-2xl">
              社区
            </h1>
            <p className="mt-1 truncate font-mono text-xs text-primary">
              communities
            </p>
          </div>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          按社区进入讨论场域。公开社区可直接浏览，登录后再申请创建新的社区。
        </p>
      </div>

      <div className="grid grid-cols-3 border border-border text-center">
        <HeaderMetric
          label="全部"
          value={formatMetric(communities.length, isLoading)}
        />
        <HeaderMetric label="启用" value={formatMetric(activeCount, isLoading)} />
        <HeaderMetric label="公开" value={formatMetric(publicCount, isLoading)} />
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

function CommunityRow({ community }: { community: Community }) {
  return (
    <Link
      href={`/communities/${encodeURIComponent(community.slug)}`}
      onClick={() => rememberRecentCommunity(community)}
      className="group grid grid-cols-[42px_minmax(0,1fr)] border-b border-border bg-background transition-colors hover:bg-background-soft/60 sm:grid-cols-[48px_minmax(0,1fr)]"
    >
      <div className="border-r border-border bg-background-soft/45 px-2 py-3">
        <div className="flex size-8 items-center justify-center border border-border text-primary">
          <Hash className="size-4" aria-hidden="true" />
        </div>
      </div>

      <div className="min-w-0 px-3 py-3 sm:px-4">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5 text-muted-foreground">
          <span className="font-semibold text-foreground">/{community.slug}</span>
          <span aria-hidden="true">·</span>
          <span>{formatCommunityKind(community.kind)}</span>
          <span aria-hidden="true">·</span>
          <span>{formatCommunityVisibility(community.visibility)}</span>
          <span aria-hidden="true">·</span>
          <span>{formatCommunityStatus(community.status)}</span>
          <span aria-hidden="true">·</span>
          <span>更新 {formatDate(community.updated_at)}</span>
        </div>

        <h2 className="mt-1 break-words text-base font-semibold leading-6 tracking-normal text-foreground transition-colors group-hover:text-primary sm:text-lg">
          {community.name}
        </h2>
        <p className="mt-2 line-clamp-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          {community.description || "这个社区还没有填写描述。"}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs leading-5 text-muted-foreground">
          <span>创建 {formatDate(community.created_at)}</span>
          <span aria-hidden="true">·</span>
          <span>点击进入帖子流</span>
        </div>
      </div>
    </Link>
  );
}

function CommunityListRail({
  activeCount,
  communities,
  isAuthenticated,
  isLoading,
  publicCount,
}: {
  activeCount: number;
  communities: Community[];
  isAuthenticated: boolean;
  isLoading: boolean;
  publicCount: number;
}) {
  const recentCommunities = [...communities]
    .sort(
      (left, right) =>
        new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime(),
    )
    .slice(0, 3);

  return (
    <aside className="border-t border-border bg-background-soft/45 px-4 py-5 xl:border-l xl:border-t-0">
      <div className="sticky top-20 space-y-5">
        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">目录上下文</h2>
          <div className="mt-3 divide-y divide-border border-y border-border">
            <InfoRow label="全部" value={formatMetric(communities.length, isLoading)} />
            <InfoRow label="启用" value={formatMetric(activeCount, isLoading)} />
            <InfoRow label="公开" value={formatMetric(publicCount, isLoading)} />
          </div>
        </section>

        <section className="border-b border-border pb-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">最近更新</h2>
            <span className="font-mono text-xs text-muted-foreground">
              {recentCommunities.length}
            </span>
          </div>
          {isLoading ? (
            <LoadingState rows={2} />
          ) : recentCommunities.length > 0 ? (
            <div className="divide-y divide-border">
              {recentCommunities.map((community) => (
                <Link
                  key={community.id}
                  href={`/communities/${encodeURIComponent(community.slug)}`}
                  onClick={() => rememberRecentCommunity(community)}
                  className="block py-3 transition-colors hover:text-primary"
                >
                  <div className="font-mono text-xs text-muted-foreground">
                    /{community.slug} · {formatDate(community.updated_at)}
                  </div>
                  <div className="mt-1 line-clamp-2 text-sm font-medium">
                    {community.name}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              暂无可展示的社区。
            </p>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold">社区功能</h2>
          <div className="mt-3 flex flex-col border-y border-border">
            <CommunityApplicationAction
              isAuthenticated={isAuthenticated}
              variant="bar"
            />
            <TextAction href="/" variant="bar">
              回到信息流
            </TextAction>
          </div>
        </section>
      </div>
    </aside>
  );
}

function CommunityApplicationAction({
  isAuthenticated,
  variant,
}: {
  isAuthenticated: boolean;
  variant?: "bar";
}) {
  if (isAuthenticated) {
    return (
      <TextAction
        href="/community-applications/new"
        tone="primary"
        variant={variant}
      >
        申请社区
      </TextAction>
    );
  }

  return (
    <TextAction
      href={`/login?next=${encodeURIComponent("/community-applications/new")}`}
      tone="primary"
      variant={variant}
    >
      登录后申请
    </TextAction>
  );
}

function formatMetric(value: number, isLoading: boolean) {
  return isLoading ? "--" : String(value);
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
    return "公开社区暂不可读";
  }

  return "无法加载社区列表";
}

function getErrorDescription(error: Error | null) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}

function formatCommunityKind(kind: string) {
  switch (kind) {
    case "system":
      return "系统社区";
    case "user":
    case "user_created":
      return "用户社区";
    default:
      return kind;
  }
}

function formatCommunityVisibility(visibility: string) {
  switch (visibility) {
    case "public":
      return "公开";
    case "restricted":
      return "受限";
    case "private":
      return "私密";
    default:
      return visibility;
  }
}

function formatCommunityStatus(status: string) {
  switch (status) {
    case "active":
      return "已启用";
    case "archived":
      return "已归档";
    case "suspended":
      return "已暂停";
    case "pending":
      return "待审核";
    default:
      return status;
  }
}
