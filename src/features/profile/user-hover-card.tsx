"use client";

import { useState, type ReactNode } from "react";
import { MessageCircle, User } from "lucide-react";

import { HoverPreview } from "@/components/ui/hover-preview";
import { useCurrentUserQuery } from "@/features/auth/queries";
import {
  getDirectMessageDrawerTarget,
  MessageDrawerAction,
} from "@/features/message/message-drawer-action";
import type { DmCapability } from "@/features/message/types";
import { cn } from "@/lib/utils";

import {
  getUserDisplayTitle,
  getUserIdentityRoles,
  getUserProgression,
} from "./identity";
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
  roles?: string[];
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
      panelClassName={cn("w-[17.5rem]", panelClassName)}
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
  const roles = profile ? getUserIdentityRoles(profile) : (user.roles ?? []);
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
    <span className="nexus-soft-transition relative block overflow-hidden rounded-md bg-surface text-left shadow-[0_18px_44px_rgb(0_0_0/0.34)] ring-1 ring-border/80">
      <UserHoverCover imageUrl={backgroundUrl} />

      <span className="relative block px-3 pb-3">
        <span className="-mt-5 flex min-w-0 items-end justify-between gap-3">
          <UserHoverAvatar avatarUrl={avatarUrl} name={name} />
          <span className="mb-1 shrink-0 font-mono text-[10px] text-muted-foreground/70">
            {isOwnPreview ? "我的主页" : "公开资料"}
          </span>
        </span>

        <span className="mt-2.5 flex min-w-0 items-start gap-3">
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-baseline gap-2">
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

        {isOwnPreview ? (
          <UserLevelProgress className="mt-2.5" level={level} />
        ) : null}

        <UserHoverStats
          followerCount={followerCount}
          followingCount={followingCount}
        />

        {badges.length > 0 || roles.length > 0 ? (
          <UserIdentityMarks
            badges={badges}
            className="mt-2"
            displayTitle={null}
            level={null}
            maxItems={3}
            roles={roles}
            size="sm"
          />
        ) : null}

        {!isOwnPreview && username ? (
          <span className="mt-2.5 flex items-center justify-between gap-3 border-t border-border/60 pt-2.5">
            <span className="font-mono text-[10px] text-muted-foreground/70">
              私信
            </span>
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
  const target = getDirectMessageDrawerTarget(username, capability);

  if (!target.disabledReason) {
    return (
      <MessageDrawerAction
        activeConversationId={target.activeConversationId}
        className="inline-flex items-center gap-1.5 border-b border-transparent pb-0.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
      className="inline-flex cursor-not-allowed items-center gap-1.5 text-xs font-semibold text-muted-foreground/65"
      title={target.disabledReason}
    >
      <MessageCircle className="size-3.5" aria-hidden="true" />
      {target.disabledReason}
    </span>
  );
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
        className="relative z-10 size-10 shrink-0 rounded-full bg-secondary object-cover ring-2 ring-surface"
      />
    );
  }

  return (
    <span
      className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full bg-background-soft text-primary ring-2 ring-surface"
      aria-label={`${name} 的头像占位`}
    >
      <User className="size-4" aria-hidden="true" />
    </span>
  );
}

function UserHoverCover({ imageUrl }: { imageUrl: string }) {
  return (
    <span
      className="pointer-events-none relative block h-12 overflow-hidden bg-background-soft"
      aria-hidden="true"
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="size-full object-cover opacity-80"
        />
      ) : (
        <span className="block size-full bg-background-soft" />
      )}
      <span className="absolute inset-0 bg-background/20" />
      <span className="absolute inset-x-0 bottom-0 h-px bg-border/70" />
      <span className="absolute left-3 top-3 h-4 w-px bg-primary/80" />
      <span className="absolute left-5 top-3 h-px w-10 bg-border-strong/70" />
    </span>
  );
}

function UserHoverStats({
  followerCount,
  followingCount,
}: {
  followerCount?: number;
  followingCount?: number;
}) {
  return (
    <span className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
      <span>
        关注者{" "}
        <span className="font-mono text-foreground">
          {formatMetricCount(followerCount)}
        </span>
      </span>
      <span className="text-muted-foreground/45" aria-hidden="true">
        ·
      </span>
      <span>
        关注{" "}
        <span className="font-mono text-foreground">
          {formatMetricCount(followingCount)}
        </span>
      </span>
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
