"use client";

import { useState, type ReactNode } from "react";
import { User } from "lucide-react";

import { HoverPreview } from "@/components/ui/hover-preview";
import { StatusToken } from "@/components/ui/data-display";
import { cn } from "@/lib/utils";

import { usePublicUserQuery } from "./queries";

export type UserHoverIdentity = {
  avatarUrl?: string;
  badges?: string[];
  bannerUrl?: string;
  displayName?: string;
  headline?: string;
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
  const profile = profileQuery.data?.user;
  const avatarUrl = profile?.avatar_url?.trim() || user.avatarUrl?.trim() || "";
  const backgroundUrl =
    profile?.banner_url?.trim() || user.bannerUrl?.trim() || "";
  const badges =
    profile?.badges && profile.badges.length > 0
      ? profile.badges
      : (user.badges ?? []);
  const headline = profile?.headline?.trim() || user.headline?.trim() || "";
  const name =
    profile?.display_name?.trim() ||
    user.displayName?.trim() ||
    username ||
    "用户";

  return (
    <span className="relative block h-32 overflow-hidden bg-background text-left shadow-[0_18px_48px_rgb(0_0_0/0.36)] ring-1 ring-border/70">
      <UserHoverBackdrop imageUrl={backgroundUrl} />

      <span className="absolute inset-x-0 bottom-0 z-10 flex min-w-0 items-end gap-3 p-4">
        <UserHoverAvatar avatarUrl={avatarUrl} name={name} />
        <span className="min-w-0 flex-1 pb-0.5">
          <span className="block truncate text-sm font-semibold text-foreground">
            {name}
          </span>
          {headline ? (
            <span className="mt-1 line-clamp-1 text-xs leading-5 text-muted-foreground">
              {headline}
            </span>
          ) : (
            <span className="mt-1 block truncate text-xs text-muted-foreground">
              这个用户还没有填写公开简介。
            </span>
          )}
          {badges.length > 0 ? (
            <span className="mt-1.5 flex flex-wrap gap-1.5">
              {badges.slice(0, 3).map((badge) => (
                <StatusToken
                  key={badge}
                  className="px-1.5 py-0 text-[11px]"
                  tone="primary"
                >
                  {badge}
                </StatusToken>
              ))}
            </span>
          ) : null}
        </span>
      </span>
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
    <span className="absolute inset-0 overflow-hidden">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="size-full object-cover"
          aria-hidden="true"
        />
      ) : (
        <span className="block size-full bg-background-soft" />
      )}
      <span className="absolute inset-0 bg-background/82" />
    </span>
  );
}
