"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Hash, MessageSquare, Users } from "lucide-react";

import { rememberRecentCommunity } from "@/components/app-shell/recent-communities";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { TextAction } from "@/components/ui/text-action";
import { useAuthSession } from "@/features/auth/auth-session";
import { ApiError } from "@/lib/api/client";

import { CommunityFollowButton } from "./community-follow-button";
import { useCommunitiesQuery } from "./queries";
import type { Community } from "./types";

export function CommunityList() {
  const { token } = useAuthSession();
  const isAuthenticated = Boolean(token);
  const communitiesQuery = useCommunitiesQuery();
  const communities = communitiesQuery.data?.communities ?? [];

  return (
    <div className="grid grid-cols-1 gap-0 py-2 xl:grid-cols-[minmax(0,1fr)_280px] xl:gap-8">
      <div className="min-w-0">
        <section className="bg-background">
          <div className="border-b border-border pb-4">
            <CommunityListHeader
              communities={communities}
              isLoading={communitiesQuery.isLoading}
            />
          </div>

          <div className="flex min-h-12 flex-col gap-3 border-b border-border py-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold">全部社区</h2>
            <CommunityApplicationAction isAuthenticated={isAuthenticated} />
          </div>

          {communitiesQuery.isLoading ? (
            <div className="border-b border-border py-4">
              <LoadingState rows={5} />
            </div>
          ) : null}

          {communitiesQuery.isError ? (
            <div className="border-b border-border py-4">
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
            <div className="border-b border-border">
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

          {communitiesQuery.isSuccess && communities.length > 0 ? (
            <div className="grid gap-3 border-b border-border py-3 lg:grid-cols-2">
              {communities.map((community) => (
                <CommunityCard key={community.id} community={community} />
              ))}
            </div>
          ) : null}
        </section>
      </div>

      <CommunityListRail
        communities={communities}
        isAuthenticated={isAuthenticated}
        isLoading={communitiesQuery.isLoading}
      />
    </div>
  );
}

function CommunityListHeader({
  communities,
  isLoading,
}: {
  communities: Community[];
  isLoading: boolean;
}) {
  return (
    <div className="py-4">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex size-10 shrink-0 items-center justify-center bg-background-soft text-primary"
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
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          浏览已经开放的校园讨论场域，进入具体社区后再阅读、发帖或管理。
        </p>
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          {isLoading ? "正在加载社区目录" : `${communities.length} 个社区`}
        </p>
      </div>
    </div>
  );
}

function CommunityCard({ community }: { community: Community }) {
  const href = `/communities/${encodeURIComponent(community.slug)}`;

  return (
    <article className="group grid h-[304px] overflow-hidden border border-border bg-background transition-colors hover:border-border-strong sm:h-[204px] sm:grid-cols-[112px_minmax(0,1fr)]">
      <Link
        href={href}
        onClick={() => rememberRecentCommunity(community)}
        className="relative min-h-24 overflow-hidden bg-background-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:min-h-full"
      >
        <CommunityBanner community={community} />
        <div className="absolute inset-x-0 bottom-0 flex items-end bg-gradient-to-t from-background/95 via-background/72 to-transparent p-3">
          <CommunityAvatar community={community} />
        </div>
      </Link>

      <div className="flex min-h-0 min-w-0 flex-col px-3 py-3">
        <div className="flex min-w-0 items-start gap-3">
          <Link
            href={href}
            onClick={() => rememberRecentCommunity(community)}
            className="min-w-0 flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <div className="community-card-slug h-5 max-w-full truncate font-mono text-[11px] font-semibold leading-5 text-primary">
              /{community.slug}
            </div>
            <div className="flex h-5 min-w-0 flex-wrap items-center overflow-hidden text-[11px] leading-5 text-muted-foreground">
              <span>{formatCommunityKind(community.kind)}</span>
              <span className="px-1.5" aria-hidden="true">
                ·
              </span>
              <span>{formatCommunityVisibility(community.visibility)}</span>
              <span className="px-1.5" aria-hidden="true">
                ·
              </span>
              <span>{formatCommunityStatus(community.status)}</span>
            </div>

            <h2 className="community-card-title mt-1 h-6 max-w-full truncate text-base font-semibold leading-6 tracking-normal text-foreground transition-colors group-hover:text-primary">
              {community.name}
            </h2>
            <p className="mt-1 line-clamp-2 h-10 text-sm leading-5 text-muted-foreground">
              {community.description || "这个社区还没有填写描述。"}
            </p>
          </Link>
          <CommunityFollowButton community={community} compact />
        </div>

        <div className="mt-auto grid grid-cols-3 gap-2 border-t border-border pt-2 text-xs text-muted-foreground">
          <CommunityMetric
            icon={<Users className="size-3.5" aria-hidden="true" />}
            label="成员"
            value={formatCompactCount(community.member_count)}
          />
          <CommunityMetric
            icon={<MessageSquare className="size-3.5" aria-hidden="true" />}
            label="帖子"
            value={formatCompactCount(community.post_count)}
          />
          <div className="min-w-0">
            <div className="font-mono text-[11px] text-muted-foreground">
              更新
            </div>
            <div className="mt-0.5 truncate font-semibold text-foreground">
              {formatShortDate(community.updated_at)}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function CommunityBanner({ community }: { community: Community }) {
  const bannerUrl = community.banner_url?.trim();

  if (bannerUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={bannerUrl}
        alt={`/${community.slug} 的社区背景`}
        className="size-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03]"
      />
    );
  }

  return (
    <div className="flex size-full items-start justify-end bg-background-soft p-3 text-primary/45">
      <Hash className="size-9" aria-hidden="true" />
    </div>
  );
}

function CommunityAvatar({ community }: { community: Community }) {
  const avatarUrl = community.avatar_url?.trim();

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={`/${community.slug} 的社区头像`}
        className="size-10 shrink-0 rounded-lg bg-background-soft object-cover"
      />
    );
  }

  return (
    <span
      className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-background-soft text-primary"
      aria-label={`/${community.slug} 的社区头像占位`}
    >
      <Hash className="size-5" aria-hidden="true" />
    </span>
  );
}

function CommunityMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-0.5 truncate font-semibold text-foreground">{value}</div>
    </div>
  );
}

function CommunityListRail({
  communities,
  isAuthenticated,
  isLoading,
}: {
  communities: Community[];
  isAuthenticated: boolean;
  isLoading: boolean;
}) {
  const recentCommunities = [...communities]
    .sort(
      (left, right) =>
        new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime(),
    )
    .slice(0, 3);

  return (
    <aside className="border-t border-border px-0 py-5 xl:border-l xl:border-t-0 xl:pl-5">
      <div className="sticky top-20 right-rail-scroll space-y-6">
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
          <h2 className="text-sm font-semibold">社区入口</h2>
          <div className="mt-3 flex flex-col border-t border-border">
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

function formatCompactCount(value: number | undefined) {
  if (typeof value !== "number") {
    return "暂无";
  }

  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 1,
    notation: value >= 10000 ? "compact" : "standard",
  }).format(value);
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

