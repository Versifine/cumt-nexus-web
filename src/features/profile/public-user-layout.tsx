import type { ReactNode } from "react";
import Link from "next/link";
import {
  CalendarDays,
  FileText,
  MessageSquare,
  User,
} from "lucide-react";

import { useCurrentUserQuery } from "@/features/auth/queries";
import { cn } from "@/lib/utils";

import {
  getUserDisplayTitle,
  getUserProgression,
  hasUserIdentityMarks,
} from "./identity";
import { ProfileMediaEditor } from "./profile-media-editor";
import type { PublicUser } from "./types";
import { UserFollowButton } from "./user-follow-button";
import { UserIdentityMarks } from "./user-identity-marks";

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
  const currentUserQuery = useCurrentUserQuery();
  const isOwnProfile =
    currentUserQuery.data?.username?.toLowerCase() === user.username.toLowerCase();
  const displayTitle = getUserDisplayTitle(user);
  const progression = getUserProgression(user);

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
            {isOwnProfile ? (
              <Link
                href="/settings/profile"
                className="mb-2 inline-flex h-8 items-center bg-background/70 px-2 font-mono text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                编辑文字资料 +
              </Link>
            ) : (
              <UserFollowButton
                className="mb-2"
                username={user.username}
                viewerIsFollowing={user.viewer_is_following}
              />
            )}
          </div>

          <div className="mt-4 min-w-0">
            <div className="flex min-w-0 flex-wrap items-end gap-x-3 gap-y-2">
              <h1 className="break-words text-2xl font-semibold leading-8 tracking-normal text-foreground sm:text-3xl sm:leading-10">
                {displayName}
              </h1>
              <p className="pb-1 font-mono text-xs text-primary">
                @{user.username}
              </p>
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
            level={progression}
            maxItems={6}
            roles={user.roles}
          />

          <div className="mt-5 grid grid-cols-2 border-t border-border sm:grid-cols-5">
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
              label="关注者"
              value={formatMetricCount(user.stats.follower_count)}
            />
            <ProfileMetric
              label="正在关注"
              value={formatMetricCount(user.stats.following_count)}
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
    <aside className="hidden min-w-0 border-l border-border pl-5 xl:block">
      <div className="sticky top-20 right-rail-scroll space-y-6">
        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">公开资料</h2>
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
        </section>

        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">内容入口</h2>
          <div className="mt-3 flex flex-col border-t border-border">
            <RailLink
              active={activeTab === "posts"}
              href={getProfileTabHref(user.username, "posts")}
            >
              公开帖子
            </RailLink>
            <RailLink
              active={activeTab === "comments"}
              href={getProfileTabHref(user.username, "comments")}
            >
              公开评论
            </RailLink>
          </div>
        </section>

        {hasIdentityMarks ? (
          <section className="border-b border-border pb-5">
            <h2 className="text-sm font-semibold">身份和徽章</h2>
            <UserIdentityMarks
              badges={user.badges}
              className="mt-3 gap-2"
              displayTitle={displayTitle}
              level={progression}
              roles={user.roles}
            />
          </section>
        ) : null}

        {children}
      </div>
    </aside>
  );
}

function RailLink({
  active,
  children,
  href,
}: {
  active: boolean;
  children: ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative px-3 py-3 text-sm font-semibold transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        active
          ? "text-primary before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-primary"
          : "text-muted-foreground",
      )}
    >
      {children}
    </Link>
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

