"use client";

import { Check, Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { TextAction } from "@/components/ui/text-action";
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
  const currentUsername = currentUserQuery.data?.username ?? "";
  const isOwnProfile =
    currentUsername.trim().toLowerCase() === username.trim().toLowerCase();
  const isPending = mutation.isPending;

  if (!isReady || isOwnProfile) {
    return null;
  }

  if (!token) {
    return (
      <TextAction
        className={className}
        href={`/login?next=${encodeURIComponent(pathname || "/")}`}
        tone="primary"
      >
        关注
      </TextAction>
    );
  }

  return (
    <div className={cn("flex flex-col items-end gap-1", className)}>
      <Button
        type="button"
        size="sm"
        variant={viewerIsFollowing ? "outline" : "default"}
        disabled={isPending}
        onClick={async () => {
          setError(null);
          try {
            await mutation.mutateAsync({
              isFollowing: viewerIsFollowing,
              username,
            });
          } catch (caught) {
            setError(caught instanceof Error ? caught.message : "关注操作失败。");
          }
        }}
      >
        {viewerIsFollowing ? (
          <Check className="size-4" aria-hidden="true" />
        ) : (
          <Plus className="size-4" aria-hidden="true" />
        )}
        {isPending ? "处理中" : viewerIsFollowing ? "已关注" : "关注"}
      </Button>
      {error ? (
        <p className="max-w-44 text-right text-xs leading-5 text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
