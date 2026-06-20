"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Hash, MessageSquare, Users } from "lucide-react";

import { rememberRecentCommunity } from "@/components/app-shell/recent-communities";
import {
  ReviewDesk,
  ReviewDeskBoard,
  ReviewDeskInspector,
} from "@/components/app-shell/review-desk";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { StatusToken } from "@/components/ui/data-display";
import { TextAction } from "@/components/ui/text-action";
import { useAuthSession } from "@/features/auth/auth-session";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

import { CommunityFollowButton } from "./community-follow-button";
import { useCommunitiesQuery } from "./queries";
import type { Community } from "./types";

export function CommunityList() {
  const { token } = useAuthSession();
  const isAuthenticated = Boolean(token);
  const communitiesQuery = useCommunitiesQuery();
  const communities = communitiesQuery.data?.communities ?? [];

  return (
    <ReviewDesk className="max-w-[1180px]">
      <CommunityListHeader
        communities={communities}
        isAuthenticated={isAuthenticated}
        isLoading={communitiesQuery.isLoading}
      />

      <ReviewDeskBoard
        className="xl:grid-cols-[minmax(0,1fr)_320px]"
        inspector={
          <CommunityListRail
            communities={communities}
            isAuthenticated={isAuthenticated}
            isLoading={communitiesQuery.isLoading}
          />
        }
      >
        <section className="min-w-0 space-y-3" aria-label="社区列表">
          {communitiesQuery.isLoading ? (
            <div className="rounded-lg bg-surface px-4 py-4">
              <LoadingState rows={5} />
            </div>
          ) : null}

          {communitiesQuery.isError ? (
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
                    variant="ghost"
                    size="sm"
                    className="px-1 hover:bg-transparent hover:text-primary"
                    onClick={() => communitiesQuery.refetch()}
                  >
                    重试
                  </Button>
                )
              }
            />
          ) : null}

          {communitiesQuery.isSuccess && communities.length === 0 ? (
            <EmptyState
              className="bg-surface"
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
          ) : null}

          {communitiesQuery.isSuccess && communities.length > 0 ? (
            <div className="grid gap-3">
              {communities.map((community) => (
                <CommunityCard key={community.id} community={community} />
              ))}
            </div>
          ) : null}
        </section>
      </ReviewDeskBoard>
    </ReviewDesk>
  );
}

function CommunityListHeader({
  communities,
  isAuthenticated,
  isLoading,
}: {
  communities: Community[];
  isAuthenticated: boolean;
  isLoading: boolean;
}) {
  return (
    <header className="flex min-w-0 flex-col gap-3 py-1 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="font-mono text-[11px] font-semibold uppercase text-primary">
          /communities
        </div>
        <h1 className="mt-1 text-2xl font-semibold leading-8 tracking-normal text-foreground">
          社区索引
        </h1>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {isLoading
            ? "正在同步社区目录。"
            : `共 ${communities.length} 个社区，进入具体社区后再阅读、发帖或管理。`}
        </p>
      </div>
      <CommunityApplicationAction isAuthenticated={isAuthenticated} />
    </header>
  );
}

function CommunityCard({ community }: { community: Community }) {
  const href = `/communities/${encodeURIComponent(community.slug)}`;
  const bannerUrl = community.banner_url?.trim();

  return (
    <article className="nexus-soft-transition group relative overflow-hidden rounded-lg bg-surface px-4 py-4 hover:bg-surface-hover">
      {bannerUrl ? (
        <CommunityBannerBackdrop bannerUrl={bannerUrl} community={community} />
      ) : null}

      <div className="relative z-10 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <CommunityAvatar community={community} />
          <div className="min-w-0 flex-1">
            <Link
              href={href}
              onClick={() => rememberRecentCommunity(community)}
              className="block min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <div className="truncate font-mono text-[11px] font-semibold leading-5 text-primary">
                /{community.slug}
              </div>
              <h2 className="mt-0.5 line-clamp-1 text-base font-semibold leading-6 tracking-normal text-foreground transition-colors group-hover:text-primary">
                {community.name}
              </h2>
            </Link>

            <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
              {community.description || "这个社区还没有填写描述。"}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusToken>{formatCommunityKind(community.kind)}</StatusToken>
              <StatusToken>{formatCommunityVisibility(community.visibility)}</StatusToken>
              <StatusToken tone={getStatusTone(community.status)}>
                {formatCommunityStatus(community.status)}
              </StatusToken>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground sm:max-w-[260px] sm:justify-end">
          <CommunityFact
            icon={<Users className="size-3.5" aria-hidden="true" />}
            label="成员"
            value={formatCompactCount(community.member_count)}
          />
          <CommunityFact
            icon={<MessageSquare className="size-3.5" aria-hidden="true" />}
            label="帖子"
            value={formatCompactCount(community.post_count)}
          />
          <CommunityFact
            icon={<Hash className="size-3.5" aria-hidden="true" />}
            label="更新"
            value={formatShortDate(community.updated_at)}
          />
          <CommunityFollowButton community={community} compact />
        </div>
      </div>
    </article>
  );
}

