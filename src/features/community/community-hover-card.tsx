"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Hash, Settings2 } from "lucide-react";

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
      panelClassName={cn("w-[18rem]", panelClassName)}
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
    <span className="nexus-soft-transition relative block overflow-hidden rounded-md bg-surface text-left shadow-[0_18px_44px_rgb(0_0_0/0.34)] ring-1 ring-border/80">
      <CommunityPreviewCover imageUrl={bannerUrl} slug={liveSlug} />

      <span className="relative block px-3 pb-3">
        <span className="-mt-5 flex min-w-0 items-end justify-between gap-3">
          <CommunityHoverAvatar
            avatarUrl={avatarUrl}
            className="relative z-10 size-10 ring-2 ring-surface"
            label={name}
          />
          {viewerIsFollowing ? (
            <StatusToken className="mb-1 shrink-0 rounded-sm px-1.5 py-0 text-[11px]">
              已关注
            </StatusToken>
          ) : null}
        </span>

        <span className="mt-2.5 flex min-w-0 items-start gap-3">
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="min-w-0 truncate text-sm font-semibold text-foreground">
                {name}
              </span>
            </span>
            <span className="mt-1 block truncate font-mono text-xs text-primary">
              {label}
            </span>
          </span>
        </span>

        {description ? (
          <span className="mt-1.5 line-clamp-1 text-xs leading-5 text-muted-foreground">
            {description}
          </span>
        ) : (
          <span className="mt-1.5 block truncate text-xs text-muted-foreground">
            这个社区还没有填写简介。
          </span>
        )}

        <CommunityPreviewStats memberCount={memberCount} postCount={postCount} />

        <span className="mt-2.5 flex items-center justify-between gap-3 border-t border-border/60 pt-2.5">
          <span className="font-mono text-[10px] text-muted-foreground/70">
            社区
          </span>
          {liveSlug && canManage ? (
            <Link
              href={`/communities/${encodeURIComponent(liveSlug)}/manage`}
              className="inline-flex items-center gap-1.5 border-b border-transparent pb-0.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Settings2 className="size-3.5" aria-hidden="true" />
              管理社区
            </Link>
          ) : (
            <span className="font-mono text-[10px] text-muted-foreground/55">
              {liveSlug ? `/${liveSlug}` : "公开信息"}
            </span>
          )}
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
          "shrink-0 rounded-md bg-background-soft object-cover ring-1 ring-border/70",
          className,
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        sizeClass,
        "inline-flex shrink-0 items-center justify-center rounded-md bg-background-soft text-primary ring-1 ring-border/70",
        className,
      )}
      aria-label={`${label} 的社区头像占位`}
    >
      <Hash className={iconClass} aria-hidden="true" />
    </span>
  );
}

function CommunityPreviewCover({
  imageUrl,
  slug,
}: {
  imageUrl: string;
  slug: string;
}) {
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
          className="size-full object-cover opacity-85"
        />
      ) : (
        <span className="block size-full bg-background-soft" />
      )}
      <span className="absolute inset-0 bg-background/18" />
      <span className="absolute inset-x-0 bottom-0 h-px bg-border/70" />
      <span className="absolute left-3 top-3 h-4 w-px bg-primary/80" />
      <span className="absolute left-5 top-3 h-px w-10 bg-border-strong/70" />
      {slug ? (
        <span className="absolute bottom-2 right-3 max-w-[10rem] truncate font-mono text-[10px] text-muted-foreground/75">
          /{slug}
        </span>
      ) : null}
    </span>
  );
}

function CommunityPreviewStats({
  memberCount,
  postCount,
}: {
  memberCount?: number;
  postCount?: number;
}) {
  return (
    <span className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
      <span>
        帖子{" "}
        <span className="font-mono text-foreground">
          {formatCompactNumber(postCount)}
        </span>
      </span>
      <span className="text-muted-foreground/45" aria-hidden="true">
        ·
      </span>
      <span>
        成员{" "}
        <span className="font-mono text-foreground">
          {formatCompactNumber(memberCount)}
        </span>
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
