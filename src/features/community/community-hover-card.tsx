"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Hash } from "lucide-react";

import { HoverPreview } from "@/components/ui/hover-preview";
import { StatusToken } from "@/components/ui/data-display";
import { resolvePlatformRole } from "@/features/auth/platform-role";
import { useCurrentUserQuery } from "@/features/auth/queries";
import { cn } from "@/lib/utils";

import { canAccessCommunityManagement } from "./permissions";
import { useCommunityQuery } from "./queries";

export type CommunityHoverIdentity = {
  avatarUrl?: string;
  bannerUrl?: string;
  description?: string;
  href?: string | null;
  label?: string;
  memberCount?: number;
  name?: string;
  postCount?: number;
  slug?: string;
  viewerIsFollowing?: boolean;
};

type CommunityHoverPreviewProps = {
  align?: "start" | "end";
  children: ReactNode;
  className?: string;
  community: CommunityHoverIdentity;
  panelClassName?: string;
  side?: "bottom" | "top";
};

export function CommunityHoverPreview({
  align,
  children,
  className,
  community,
  panelClassName,
  side,
}: CommunityHoverPreviewProps) {
  const slug = community.slug?.trim() || "";
  const [shouldLoadCommunity, setShouldLoadCommunity] = useState(false);

  return (
    <HoverPreview
      align={align}
      className={className}
      onOpen={() => {
        if (slug) {
          setShouldLoadCommunity(true);
        }
      }}
      panelClassName={cn("w-80", panelClassName)}
      side={side}
      trigger={children}
    >
      <CommunityHoverCard
        community={community}
        loadCommunity={shouldLoadCommunity && Boolean(slug)}
      />
    </HoverPreview>
  );
}

function CommunityHoverCard({
  community,
  loadCommunity,
}: {
  community: CommunityHoverIdentity;
  loadCommunity: boolean;
}) {
  const slug = community.slug?.trim() || "";
  const currentUserQuery = useCurrentUserQuery();
  const platformRole = resolvePlatformRole(currentUserQuery.data);
  const communityQuery = useCommunityQuery(slug, loadCommunity);
  const profile = communityQuery.data?.community;
  const liveSlug = profile?.slug?.trim() || slug;
  const name =
    profile?.name?.trim() ||
    community.name?.trim() ||
    (liveSlug ? `/${liveSlug}` : "社区");
  const label =
    liveSlug ? `/${liveSlug}` : community.label?.trim() || community.name || "社区";
  const avatarUrl =
    profile?.avatar_url?.trim() || community.avatarUrl?.trim() || "";
  const bannerUrl =
    profile?.banner_url?.trim() || community.bannerUrl?.trim() || "";
  const description =
    profile?.description?.trim() || community.description?.trim() || "";
  const memberCount = profile?.member_count ?? community.memberCount;
  const postCount = profile?.post_count ?? community.postCount;
  const viewerIsFollowing =
    profile?.viewer_is_following ?? community.viewerIsFollowing;
  const canManage =
    canAccessCommunityManagement(profile, platformRole) ||
    (platformRole === "owner" && Boolean(liveSlug));

  return (
    <span className="relative block min-h-44 overflow-hidden bg-background text-left shadow-[0_18px_48px_rgb(0_0_0/0.36)] ring-1 ring-border/70">
      <CommunityPreviewBackdrop imageUrl={bannerUrl} />

      <span className="relative z-10 flex min-h-44 flex-col justify-end p-4">
        <span className="flex min-w-0 items-start gap-3">
          <CommunityHoverAvatar
            avatarUrl={avatarUrl}
            className="relative z-10 ring-2 ring-background"
            label={name}
          />
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-2">
              <span className="min-w-0 truncate text-sm font-semibold text-foreground">
                {name}
              </span>
              {viewerIsFollowing ? (
                <StatusToken className="shrink-0 px-1.5 py-0 text-[11px]">
                  已关注
                </StatusToken>
              ) : null}
            </span>
            <span className="mt-1 block truncate font-mono text-xs text-primary">
              {label}
            </span>
          </span>
        </span>

        {description ? (
          <span className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
            {description}
          </span>
        ) : (
          <span className="mt-2 block text-xs text-muted-foreground">
            这个社区还没有填写简介。
          </span>
        )}

        <span className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-border/70 pt-3">
          <CommunityPreviewMetric
            label="帖子"
            value={formatCompactNumber(postCount)}
          />
          <CommunityPreviewMetric
            label="成员"
            value={formatCompactNumber(memberCount)}
          />
          {liveSlug && canManage ? (
            <Link
              href={`/communities/${encodeURIComponent(liveSlug)}/manage`}
              className="ml-auto text-xs font-semibold text-primary transition-colors hover:text-foreground"
            >
              管理
            </Link>
          ) : null}
        </span>
      </span>
    </span>
  );
}

export type CommunityHoverAvatarSize = "md" | "lg";

export function CommunityHoverAvatar({
  avatarUrl,
  className,
  label,
  size = "md",
}: {
  avatarUrl?: string;
  className?: string;
  label: string;
  size?: CommunityHoverAvatarSize;
}) {
  const sizeClass = size === "lg" ? "size-11 sm:size-12" : "size-10";
  const iconClass = size === "lg" ? "size-5 sm:size-6" : "size-5";

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={`${label} 的社区头像`}
        className={cn(
          sizeClass,
          "shrink-0 rounded-lg bg-background-soft object-cover ring-1 ring-border/70",
          className,
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        sizeClass,
        "inline-flex shrink-0 items-center justify-center rounded-lg bg-background-soft text-primary ring-1 ring-border/70",
        className,
      )}
      aria-label={`${label} 的社区头像占位`}
    >
      <Hash className={iconClass} aria-hidden="true" />
    </span>
  );
}

function CommunityPreviewBackdrop({ imageUrl }: { imageUrl: string }) {
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

function CommunityPreviewMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <span className="inline-flex min-w-0 items-baseline gap-1.5">
      <span className="text-[11px] text-muted-foreground">
        {label}
      </span>
      <span className="max-w-full truncate font-mono text-xs font-semibold text-foreground">
        {value}
      </span>
    </span>
  );
}

function formatCompactNumber(value: number | undefined) {
  if (typeof value !== "number") {
    return "--";
  }

  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 1,
    notation: "compact",
  }).format(value);
}