function CommunityBannerBackdrop({
  bannerUrl,
  community,
}: {
  bannerUrl: string;
  community: Community;
}) {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-label={`/${community.slug} 的社区背景`}
      role="img"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={bannerUrl}
        alt=""
        className="h-full w-full object-cover opacity-45 saturate-[0.95] transition-transform duration-300 ease-out group-hover:scale-[1.015] motion-reduce:transform-none"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/75 to-surface/25" />
      <div className="absolute inset-0 bg-gradient-to-t from-surface/65 via-transparent to-surface/10" />
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
        className="size-11 shrink-0 rounded-md bg-background-soft object-cover"
      />
    );
  }

  return (
    <span
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
      aria-label={`/${community.slug} 的社区头像占位`}
    >
      <Hash className="size-5" aria-hidden="true" />
    </span>
  );
}

function CommunityFact({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      {icon}
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </span>
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
    .slice(0, 4);

  return (
    <div className="space-y-4">
      <ReviewDeskInspector
        title="社区上下文"
        description="目录只展示已开放社区；具体权限和发帖入口由社区详情页确认。"
      >
        <dl className="grid gap-2">
          <RailStat label="目录规模" value={`${communities.length} 个社区`} />
          <RailStat
            label="启用中"
            value={`${communities.filter((community) => community.status === "active").length} 个`}
          />
          <RailStat
            label="可公开浏览"
            value={`${communities.filter((community) => community.visibility === "public").length} 个`}
          />
        </dl>
      </ReviewDeskInspector>

      <ReviewDeskInspector title="最近更新" description="按社区更新时间排序。">
        {isLoading ? (
          <LoadingState rows={2} />
        ) : recentCommunities.length > 0 ? (
          <div className="space-y-1">
            {recentCommunities.map((community) => (
              <Link
                key={community.id}
                href={`/communities/${encodeURIComponent(community.slug)}`}
                onClick={() => rememberRecentCommunity(community)}
                className="group block rounded-md px-1.5 py-2 transition-colors hover:bg-surface-raised hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="font-mono text-[11px] text-muted-foreground">
                  /{community.slug} · {formatDate(community.updated_at)}
                </div>
                <div className="mt-1 line-clamp-2 text-sm font-semibold text-foreground group-hover:text-primary">
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
      </ReviewDeskInspector>

      <ReviewDeskInspector title="继续浏览">
        <div className="space-y-1">
          <CommunityApplicationAction
            className="w-full justify-between"
            isAuthenticated={isAuthenticated}
            variant="rail"
          />
          <RailActionLink href="/">回到信息流</RailActionLink>
        </div>
      </ReviewDeskInspector>
    </div>
  );
}

function RailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-md px-1.5 py-2">
      <dt className="font-mono text-[11px] text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function RailActionLink({
  children,
  className,
  href,
}: {
  children: ReactNode;
  className?: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex min-h-10 items-center justify-between gap-3 rounded-md px-1.5 py-2 text-sm font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <span>{children}</span>
      <ArrowRight
        className="size-4 text-muted-foreground transition duration-150 group-hover:translate-x-1 group-hover:text-primary motion-reduce:transform-none"
        aria-hidden="true"
      />
    </Link>
  );
}

function CommunityApplicationAction({
  className,
  isAuthenticated,
  variant = "inline",
}: {
  className?: string;
  isAuthenticated: boolean;
  variant?: "inline" | "rail";
}) {
  const href = isAuthenticated
    ? "/community-applications/new"
    : `/login?next=${encodeURIComponent("/community-applications/new")}`;
  const label = isAuthenticated ? "申请社区" : "登录后申请";

  if (variant === "rail") {
    return (
      <RailActionLink className={className} href={href}>
        {label}
      </RailActionLink>
    );
  }

  return (
    <TextAction className={className} href={href} tone="primary">
      {label}
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

function getStatusTone(status: string) {
  switch (status) {
    case "active":
      return "success";
    case "archived":
      return "warning";
    case "suspended":
      return "danger";
    default:
      return "default";
  }
}
