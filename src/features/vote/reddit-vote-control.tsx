"use client";

import type { ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowBigDown, ArrowBigUp } from "lucide-react";

import { useAuthSession } from "@/features/auth/auth-session";
import { commentQueryKeys } from "@/features/comment/queries";
import { postQueryKeys } from "@/features/post/queries";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

import {
  deleteCommentVote,
  deletePostVote,
  setCommentVote,
  setPostVote,
} from "./api";
import type { VoteValue } from "./types";

type RedditVoteControlProps = {
  className?: string;
  downvoteCount?: number;
  mode?: "column" | "inline";
  myVote?: number;
  postId?: string;
  score: number;
  targetId: string;
  targetType: "comment" | "post";
  upvoteCount?: number;
};

export function RedditVoteControl({
  className,
  downvoteCount = 0,
  mode = "column",
  myVote = 0,
  postId,
  score,
  targetId,
  targetType,
  upvoteCount = 0,
}: RedditVoteControlProps) {
  const { isReady, token } = useAuthSession();
  const queryClient = useQueryClient();
  const voteMutation = useMutation({
    mutationFn: async (nextVote: VoteValue) => {
      if (targetType === "post") {
        if (myVote === nextVote) {
          await deletePostVote(targetId);
          return;
        }

        await setPostVote(targetId, nextVote);
        return;
      }

      if (myVote === nextVote) {
        await deleteCommentVote(targetId);
        return;
      }

      await setCommentVote(targetId, nextVote);
    },
    onSuccess: async () => {
      if (targetType === "post") {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: postQueryKeys.detail(targetId),
          }),
          queryClient.invalidateQueries({
            queryKey: postQueryKeys.latestPrefix(),
          }),
          queryClient.invalidateQueries({
            queryKey: postQueryKeys.communityPostsAll(),
          }),
          queryClient.invalidateQueries({
            queryKey: postQueryKeys.userPostsAll(),
          }),
        ]);
        return;
      }

      await Promise.all([
        postId
          ? queryClient.invalidateQueries({
              queryKey: commentQueryKeys.postCommentsPrefix(postId),
            })
          : Promise.resolve(),
        queryClient.invalidateQueries({
          queryKey: commentQueryKeys.userCommentsAll(),
        }),
      ]);
    },
  });

  const canVote = isReady && Boolean(token);
  const isPending = voteMutation.isPending;
  const error = getVoteError(voteMutation.error);
  const layoutClass =
    mode === "inline"
      ? "inline-flex items-center gap-1"
      : "flex flex-col items-center";

  return (
    <div
      className={cn(layoutClass, "text-muted-foreground", className)}
      aria-label={targetType === "post" ? "帖子投票" : "评论投票"}
    >
      <VoteButton
        active={myVote === 1}
        count={upvoteCount}
        disabled={!canVote || isPending}
        label={canVote ? "赞同" : "登录后投票"}
        onClick={() => voteMutation.mutate(1)}
      >
        <ArrowBigUp className="size-5" aria-hidden="true" />
      </VoteButton>
      <span
        className={cn(
          "min-w-8 text-center font-mono text-xs font-semibold text-foreground",
          mode === "column" ? "my-0.5" : "px-1",
        )}
        title={`赞同 ${upvoteCount} / 反对 ${downvoteCount}`}
      >
        {formatCompactNumber(score)}
      </span>
      <VoteButton
        active={myVote === -1}
        count={downvoteCount}
        disabled={!canVote || isPending}
        label={canVote ? "反对" : "登录后投票"}
        onClick={() => voteMutation.mutate(-1)}
      >
        <ArrowBigDown className="size-5" aria-hidden="true" />
      </VoteButton>
      {error ? <span className="sr-only">{error}</span> : null}
    </div>
  );
}

function VoteButton({
  active,
  children,
  count,
  disabled,
  label,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  count: number;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`${label}，当前 ${count}`}
      aria-pressed={active}
      disabled={disabled}
      title={label}
      className={cn(
        "inline-flex size-8 items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        active
          ? "text-primary [&_svg]:fill-primary"
          : "hover:bg-surface-hover hover:text-foreground",
        disabled && "cursor-not-allowed opacity-60 hover:bg-transparent",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function formatCompactNumber(value: number) {
  if (Math.abs(value) >= 1000) {
    return `${Math.round(value / 100) / 10}k`;
  }

  return String(value);
}

function getVoteError(error: Error | null) {
  if (!error) {
    return null;
  }

  if (error instanceof ApiError) {
    return error.message;
  }

  return "投票失败，请稍后重试。";
}
