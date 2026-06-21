"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Check, Plus } from "lucide-react";

import {
  FollowActionButton,
  FollowActionLink,
  getFollowActionErrorMessage,
  getFollowActionLabel,
} from "@/components/social/follow-action";
import { useAuthSession } from "@/features/auth/auth-session";
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

  const label = getFollowActionLabel({
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
                setSubmitError(getFollowActionErrorMessage(error));
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
