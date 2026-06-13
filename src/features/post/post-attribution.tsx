"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { User } from "lucide-react";

import {
  StatusToken,
  type StatusTokenTone,
} from "@/components/ui/data-display";
import {
  CommunityHoverPreview,
  type CommunityHoverIdentity,
} from "@/features/community/community-hover-card";
import {
  UserHoverPreview,
  type UserHoverIdentity,
} from "@/features/profile/user-hover-card";
import { cn } from "@/lib/utils";

import type { Post } from "./types";

export type PostAuthorFallback = {
  avatarUrl?: string;
  displayName?: string;
  username?: string;
};

export type PostCommunityFallback = {
  name?: string;
  slug?: string;
};

export type PostIdentity = {
  avatarUrl: string;
  handle: string;
  href: string | null;
  label: string;
  name: string;
  slug: string;
};

type PostAuthorProfile = PostIdentity & {
  badges: string[];
  bannerUrl: string;
  headline: string;
};

type PostCommunityProfile = PostIdentity &
  CommunityHoverIdentity & {
  bannerUrl: string;
  description: string;
  memberCount?: number;
  postCount?: number;
  viewerIsFollowing?: boolean;
};

type PostAttributionProps = {
  authorFallback?: PostAuthorFallback;
  children?: ReactNode;
  className?: string;
  communityFallback?: PostCommunityFallback;
  post: Post;
  showCommunity?: boolean;
};

type PostAvatarSize = "sm" | "md";

export function PostPreviewAttribution({
  authorFallback,
  children,
  className,
  communityFallback,
  post,
  showCommunity = true,
}: PostAttributionProps) {
  const author = getPostAuthorProfile(post, authorFallback);

  return (
    <PostAuthorIdentity
      author={author}
      className={cn("px-3 py-3 sm:px-4", className)}
      meta={
        <PostSourceLine
          communityFallback={communityFallback}
          dateFormat="short"
          post={post}
          showCommunity={showCommunity}
        />
      }
      size="sm"
    >
      {children}
    </PostAuthorIdentity>
  );
}

export function PostDetailAttribution({
  children,
  className,
  post,
}: {
  children?: ReactNode;
  className?: string;
  post: Post;
}) {
  const author = getPostAuthorProfile(post);
  const community = getPostCommunityProfile(post);

  return (
    <div
      className={cn(
        "min-w-0",
        className,
      )}
    >
      <PostCommunityContext community={community} />

      <PostAuthorIdentity
        author={author}
        className="mt-3"
        meta={<PostSourceLine dateFormat="full" post={post} showCommunity={false} />}
        size="sm"
      />

      {children}
    </div>
  );
}

