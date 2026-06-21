import type { ReactNode } from "react";
import Link from "next/link";
import {
  CalendarDays,
  FileText,
  MessageCircle,
  MessageSquare,
  User,
} from "lucide-react";

import {
  RightRail,
  RightRailAction,
  RightRailActionList,
  RightRailSection,
} from "@/components/app-shell/right-rail";
import { useAuthSession } from "@/features/auth/auth-session";
import { useCurrentUserQuery, useMyPointsQuery } from "@/features/auth/queries";
import type { PointAccount } from "@/features/auth/types";
import { DisabledMessageShareAction } from "@/features/message/disabled-share-action";
import {
  getDirectMessageDrawerTarget,
  MessageDrawerAction,
} from "@/features/message/message-drawer-action";
import { createMessageShareSnapshot } from "@/features/message/share";
import type { DmCapability } from "@/features/message/types";
import { cn } from "@/lib/utils";

import {
  getUserDisplayTitle,
  getUserIdentityRoles,
  getUserProgression,
  hasUserIdentityMarks,
} from "./identity";
import { ProfileMediaEditor } from "./profile-media-editor";
import type { PublicUser } from "./types";
import { UserFollowButton } from "./user-follow-button";
import {
  getUserLevelTone,
  UserIdentityMarks,
  UserLevelBadge,
  UserLevelProgress,
} from "./user-identity-marks";

export type PublicUserProfileTab = "comments" | "posts";

type PublicUserLayoutProps = {
  activeTab: PublicUserProfileTab;
  children: ReactNode;
  railContent?: ReactNode;
  user: PublicUser;
};

const profileTabs: Array<{
  label: string;
  value: PublicUserProfileTab;
}> = [
  { label: "帖子", value: "posts" },
  { label: "评论", value: "comments" },
];

export function PublicUserLayout({
  activeTab,
  children,
  railContent,
  user,
}: PublicUserLayoutProps) {
  return (
    <div className="grid w-full min-w-0 gap-0 py-2 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0">
        <PublicUserHeader activeTab={activeTab} user={user} />

        <div>{children}</div>
      </div>

      <PublicUserRail activeTab={activeTab} user={user}>
        {railContent}
      </PublicUserRail>
    </div>
  );
}

