"use client";

import type { ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowBigDown, ArrowBigUp } from "lucide-react";
import { toast } from "sonner";

import { useAuthSession } from "@/features/auth/auth-session";
import { commentQueryKeys } from "@/features/comment/queries";
import type { Comment, ListCommentsResponse } from "@/features/comment/types";
import { postQueryKeys } from "@/features/post/queries";
import type { GetPostResponse, ListPostsResponse, Post } from "@/features/post/types";
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
      const resolvedVote: -1 | 0 | 1 = myVote === nextVote ? 0 : nextVote;

      if (targetType === "post") {
        if (resolvedVote === 0) {
          await deletePostVote(targetId);
          return resolvedVote;
        }

        await setPostVote(targetId, nextVote);
        return resolvedVote;
      }

      if (resolvedVote === 0) {
        await deleteCommentVote(targetId);
        return resolvedVote;
      }

      await setCommentVote(targetId, nextVote);
      return resolvedVote;
    },
    onError: (error) => {
      toast.error(getVoteError(error));
    },
    onSuccess: async (nextVote) => {
      if (targetType === "post") {
        updateCachedPostVote({
          nextVote,
          postId: targetId,
          queryClient,
        });
        return;
      }

      updateCachedCommentVote({
        commentId: targetId,
        nextVote,
        postId,
        queryClient,
      });
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
        intent="up"
        label={canVote ? (myVote === 1 ? "取消赞同" : "赞同") : "登录后投票"}
        onClick={() => voteMutation.mutate(1)}
      >
        <ArrowBigUp className="size-5" aria-hidden="true" />
      </VoteButton>
      <span
        className={cn(
          "min-w-8 text-center font-mono text-xs font-semibold text-foreground",
          mode === "column" ? "my-0.5" : "px-1",
          myVote === 1 && "text-primary",
          myVote === -1 && "text-destructive",
        )}
        title={`赞同 ${upvoteCount} / 反对 ${downvoteCount}`}
      >
        {formatCompactNumber(score)}
      </span>
      <VoteButton
        active={myVote === -1}
        count={downvoteCount}
        disabled={!canVote || isPending}
        intent="down"
        label={canVote ? (myVote === -1 ? "取消反对" : "反对") : "登录后投票"}
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
  intent,
  label,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  count: number;
  disabled: boolean;
  intent: "down" | "up";
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
        "inline-flex size-8 items-center justify-center rounded-md transition-[background-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        !active && "text-muted-foreground hover:bg-surface-hover hover:text-foreground",
        active &&
          intent === "up" &&
          "bg-primary-muted text-primary ring-1 ring-primary/25 [&_svg]:fill-primary",
        active &&
          intent === "down" &&
          "bg-destructive/10 text-destructive ring-1 ring-destructive/25 [&_svg]:fill-destructive",
        disabled && "cursor-not-allowed opacity-60 hover:bg-transparent",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function updateCachedPostVote({
  nextVote,
  postId,
  queryClient,
}: {
  nextVote: -1 | 0 | 1;
  postId: string;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const patch = getPostVotePatch(nextVote);

  queryClient.setQueryData<GetPostResponse>(
    postQueryKeys.detail(postId),
    (current) =>
      current
        ? {
            ...current,
            post: applyPostVotePatch(current.post, patch),
          }
        : current,
  );

  patchPostListQueries(queryClient, postQueryKeys.latestPrefix(), postId, patch);
  patchPostListQueries(queryClient, postQueryKeys.communityPostsAll(), postId, patch);
  patchPostListQueries(queryClient, postQueryKeys.userPostsAll(), postId, patch);
}

function patchPostListQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  queryKey: readonly unknown[],
  postId: string,
  patch: PostVotePatch,
) {
  for (const [cachedQueryKey] of queryClient.getQueriesData<ListPostsResponse>({
    queryKey,
  })) {
    queryClient.setQueryData<ListPostsResponse>(cachedQueryKey, (current) =>
      patchPostListResponse(current, postId, patch),
    );
  }
}

function patchPostListResponse(
  current: ListPostsResponse | undefined,
  postId: string,
  patch: PostVotePatch,
) {
  if (!current) {
    return current;
  }

  let didPatch = false;
  const posts = current.posts.map((post) => {
    if (post.id !== postId) {
      return post;
    }

    didPatch = true;
    return applyPostVotePatch(post, patch);
  });

  return didPatch ? { ...current, posts } : current;
}

function applyPostVotePatch(post: Post, patch: PostVotePatch): Post {
  const previousVote = normalizeVote(post.my_vote);
  const upvoteDelta = getVoteBucketDelta(previousVote, patch.my_vote, 1);
  const downvoteDelta = getVoteBucketDelta(previousVote, patch.my_vote, -1);
  const scoreDelta = patch.my_vote - previousVote;

  return {
    ...post,
    downvote_count: Math.max(0, post.downvote_count + downvoteDelta),
    my_vote: patch.my_vote,
    score: post.score + scoreDelta,
    upvote_count: Math.max(0, post.upvote_count + upvoteDelta),
  };
}

type PostVotePatch = {
  my_vote: -1 | 0 | 1;
};

function updateCachedCommentVote({
  commentId,
  nextVote,
  postId,
  queryClient,
}: {
  commentId: string;
  nextVote: -1 | 0 | 1;
  postId?: string;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const patch = getCommentVotePatch(nextVote);

  if (postId) {
    patchCommentListQueries(
      queryClient,
      commentQueryKeys.postCommentsPrefix(postId),
      commentId,
      patch,
    );
  }

  patchCommentListQueries(
    queryClient,
    commentQueryKeys.userCommentsAll(),
    commentId,
    patch,
  );
}

function patchCommentListQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  queryKey: readonly unknown[],
  commentId: string,
  patch: CommentVotePatch,
) {
  for (const [cachedQueryKey] of queryClient.getQueriesData<ListCommentsResponse>({
    queryKey,
  })) {
    queryClient.setQueryData<ListCommentsResponse>(cachedQueryKey, (current) =>
      patchCommentListResponse(current, commentId, patch),
    );
  }
}

function patchCommentListResponse(
  current: ListCommentsResponse | undefined,
  commentId: string,
  patch: CommentVotePatch,
) {
  if (!current) {
    return current;
  }

  const result = patchCommentList(current.comments, commentId, patch);

  return result.didPatch
    ? {
        ...current,
        comments: result.comments,
      }
    : current;
}

function patchCommentList(
  comments: Comment[],
  commentId: string,
  patch: CommentVotePatch,
): { comments: Comment[]; didPatch: boolean } {
  let didPatch = false;

  const nextComments = comments.map((comment) => {
    if (comment.id === commentId) {
      didPatch = true;
      return applyCommentVotePatch(comment, patch);
    }

    if (!comment.children?.length) {
      return comment;
    }

    const childResult = patchCommentList(comment.children, commentId, patch);
    if (!childResult.didPatch) {
      return comment;
    }

    didPatch = true;
    return {
      ...comment,
      children: childResult.comments,
    };
  });

  return { comments: nextComments, didPatch };
}

function applyCommentVotePatch(
  comment: Comment,
  patch: CommentVotePatch,
): Comment {
  const previousVote = normalizeVote(comment.my_vote ?? 0);
  const upvoteCount = comment.upvote_count ?? 0;
  const downvoteCount = comment.downvote_count ?? 0;
  const score =
    typeof comment.score === "number" ? comment.score : upvoteCount - downvoteCount;
  const upvoteDelta = getVoteBucketDelta(previousVote, patch.my_vote, 1);
  const downvoteDelta = getVoteBucketDelta(previousVote, patch.my_vote, -1);
  const scoreDelta = patch.my_vote - previousVote;

  return {
    ...comment,
    downvote_count: Math.max(0, downvoteCount + downvoteDelta),
    my_vote: patch.my_vote,
    score: score + scoreDelta,
    upvote_count: Math.max(0, upvoteCount + upvoteDelta),
  };
}

type CommentVotePatch = {
  my_vote: -1 | 0 | 1;
};

function getCommentVotePatch(nextVote: -1 | 0 | 1): CommentVotePatch {
  return {
    my_vote: nextVote,
  };
}

function getPostVotePatch(nextVote: -1 | 0 | 1): PostVotePatch {
  return {
    my_vote: nextVote,
  };
}

function normalizeVote(value: number): -1 | 0 | 1 {
  if (value === 1 || value === -1) {
    return value;
  }

  return 0;
}

function getVoteBucketDelta(
  previousVote: -1 | 0 | 1,
  nextVote: -1 | 0 | 1,
  bucket: -1 | 1,
) {
  const previousCounted = previousVote === bucket ? 1 : 0;
  const nextCounted = nextVote === bucket ? 1 : 0;

  return nextCounted - previousCounted;
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
