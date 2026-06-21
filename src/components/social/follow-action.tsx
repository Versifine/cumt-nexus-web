"use client";

import type { ComponentProps } from "react";
import Link from "next/link";

import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type FollowActionButtonProps = ComponentProps<"button"> & {
  compact?: boolean;
  isFollowing?: boolean;
};

type FollowActionLinkProps = ComponentProps<typeof Link> & {
  compact?: boolean;
  isFollowing?: boolean;
};

export function FollowActionButton({
  children,
  className,
  compact = false,
  isFollowing = false,
  ...props
}: FollowActionButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        getFollowActionClassName({ compact, isFollowing }),
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function FollowActionLink({
  children,
  className,
  compact = false,
  isFollowing = false,
  ...props
}: FollowActionLinkProps) {
  return (
    <Link
      {...props}
      className={cn(
        getFollowActionClassName({ compact, isFollowing }),
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function getFollowActionLabel({
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

export function getFollowActionErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "关注状态更新失败，请稍后重试。";
}

function getFollowActionClassName({
  compact,
  isFollowing,
}: {
  compact: boolean;
  isFollowing: boolean;
}) {
  return cn(
    "inline-flex shrink-0 items-center gap-1.5 border-b border-transparent px-0.5 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    compact ? "h-7 text-xs" : "h-9 text-sm",
    isFollowing
      ? "text-muted-foreground hover:border-border-strong hover:text-foreground"
      : "text-primary hover:border-primary hover:text-foreground",
  );
}
