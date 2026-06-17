"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { MessageCircle, User } from "lucide-react";

import { HoverPreview } from "@/components/ui/hover-preview";
import { useCurrentUserQuery } from "@/features/auth/queries";
import type { DmCapability } from "@/features/message/types";
import { cn } from "@/lib/utils";

import { getUserDisplayTitle, getUserProgression } from "./identity";
import { usePublicUserQuery } from "./queries";
import type { UserLevelSummary } from "./types";
import {
  UserIdentityMarks,
  UserInlineIdentity,
  UserLevelProgress,
} from "./user-identity-marks";

export type UserHoverIdentity = {
  avatarUrl?: string;
  badges?: string[];
  bannerUrl?: string;
  displayName?: string;
  displayTitle?: string | null;
  followerCount?: number;
  followingCount?: number;
  headline?: string;
  level?: UserLevelSummary | null;
  username?: string;
};

type UserHoverPreviewProps = {
  align?: "start" | "end";
  children: ReactNode;
  className?: string;
  panelClassName?: string;
  side?: "bottom" | "top";
  user: UserHoverIdentity;
};

export function UserHoverPreview({
  align,
  children,
  className,
  panelClassName,
  side,
  user,
}: UserHoverPreviewProps) {
  const username = user.username?.trim() || "";
  const [shouldLoadProfile, setShouldLoadProfile] = useState(false);

  return (
    <HoverPreview
      align={align}
      className={className}
      onOpen={() => {
        if (username) {
          setShouldLoadProfile(true);
        }
      }}
      panelClassName={cn("w-72", panelClassName)}
      side={side}
      trigger={children}
    >
      <UserHoverCard
        loadProfile={shouldLoadProfile && Boolean(username)}
        user={user}
      />
    </HoverPreview>
  );
}

function UserHoverCard({
  loadProfile,
  user,
}: {
  loadProfile: boolean;
  user: UserHoverIdentity;
}) {
  const username = user.username?.trim() || "";
  const profileQuery = usePublicUserQuery(username, loadProfile);
  const currentUserQuery = useCurrentUserQuery();
  const profile = profileQuery.data?.user;
  const avatarUrl = profile?.avatar_url?.trim() || user.avatarUrl?.trim() || "";
  const backgroundUrl =
    profile?.banner_url?.trim() || user.bannerUrl?.trim() || "";
  const badges =
    profile?.badges && profile.badges.length > 0
      ? profile.badges
      : (user.badges ?? []);
  const displayTitle = profile
    ? getUserDisplayTitle(profile)
    : (user.displayTitle ?? null);
  const level = profile ? getUserProgression(profile) : (user.level ?? null);
  const headline = profile?.headline?.trim() || user.headline?.trim() || "";
  const name =
    profile?.display_name?.trim() ||
    user.displayName?.trim() ||
    username ||
    "用户";
  const followerCount = profile?.stats.follower_count ?? user.followerCount;
  const followingCount = profile?.stats.following_count ?? user.followingCount;
  const isOwnPreview =
    Boolean(username) &&
    currentUserQuery.data?.username?.toLowerCase() === username.toLowerCase();

  return (
    <span className="relative block overflow-hidden bg-background text-left shadow-[0_18px_48px_rgb(0_0_0/0.32)] ring-1 ring-border/70">
      <UserHoverBackdrop imageUrl={backgroundUrl} />

      <span className="relative z-10 block p-4">
        <span className="flex min-w-0 items-start gap-3">
          <UserHoverAvatar avatarUrl={avatarUrl} name={name} />
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-2">
              <span className="min-w-0 truncate text-sm font-semibold text-foreground">
                {name}
              </span>
            <UserInlineIdentity
              level={level}
              title={displayTitle}
              username={username}
              size="sm"
            />
            </span>
            {username ? (
              <span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">
                @{username}
              </span>
            ) : null}
            {headline ? (
              <span className="mt-1 line-clamp-1 text-xs leading-5 text-muted-foreground">
                {headline}
              </span>
            ) : (
              <span className="mt-1 block truncate text-xs text-muted-foreground">
                这个用户还没有填写公开简介。
              </span>
            )}
          </span>
        </span>

        {isOwnPreview ? <UserLevelProgress className="mt-3" level={level} /> : null}

        <span className="mt-3 flex min-w-0 items-center gap-4 text-xs text-muted-foreground">
          <span>
            关注者{" "}
            <span className="font-mono text-foreground">
              {formatMetricCount(followerCount)}
            </span>
          </span>
          <span>
            正在关注{" "}
            <span className="font-mono text-foreground">
              {formatMetricCount(followingCount)}
            </span>
          </span>
        </span>

        {badges.length > 0 ? (
          <UserIdentityMarks
            badges={badges}
            className="mt-2"
            displayTitle={null}
            level={null}
            maxItems={3}
            size="sm"
          />
        ) : null}

        {!isOwnPreview && username ? (
          <span className="mt-3 flex border-t border-border pt-3">
            <HoverCardMessageAction
              capability={profile?.dm_capability}
              username={username}
            />
          </span>
        ) : null}
      </span>
    </span>
  );
}

function HoverCardMessageAction({
  capability,
  username,
}: {
  capability?: DmCapability | null;
  username: string;
}) {
  const href = getDmActionHref(username, capability);

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <MessageCircle className="size-3.5" aria-hidden="true" />
        私信
      </Link>
    );
  }

  return (
    <span
      aria-disabled="true"
      className="inline-flex cursor-not-allowed items-center gap-1.5 text-xs font-semibold text-muted-foreground/75"
      title={formatDmCapabilityReason(capability?.reason)}
    >
      <MessageCircle className="size-3.5" aria-hidden="true" />
      {formatDmCapabilityReason(capability?.reason)}
    </span>
  );
}

function getDmActionHref(username: string, capability?: DmCapability | null) {
  if (!capability) {
    return `/messages?to=${encodeURIComponent(username)}`;
  }

  if (capability.viewer_relation === "self") {
    return null;
  }

  if (capability.reason === "unauthenticated") {
    return `/login?next=${encodeURIComponent(
      `/messages?to=${encodeURIComponent(username)}`,
    )}`;
  }

  if (!capability.can_start) {
    return null;
  }

  if (capability.direct_conversation_id) {
    return `/messages/${encodeURIComponent(capability.direct_conversation_id)}`;
  }

  return `/messages?to=${encodeURIComponent(username)}`;
}

function formatDmCapabilityReason(reason?: string | null) {
  switch (reason) {
    case "blocked":
      return "已拉黑";
    case "privacy":
      return "对方限制私信";
    case "self":
      return "本人";
    case "unavailable":
      return "账号不可用";
    case "unauthenticated":
      return "登录后私信";
    default:
      return "暂不可私信";
  }
}

function UserHoverAvatar({
  avatarUrl,
  name,
}: {
  avatarUrl: string;
  name: string;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={`${name} 的头像`}
        className="relative z-10 size-10 shrink-0 rounded-full bg-secondary object-cover ring-2 ring-background"
      />
    );
  }

  return (
    <span
      className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary ring-2 ring-background"
      aria-label={`${name} 的头像占位`}
    >
      <User className="size-5" aria-hidden="true" />
    </span>
  );
}

function UserHoverBackdrop({ imageUrl }: { imageUrl: string }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="size-full object-cover opacity-45"
        />
      ) : (
        <span className="block size-full bg-background-soft" />
      )}
      <span className="absolute inset-0 bg-background/78" />
    </span>
  );
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