export function PostAuthorIdentity({
  author,
  children,
  className,
  meta,
  size = "md",
}: {
  author: PostAuthorProfile;
  children?: ReactNode;
  className?: string;
  meta?: ReactNode;
  size?: PostAvatarSize;
}) {
  const gridClass =
    size === "sm"
      ? "grid-cols-[32px_minmax(0,1fr)] gap-x-3"
      : "grid-cols-[40px_minmax(0,1fr)] gap-x-3";
  const hasRowsBelow = Boolean(meta || children);

  return (
    <div className={cn("grid min-w-0 items-start", gridClass, className)}>
      <PostAuthorAvatarPreview
        author={author}
        className={cn("mt-0.5", hasRowsBelow && "row-span-3")}
        size={size}
      />

      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-5">
        <PostAuthorName author={author} />

        {author.badges.length > 0 ? (
          <span className="inline-flex min-w-0 flex-wrap items-center gap-1">
            {author.badges.slice(0, 3).map((badge) => (
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
      </div>

      {meta ? <div className="mt-0.5 min-w-0">{meta}</div> : null}
      {children ? <div className="min-w-0">{children}</div> : null}
    </div>
  );
}

export function PostAuthorAvatar({
  avatarUrl,
  className,
  name,
  size = "md",
}: {
  avatarUrl: string;
  className?: string;
  name: string;
  size?: PostAvatarSize;
}) {
  const sizeClass = size === "sm" ? "size-8" : "size-10";
  const iconClass = size === "sm" ? "size-4" : "size-5";

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={`${name} 的头像`}
        className={cn(
          sizeClass,
          "shrink-0 rounded-full bg-secondary object-cover ring-1 ring-border/70",
          className,
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        sizeClass,
        "flex shrink-0 items-center justify-center rounded-full bg-secondary text-primary ring-1 ring-border/70",
        className,
      )}
      aria-label={`${name} 的头像占位`}
    >
      <User className={iconClass} aria-hidden="true" />
    </span>
  );
}

function PostAuthorName({ author }: { author: PostAuthorProfile }) {
  const nameClassName =
    "min-w-0 truncate font-semibold text-foreground transition-colors hover:text-primary";
  const hoverUser = getPostAuthorHoverIdentity(author);

  if (author.href) {
    return (
      <UserHoverPreview
        className="min-w-0"
        user={hoverUser}
        panelClassName="w-72"
      >
        <Link href={author.href} className={nameClassName}>
          {author.name}
        </Link>
      </UserHoverPreview>
    );
  }

  return (
    <UserHoverPreview
      className="min-w-0"
      user={hoverUser}
      panelClassName="w-72"
    >
      <span className={nameClassName}>{author.name}</span>
    </UserHoverPreview>
  );
}

function PostAuthorAvatarPreview({
  author,
  className,
  size,
}: {
  author: PostAuthorProfile;
  className?: string;
  size: PostAvatarSize;
}) {
  const avatar = (
    <PostAuthorAvatar
      avatarUrl={author.avatarUrl}
      name={author.name}
      size={size}
    />
  );

  if (author.href) {
    return (
      <Link
        href={author.href}
        aria-label={`进入${author.name}的主页`}
        className={cn(
          "block shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          className,
        )}
      >
        {avatar}
      </Link>
    );
  }

  return <span className={cn("shrink-0", className)}>{avatar}</span>;
}

function getPostAuthorHoverIdentity(
  author: PostAuthorProfile,
): UserHoverIdentity {
  return {
    avatarUrl: author.avatarUrl,
    badges: author.badges,
    bannerUrl: author.bannerUrl,
    displayName: author.name,
    headline: author.headline,
    username: author.slug,
  };
}

function PostCommunityContext({ community }: { community: PostCommunityProfile }) {
  return (
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
      <PostCommunityLink community={community} emphasis />
    </div>
  );
}

function PostSourceLine({
  className,
  communityFallback,
  dateFormat,
  post,
  showCommunity,
}: {
  className?: string;
  communityFallback?: PostCommunityFallback;
  dateFormat: "short" | "full";
  post: Post;
  showCommunity: boolean;
}) {
  const community = getPostCommunityProfile(post, communityFallback);

  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5 text-muted-foreground",
        className,
      )}
    >
      {showCommunity ? <PostCommunityLink community={community} /> : null}
      {showCommunity ? <Dot /> : null}
      <time dateTime={post.created_at}>{formatPostDate(post.created_at, dateFormat)}</time>
      {post.status !== "visible" ? (
        <StatusToken
          className="px-1.5 py-0 text-[11px]"
          tone={getPostStatusTone(post.status)}
        >
          {formatPostStatus(post.status)}
        </StatusToken>
      ) : null}
    </div>
  );
}

function PostCommunityLink({
  community,
  emphasis = false,
}: {
  community: PostCommunityProfile;
  emphasis?: boolean;
}) {
  const className = cn(
    "group inline-flex max-w-full items-baseline gap-2 text-left transition-colors",
    community.href && "hover:text-primary",
  );
  const content = (
    <>
      <span
        className={cn(
          "min-w-0 truncate font-semibold text-foreground transition-colors",
          emphasis ? "text-sm" : "text-xs",
          community.href && "group-hover:text-primary",
        )}
      >
        {community.name}
      </span>
      {community.slug ? (
        <span
          className={cn(
            "shrink-0 font-mono text-muted-foreground",
            emphasis ? "text-xs" : "text-[11px]",
          )}
        >
          /{community.slug}
        </span>
      ) : null}
    </>
  );

  if (community.href) {
    return (
      <CommunityHoverPreview
        community={community}
        panelClassName="w-80"
      >
        <Link href={community.href} className={className}>
          {content}
        </Link>
      </CommunityHoverPreview>
    );
  }

  return (
    <CommunityHoverPreview
      community={community}
      panelClassName="w-80"
    >
      <span className={className}>{content}</span>
    </CommunityHoverPreview>
  );
}

function Dot() {
  return (
    <span
      className="size-1 rounded-full bg-muted-foreground/45"
      aria-hidden="true"
    />
  );
}

export function getPostAuthorIdentity(
  post: Post,
  fallback?: PostAuthorFallback,
): PostIdentity {
  const username = post.author?.username?.trim() || fallback?.username?.trim() || "";
  const name =
    post.author?.display_name?.trim() ||
    username ||
    fallback?.displayName?.trim() ||
    "用户";

  return {
    avatarUrl: post.author?.avatar_url?.trim() || fallback?.avatarUrl?.trim() || "",
    handle: username ? `@${username}` : "",
    href: username ? `/users/${encodeURIComponent(username)}` : null,
    label: name,
    name,
    slug: username,
  };
}

function getPostAuthorProfile(
  post: Post,
  fallback?: PostAuthorFallback,
): PostAuthorProfile {
  const identity = getPostAuthorIdentity(post, fallback);

  return {
    ...identity,
    badges: post.author?.badges?.filter(Boolean) ?? [],
    bannerUrl: post.author?.banner_url?.trim() || "",
    headline: post.author?.headline?.trim() || "",
  };
}

export function getPostCommunityIdentity(
  post: Post,
  fallback?: PostCommunityFallback,
): PostIdentity {
  const slug =
    post.community?.slug?.trim() ||
    post.community_slug?.trim() ||
    fallback?.slug?.trim() ||
    "";
  const name =
    post.community?.name?.trim() ||
    post.community_name?.trim() ||
    fallback?.name?.trim() ||
    (slug ? `/${slug}` : "社区");

  return {
    avatarUrl: post.community?.avatar_url?.trim() || "",
    handle: slug ? `/${slug}` : "",
    href: slug ? `/communities/${encodeURIComponent(slug)}` : null,
    label: slug ? `/${slug}` : name,
    name,
    slug,
  };
}

function getPostCommunityProfile(
  post: Post,
  fallback?: PostCommunityFallback,
): PostCommunityProfile {
  const identity = getPostCommunityIdentity(post, fallback);

  return {
    ...identity,
    bannerUrl: post.community?.banner_url?.trim() || "",
    description: post.community?.description?.trim() || "",
    memberCount: post.community?.member_count,
    postCount: post.community?.post_count,
    viewerIsFollowing: post.community?.viewer_is_following,
  };
}

export function getPostCommunityDisplay(post: Post) {
  const community = getPostCommunityIdentity(post);

  if (community.slug && community.name && community.name !== `/${community.slug}`) {
    return `${community.name} /${community.slug}`;
  }

  return community.slug ? `/${community.slug}` : community.name;
}

export function formatPostStatus(status: string) {
  switch (status) {
    case "visible":
      return "可见";
    case "archived":
      return "已归档";
    case "hidden":
      return "已隐藏";
    case "deleted":
      return "已删除";
    case "removed":
      return "已移除";
    default:
      return status;
  }
}

function getPostStatusTone(status: string): StatusTokenTone {
  switch (status) {
    case "archived":
      return "warning";
    case "hidden":
    case "deleted":
    case "removed":
      return "danger";
    default:
      return "default";
  }
}

function formatPostDate(value: string, format: "short" | "full") {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    year: format === "full" ? "numeric" : undefined,
  }).format(new Date(value));
}
