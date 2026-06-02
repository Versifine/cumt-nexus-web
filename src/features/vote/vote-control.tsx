"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { usePathname } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextAction } from "@/components/ui/text-action";
import { useAuthSession } from "@/features/auth/auth-session";
import { ApiError } from "@/lib/api/client";
import { postQueryKeys } from "@/features/post/queries";

import { deletePostVote, setPostVote } from "./api";
import type { VoteValue } from "./types";

type VoteControlProps = {
  postId: string;
  upvoteCount: number;
  downvoteCount: number;
  score: number;
  myVote: number;
};

export function VoteControl({
  postId,
  upvoteCount,
  downvoteCount,
  score,
  myVote,
}: VoteControlProps) {
  const pathname = usePathname();
  const { isReady, token } = useAuthSession();
  const queryClient = useQueryClient();
  const voteMutation = useMutation({
    mutationFn: async (nextVote: VoteValue) => {
      if (myVote === nextVote) {
        await deletePostVote(postId);
        return;
      }

      await setPostVote(postId, nextVote);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: postQueryKeys.detail(postId),
      });
    },
  });

  const error = getVoteError(voteMutation.error);
  const isPending = voteMutation.isPending;
  const next = pathname || `/posts/${postId}`;
  const loginHref = `/login?next=${encodeURIComponent(next)}`;
  const registerHref = `/register?next=${encodeURIComponent(next)}`;

  if (!isReady) {
    return (
      <div
        className="text-sm text-muted-foreground"
        aria-label="正在读取登录状态"
      >
        正在确认投票状态...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={myVote === 1 ? "default" : "outline"}
          size="sm"
          disabled={isPending || !token}
          onClick={() => voteMutation.mutate(1)}
          aria-pressed={myVote === 1}
        >
          <ThumbsUp className="size-4" aria-hidden="true" />
          {upvoteCount}
        </Button>
        <Button
          type="button"
          variant={myVote === -1 ? "default" : "outline"}
          size="sm"
          disabled={isPending || !token}
          onClick={() => voteMutation.mutate(-1)}
          aria-pressed={myVote === -1}
        >
          <ThumbsDown className="size-4" aria-hidden="true" />
          {downvoteCount}
        </Button>
        <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
          分数 {score}
        </span>
      </div>
      {!token ? (
        <div className="border-y border-border">
          <TextAction href={loginHref} tone="primary" variant="bar">
            登录后投票
          </TextAction>
          <TextAction href={registerHref} variant="bar">
            创建账号
          </TextAction>
        </div>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
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
