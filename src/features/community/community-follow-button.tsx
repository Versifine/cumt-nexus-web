"use client";

import { useState, type ComponentProps } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, Plus } from "lucide-react";

import { useAuthSession } from "@/features/auth/auth-session";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

import { useToggleCommunityFollowMutation } from "./queries";
import type { Community } from "./types";

type CommunityFollowButtonProps = {
  className?: string;
  community: Community;
  compact?: boolean;
};

export function CommunityFollowButton({
  className,
  community,
  compact = false,
}: CommunityFollowButtonProps) {
  const { isReady, token } = useAuthSession();
  const pathname = usePathname();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const mutation = useToggleCommunityFollowMutation();
  const isFollowing = community.viewer_is_following === true;
  const currentPath = pathname || "/";

  if (!isReady) {
    return (
      <FollowActionButton
        className={className}
        type="button"
        compact={compact}
        disabled
      >
        <Plus className="size-4" aria-hidden="true" />
        同步中
      </FollowActionButton>
    );
  }

  if (!token) {
    return (
      <FollowActionLink
        className={className}
        href={`/login?next=${encodeURIComponent(currentPath)}`}
        compact={compact}
        aria-label={`登录后关注 /${community.slug}`}
      >
        <Plus className="size-4" aria-hidden="true" />
        {compact ? "关注" : "登录后关注"}
      </FollowActionLink>
    );
  }

  const label = getFollowLabel({
    isFollowing,
    isPending: mutation.isPending,
  });
  const Icon = isFollowing ? Check : Plus;

  return (
    <div className={cn("min-w-0", className)}>
      <FollowActionButton
        type="button"
        compact={compact}
        isFollowing={isFollowing}
        disabled={!isReady || mutation.isPending}
        onClick={() => {
          setSubmitError(null);
          mutation.mutate(
            {
              community,
              isFollowing,
              slug: community.slug,
            },
            {
              onError: (error) => {
                setSubmitError(getFollowErrorMessage(error));
              },
            },
          );
        }}
        aria-pressed={isFollowing}
        aria-label={`${label} /${community.slug}`}
      >
        <Icon className="size-4" aria-hidden="true" />
        {label}
      </FollowActionButton>
      {submitError ? (
        <p className="mt-2 max-w-44 text-xs leading-5 text-destructive">
          {submitError}
        </p>
      ) : null}
    </div>
  );
}

function FollowActionLink({
  children,
  className,
  compact = false,
  ...props
}: ComponentProps<typeof Link> & {
  compact?: boolean;
}) {
  return (
    <Link
      {...props}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 border-b border-transparent px-0.5 font-semibold text-primary transition-colors hover:border-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        compact ? "h-7 text-xs" : "h-9 text-sm",
        className,
      )}
    >
      {children}
    </Link>
  );
}

function FollowActionButton({
  children,
  className,
  compact = false,
  isFollowing = false,
  ...props
}: ComponentProps<"button"> & {
  compact?: boolean;
  isFollowing?: boolean;
}) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 border-b border-transparent px-0.5 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60",
        compact ? "h-7 text-xs" : "h-9 text-sm",
        isFollowing
          ? "text-muted-foreground hover:border-border-strong hover:text-foreground"
          : "text-primary hover:border-primary hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

function getFollowLabel({
  isFollowing,
  isPending,
}: {
  isFollowing: boolean;
  isPending: boolean;
}) {
  if (isPending) {
    return isFollowing ? "取消中" : "关注中";
  }

  return isFollowing ? "已关注" : "关注";
}

function getFollowErrorMessage(error: Error) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "关注状态更新失败，请稍后重试。";
}
