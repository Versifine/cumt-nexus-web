"use client";

import { Check, Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import {
  FollowActionButton,
  FollowActionLink,
  getFollowActionErrorMessage,
  getFollowActionLabel,
} from "@/components/social/follow-action";
import { useAuthSession } from "@/features/auth/auth-session";
import { useCurrentUserQuery } from "@/features/auth/queries";
import { cn } from "@/lib/utils";

import { useToggleUserFollowMutation } from "./queries";

type UserFollowButtonProps = {
  className?: string;
  username: string;
  viewerIsFollowing?: boolean;
};

export function UserFollowButton({
  className,
  username,
  viewerIsFollowing = false,
}: UserFollowButtonProps) {
  const pathname = usePathname();
  const { isReady, token } = useAuthSession();
  const currentUserQuery = useCurrentUserQuery();
  const mutation = useToggleUserFollowMutation();
  const [error, setError] = useState<string | null>(null);
  const currentUsername = currentUserQuery.data?.username.trim().toLowerCase() ?? "";
  const targetUsername = username.trim().toLowerCase();
  const isOwnProfile =
    Boolean(currentUsername) && currentUsername === targetUsername;
  const isResolvingCurrentUser =
    Boolean(token) && currentUserQuery.isFetching && !currentUserQuery.data;
  const isPending = mutation.isPending;

  if (!isReady || isResolvingCurrentUser || isOwnProfile) {
    return null;
  }

  if (!token) {
    return (
      <FollowActionLink
        className={className}
        href={`/login?next=${encodeURIComponent(pathname || "/")}`}
        aria-label={`登录后关注 @${username}`}
      >
        <Plus className="size-4" aria-hidden="true" />
        关注
      </FollowActionLink>
    );
  }

  const label = getFollowActionLabel({
    isFollowing: viewerIsFollowing,
    isPending,
  });
  const Icon = viewerIsFollowing ? Check : Plus;

  return (
    <div className={cn("min-w-0", className)}>
      <FollowActionButton
        type="button"
        isFollowing={viewerIsFollowing}
        disabled={isPending}
        onClick={async () => {
          setError(null);
          try {
            await mutation.mutateAsync({
              isFollowing: viewerIsFollowing,
              username,
            });
          } catch (caught) {
            setError(getFollowActionErrorMessage(caught));
          }
        }}
        aria-pressed={viewerIsFollowing}
        aria-label={`${label} @${username}`}
      >
        <Icon className="size-4" aria-hidden="true" />
        {label}
      </FollowActionButton>
      {error ? (
        <p className="mt-2 max-w-44 text-xs leading-5 text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