export function PublicUserHeader({
  activeTab,
  user,
}: {
  activeTab: PublicUserProfileTab;
  user: PublicUser;
}) {
  const displayName = getDisplayName(user);
  const { isReady, token } = useAuthSession();
  const currentUserQuery = useCurrentUserQuery();
  const currentUsername = currentUserQuery.data?.username.trim().toLowerCase() ?? "";
  const profileUsername = user.username.trim().toLowerCase();
  const isOwnProfile =
    Boolean(currentUsername) && currentUsername === profileUsername;
  const isViewerProfilePending =
    isReady && Boolean(token) && currentUserQuery.isFetching && !currentUserQuery.data;
  const pointsQuery = useMyPointsQuery(isOwnProfile);
  const displayTitle = getUserDisplayTitle(user);
  const progression = getUserProgression(user);
  const userShare = createMessageShareSnapshot({
    shareId: user.username,
    shareType: "user",
    snapshotCreatedAt: user.created_at,
    summary: user.headline || user.bio,
    targetUrl: `/users/${encodeURIComponent(user.username)}`,
    thumbnailUrl: user.avatar_url,
    title: displayName,
  });

  return (
    <div>
      <div className="relative">
        <div className="relative">
          <ProfileBanner user={user} />
          {isOwnProfile ? (
            <div className="absolute bottom-3 right-3 z-20">
              <ProfileMediaEditor
                kind="banner"
                triggerVariant="banner"
                user={user}
              />
            </div>
          ) : null}
        </div>
        <div className="px-3 pb-5 sm:px-4">
          <div className="relative z-10 -mt-12 flex items-end justify-between gap-3 sm:-mt-16">
            <div className="relative shrink-0">
              <ProfileAvatar user={user} size="hero" />
              {isOwnProfile ? (
                <ProfileMediaEditor
                  className="absolute -bottom-1 -right-1"
                  kind="avatar"
                  triggerLabel="更换头像"
                  triggerVariant="avatar"
                  user={user}
                />
              ) : null}
            </div>
            {isViewerProfilePending ? (
              <div className="mb-2 h-8 w-24" aria-hidden="true" />
            ) : isOwnProfile ? (
              <Link
                href="/settings/profile"
                className="mb-2 inline-flex h-8 items-center bg-background/70 px-2 font-mono text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                编辑文字资料 +
              </Link>
            ) : (
              <div className="mb-2 flex shrink-0 flex-wrap items-center justify-end gap-2">
                <UserFollowButton
                  username={user.username}
                  viewerIsFollowing={user.viewer_is_following}
                />
                <DisabledProfileMessageAction
                  capability={user.dm_capability}
                  username={user.username}
                />
                <DisabledMessageShareAction
                  className="h-8 border border-border bg-background/70 px-2 text-xs font-semibold"
                  label="分享"
                  share={userShare}
                />
              </div>
            )}
          </div>

          <div className="mt-4 min-w-0">
            <div className="flex min-w-0 flex-wrap items-end gap-x-3 gap-y-1.5">
              <div className="flex min-w-0 flex-wrap items-end gap-x-3 gap-y-1.5">
                <h1 className="break-words text-2xl font-semibold leading-8 tracking-normal text-foreground sm:text-3xl sm:leading-10">
                  {displayName}
                </h1>
                <p className="pb-1 font-mono text-xs text-primary">
                  @{user.username}
                </p>
              </div>
              <ProfileSocialInline className="pb-1.5" user={user} />
            </div>

            {user.headline ? (
              <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-foreground">
                {user.headline}
              </p>
            ) : null}
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {user.bio || "这个用户还没有填写公开简介。"}
            </p>
          </div>

          <UserIdentityMarks
            badges={user.badges}
            className="mt-4 gap-2"
            displayTitle={displayTitle}
            level={null}
            maxItems={6}
            roles={getUserIdentityRoles(user)}
          />

          <ProfileGrowthStrip
            isOwnProfile={isOwnProfile}
            points={pointsQuery.data?.points}
            pointsError={pointsQuery.isError}
            pointsLoading={isOwnProfile && pointsQuery.isPending}
            progression={progression}
          />

          <div className="mt-5 grid grid-cols-2 border-t border-border sm:grid-cols-3">
            <ProfileMetric
              icon={<FileText className="size-4" aria-hidden="true" />}
              label="公开帖子"
              value={String(user.stats.post_count)}
            />
            <ProfileMetric
              icon={<MessageSquare className="size-4" aria-hidden="true" />}
              label="公开评论"
              value={String(user.stats.comment_count)}
            />
            <ProfileMetric
              icon={<CalendarDays className="size-4" aria-hidden="true" />}
              label="加入"
              value={formatCompactDate(user.created_at)}
            />
          </div>
        </div>
      </div>

      <nav
        className="flex border-b border-border"
        aria-label={`${displayName} 的主页内容`}
      >
        {profileTabs.map((item) => {
          const isActive = item.value === activeTab;

          return (
            <Link
              key={item.value}
              href={getProfileTabHref(user.username, item.value)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex-1 px-3 py-3 text-center text-sm font-semibold transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                isActive
                  ? "text-primary after:absolute after:inset-x-3 after:bottom-0 after:h-px after:bg-primary"
                  : "text-muted-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function DisabledProfileMessageAction({
  capability,
  username,
}: {
  capability?: DmCapability | null;
  username: string;
}) {
  const target = getDirectMessageDrawerTarget(username, capability);

  if (!target.disabledReason) {
    return (
      <MessageDrawerAction
        activeConversationId={target.activeConversationId}
        className="inline-flex h-8 items-center gap-1.5 border border-border bg-background/70 px-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        initialSearchParams={target.initialSearchParams}
        title="私信"
        triggerTitle={`给 @${username} 发私信`}
      >
        <MessageCircle className="size-3.5" aria-hidden="true" />
        私信
      </MessageDrawerAction>
    );
  }

  return (
    <span
      aria-disabled="true"
      className="inline-flex h-8 cursor-not-allowed items-center gap-1.5 border border-border bg-background/70 px-2 text-xs font-semibold text-muted-foreground/75"
      title={target.disabledReason}
    >
      <MessageCircle className="size-3.5" aria-hidden="true" />
      {target.disabledReason}
    </span>
  );
}

export function PublicUserRail({
  activeTab,
  children,
  user,
}: {
  activeTab: PublicUserProfileTab;
  children?: ReactNode;
  user: PublicUser;
}) {
  const displayName = getDisplayName(user);
  const displayTitle = getUserDisplayTitle(user);
  const progression = getUserProgression(user);
  const hasIdentityMarks = hasUserIdentityMarks(user);

  return (
    <RightRail className="hidden min-w-0 xl:block">
      <RightRailSection title="公开资料">
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {displayName} 在 {formatDate(user.created_at)} 加入。公开内容包含{" "}
          <span className="font-mono text-foreground">{user.stats.post_count}</span>{" "}
          篇帖子和{" "}
          <span className="font-mono text-foreground">{user.stats.comment_count}</span>{" "}
          条评论，关注者{" "}
          <span className="font-mono text-foreground">
            {formatMetricCount(user.stats.follower_count)}
          </span>
          。
        </p>
      </RightRailSection>

      <RightRailSection title="内容入口">
        <RightRailActionList>
          <RightRailAction
            href={getProfileTabHref(user.username, "posts")}
            tone={activeTab === "posts" ? "primary" : "default"}
          >
            公开帖子
          </RightRailAction>
          <RightRailAction
            href={getProfileTabHref(user.username, "comments")}
            tone={activeTab === "comments" ? "primary" : "default"}
          >
            公开评论
          </RightRailAction>
        </RightRailActionList>
      </RightRailSection>

      {hasIdentityMarks ? (
        <RightRailSection title="身份和徽章">
          <UserIdentityMarks
            badges={user.badges}
            className="mt-3 gap-2"
            displayTitle={displayTitle}
            level={progression}
            roles={getUserIdentityRoles(user)}
          />
        </RightRailSection>
      ) : null}

      {children}
    </RightRail>
  );
}

function ProfileSocialInline({
  className,
  user,
}: {
  className?: string;
  user: PublicUser;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-3 whitespace-nowrap text-xs leading-5 text-muted-foreground sm:gap-4 sm:text-[13px]",
        className,
      )}
    >
      <span>
        关注者{" "}
        <span className="font-mono text-foreground">
          {formatMetricCount(user.stats.follower_count)}
        </span>
      </span>
      <span>
        正在关注{" "}
        <span className="font-mono text-foreground">
          {formatMetricCount(user.stats.following_count)}
        </span>
      </span>
    </div>
  );
}

function ProfileGrowthStrip({
  isOwnProfile,
  points,
  pointsError,
  pointsLoading,
  progression,
}: {
  isOwnProfile: boolean;
  points?: PointAccount;
  pointsError: boolean;
  pointsLoading: boolean;
  progression: ReturnType<typeof getUserProgression>;
}) {
  const levelTone = getUserLevelTone(progression?.level);

  return (
    <div className="mt-4 max-w-3xl">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
        {progression ? (
          <UserLevelBadge level={progression} size="md" />
        ) : (
          <span className="font-mono text-base font-semibold text-muted-foreground">
            Lv.-
          </span>
        )}
        <span className="text-sm font-semibold text-foreground">
          {progression?.level_name || "暂无等级资料"}
        </span>
        <span className={cn("font-mono text-[11px]", levelTone.textClassName)}>
          {levelTone.label}
        </span>
        {progression?.active_title ? (
          <span className="truncate text-sm font-semibold text-foreground">
            {progression.active_title.name}
          </span>
        ) : null}
      </div>

      {isOwnProfile ? (
        <UserLevelProgress className="mt-2 max-w-xl" level={progression} showLabel />
      ) : null}

      {isOwnProfile ? (
        <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>
            积分余额{" "}
            <span className="font-mono text-foreground">
              {getPointsDisplay(points, pointsLoading, pointsError)}
            </span>
          </span>
          {points ? (
            <>
              <span>
                累计获得{" "}
                <span className="font-mono text-foreground">
                  {formatMetricCount(points.lifetime_earned)}
                </span>
              </span>
              <span>
                已消费{" "}
                <span className="font-mono text-foreground">
                  {formatMetricCount(points.lifetime_spent)}
                </span>
              </span>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ProfileMetric({
  icon,
  label,
  value,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 border-r border-border px-3 py-3 last:border-r-0">
      <div className="flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground">
        {icon ? <span className="shrink-0 text-primary">{icon}</span> : null}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 break-words text-xs font-semibold text-foreground sm:text-sm">
        {value}
      </div>
    </div>
  );
}

export function ProfileBanner({
  compact = false,
  user,
}: {
  compact?: boolean;
  user: PublicUser;
}) {
  const heightClass = compact ? "h-full" : "h-44 sm:h-56";

  if (user.banner_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.banner_url}
        alt={`${getDisplayName(user)} 的主页背景图`}
        className={cn("w-full object-cover", heightClass)}
      />
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-background-soft",
        heightClass,
      )}
      aria-label={`${getDisplayName(user)} 的主页背景图占位`}
    >
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(45,212,191,0.14)_0_1px,transparent_1px_100%),linear-gradient(0deg,rgba(255,255,255,0.035)_0_1px,transparent_1px_100%)] bg-[size:24px_24px]" />
    </div>
  );
}

export function ProfileAvatar({
  size,
  user,
}: {
  size: "hero" | "large" | "small";
  user: PublicUser;
}) {
  const sizeClass =
    size === "hero" ? "size-24 sm:size-32" : size === "large" ? "size-14" : "size-10";
  const iconClass =
    size === "hero" ? "size-9" : size === "large" ? "size-5" : "size-4";

  if (user.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatar_url}
        alt={`${getDisplayName(user)} 的头像`}
        className={cn(
          sizeClass,
          "shrink-0 rounded-full object-cover",
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        sizeClass,
        "flex shrink-0 items-center justify-center rounded-full bg-secondary text-primary",
      )}
      aria-label={`${getDisplayName(user)} 的头像占位`}
    >
      <User className={iconClass} aria-hidden="true" />
    </div>
  );
}

export function getDisplayName(user: PublicUser) {
  return user.display_name || user.username;
}

function formatMetricCount(value?: number) {
  if (typeof value !== "number") {
    return "暂无";
  }

  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 1,
    notation: value >= 10000 ? "compact" : "standard",
  }).format(value);
}

function getPointsDisplay(
  points: PointAccount | undefined,
  loading: boolean,
  error: boolean,
) {
  if (loading) {
    return "同步中";
  }

  if (error) {
    return "稍后重试";
  }

  return formatMetricCount(points?.balance);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatCompactDate(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}.${month}.${day}`;
}

export function getProfileTabHref(
  username: string,
  tab: PublicUserProfileTab,
) {
  const baseHref = `/users/${encodeURIComponent(username)}`;

  switch (tab) {
    case "posts":
      return baseHref;
    case "comments":
      return `${baseHref}/comments`;
    default:
      return baseHref;
  }
}
