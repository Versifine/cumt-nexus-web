"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import {
  type InfiniteData,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { ArrowBigDown, ArrowBigUp } from "lucide-react";
import { toast } from "sonner";

import { useAuthSession } from "@/features/auth/auth-session";
import { commentQueryKeys } from "@/features/comment/queries";
import type { Comment, ListCommentsResponse } from "@/features/comment/types";
import { getPost } from "@/features/post/api";
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

type VoteMutationContext = {
  nextVote: -1 | 0 | 1;
  previousVote: -1 | 0 | 1;
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
  const hasHydrated = useHasHydrated();
  const queryClient = useQueryClient();
  const applyOptimisticVote = (nextVote: -1 | 0 | 1) => {
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
  };
  const voteMutation = useMutation<void, Error, VoteValue, VoteMutationContext>({
    mutationFn: async (nextVote: VoteValue) => {
      const resolvedVote = resolveNextVote(myVote, nextVote);

      if (targetType === "post") {
        if (resolvedVote === 0) {
          await deletePostVote(targetId);
          return;
        }

        await setPostVote(targetId, nextVote);
        return;
      }

      if (resolvedVote === 0) {
        await deleteCommentVote(targetId);
        return;
      }

      await setCommentVote(targetId, nextVote);
    },
    onMutate: (nextVote) => {
      const previousVote = normalizeVote(myVote);
      const resolvedVote = resolveNextVote(previousVote, nextVote);

      applyOptimisticVote(resolvedVote);

      return {
        nextVote: resolvedVote,
        previousVote,
      };
    },
    onError: async (error, _nextVote, context) => {
      if (context) {
        applyOptimisticVote(context.previousVote);
      }

      const intendedVote = context?.nextVote ?? normalizeVote(myVote);

      const reconciledVote = await reconcileVoteAfterError({
        postId,
        queryClient,
        targetId,
        targetType,
      });

      if (reconciledVote === intendedVote) {
        applyOptimisticVote(intendedVote);
        return;
      }

      toast.error(getVoteError(error));
    },
  });

  const canVote = hasHydrated && isReady && Boolean(token);
  const isPending = voteMutation.isPending;
  const error = getVoteError(voteMutation.error);
  const isCommentVote = targetType === "comment";
  const iconClassName = isCommentVote ? "size-[18px]" : "size-5";
  const layoutClass =
    mode === "inline"
      ? "inline-flex items-center gap-1"
      : isCommentVote
        ? "flex flex-col items-center gap-0.5"
        : "flex flex-col items-center";

  return (
    <div
      className={cn(
        layoutClass,
        isCommentVote ? "text-subtle-foreground" : "text-muted-foreground",
        className,
      )}
      aria-label={targetType === "post" ? "帖子投票" : "评论投票"}
    >
      <VoteButton
        active={myVote === 1}
        compact={isCommentVote}
        count={upvoteCount}
        disabled={!canVote || isPending}
        dimDisabled={!canVote}
        intent="up"
        label={canVote ? (myVote === 1 ? "取消赞同" : "赞同") : "登录后投票"}
        onClick={() => voteMutation.mutate(1)}
      >
        <ArrowBigUp className={iconClassName} aria-hidden="true" />
      </VoteButton>
      <span
        className={cn(
          "text-center font-mono font-semibold text-foreground",
          isCommentVote ? "min-w-7 text-[11px] leading-4" : "min-w-8 text-xs",
          mode === "column" && !isCommentVote ? "my-0.5" : "px-1",
          myVote === 1 && "text-primary",
          myVote === -1 && "text-destructive",
        )}
        title={`赞同 ${upvoteCount} / 反对 ${downvoteCount}`}
      >
        {formatCompactNumber(score)}
      </span>
      <VoteButton
        active={myVote === -1}
        compact={isCommentVote}
        count={downvoteCount}
        disabled={!canVote || isPending}
        dimDisabled={!canVote}
        intent="down"
        label={canVote ? (myVote === -1 ? "取消反对" : "反对") : "登录后投票"}
        onClick={() => voteMutation.mutate(-1)}
      >
        <ArrowBigDown className={iconClassName} aria-hidden="true" />
      </VoteButton>
      {error ? <span className="sr-only">{error}</span> : null}
    </div>
  );
}

const subscribeHydrationStore = () => () => {};
const getHydratedSnapshot = () => true;
const getServerHydratedSnapshot = () => false;

function useHasHydrated() {
  return useSyncExternalStore(
    subscribeHydrationStore,
    getHydratedSnapshot,
    getServerHydratedSnapshot,
  );
}

function VoteButton({
  active,
  children,
  compact,
  count,
  disabled,
  dimDisabled,
  intent,
  label,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  compact: boolean;
  count: number;
  disabled: boolean;
  dimDisabled: boolean;
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
        "nexus-micro-lift inline-flex items-center justify-center transition-[background-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        compact ? "size-7 rounded-sm" : "size-8 rounded-md",
        !active &&
          intent === "up" &&
          (compact
            ? "text-subtle-foreground hover:bg-primary/10 hover:text-primary"
            : "text-muted-foreground hover:bg-primary/10 hover:text-primary"),
        !active &&
          intent === "down" &&
          (compact
            ? "text-subtle-foreground hover:bg-destructive/10 hover:text-destructive"
            : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"),
        active &&
          intent === "up" &&
          (compact
            ? "bg-primary/10 text-primary ring-1 ring-primary/20 hover:bg-primary/15 hover:ring-primary/30 [&_svg]:fill-primary"
            : "bg-primary-muted text-primary ring-1 ring-primary/30 hover:bg-primary/15 hover:ring-primary/40 [&_svg]:fill-primary"),
        active &&
          intent === "down" &&
          (compact
            ? "bg-destructive/10 text-destructive ring-1 ring-destructive/20 hover:bg-destructive/15 hover:ring-destructive/30 [&_svg]:fill-destructive"
            : "bg-destructive/10 text-destructive ring-1 ring-destructive/30 hover:bg-destructive/15 hover:ring-destructive/40 [&_svg]:fill-destructive"),
        disabled && "cursor-not-allowed translate-y-0 hover:bg-transparent",
        disabled && dimDisabled && "opacity-60",
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
  patchPostListQueries(queryClient, postQueryKeys.savedPostsAll(), postId, patch);
}

type PostListCacheData =
  | InfiniteData<ListPostsResponse, unknown>
  | ListPostsResponse;

function patchPostListQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  queryKey: readonly unknown[],
  postId: string,
  patch: PostVotePatch,
) {
  for (const [cachedQueryKey] of queryClient.getQueriesData<PostListCacheData>({
    queryKey,
  })) {
    queryClient.setQueryData<PostListCacheData>(cachedQueryKey, (current) =>
      patchPostListCacheData(current, postId, patch),
    );
  }
}

function patchPostListCacheData(
  current: PostListCacheData | undefined,
  postId: string,
  patch: PostVotePatch,
): PostListCacheData | undefined {
  if (!current) {
    return current;
  }

  if (isInfinitePostListData(current)) {
    let didPatch = false;
    const pages: ListPostsResponse[] = current.pages.map((page) => {
      const nextPage = patchPostListResponse(page, postId, patch) ?? page;

      if (nextPage !== page) {
        didPatch = true;
      }

      return nextPage;
    });

    return didPatch ? { ...current, pages } : current;
  }

  return patchPostListResponse(current, postId, patch);
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

function applyPostVoteSnapshot(post: Post, snapshot: Post): Post {
  return {
    ...post,
    downvote_count: snapshot.downvote_count,
    my_vote: normalizeVote(snapshot.my_vote),
    score: snapshot.score,
    upvote_count: snapshot.upvote_count,
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

type CommentListCacheData =
  | InfiniteData<ListCommentsResponse, unknown>
  | ListCommentsResponse;

function patchCommentListQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  queryKey: readonly unknown[],
  commentId: string,
  patch: CommentVotePatch,
) {
  for (const [cachedQueryKey] of queryClient.getQueriesData<CommentListCacheData>({
    queryKey,
  })) {
    queryClient.setQueryData<CommentListCacheData>(cachedQueryKey, (current) =>
      patchCommentListCacheData(current, commentId, patch),
    );
  }
}

function patchCommentListCacheData(
  current: CommentListCacheData | undefined,
  commentId: string,
  patch: CommentVotePatch,
): CommentListCacheData | undefined {
  if (!current) {
    return current;
  }

  if (isInfiniteCommentListData(current)) {
    let didPatch = false;
    const pages: ListCommentsResponse[] = current.pages.map((page) => {
      const nextPage = patchCommentListResponse(page, commentId, patch) ?? page;

      if (nextPage !== page) {
        didPatch = true;
      }

      return nextPage;
    });

    return didPatch ? { ...current, pages } : current;
  }

  return patchCommentListResponse(current, commentId, patch);
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

function resolveNextVote(currentVote: number, nextVote: VoteValue): -1 | 0 | 1 {
  return normalizeVote(currentVote) === nextVote ? 0 : nextVote;
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

async function reconcileVoteAfterError({
  postId,
  queryClient,
  targetId,
  targetType,
}: {
  postId?: string;
  queryClient: ReturnType<typeof useQueryClient>;
  targetId: string;
  targetType: "comment" | "post";
}): Promise<-1 | 0 | 1 | null> {
  if (targetType === "post") {
    return reconcilePostVoteAfterError(queryClient, targetId);
  }

  return reconcileCommentVoteAfterError(queryClient, targetId, postId);
}

async function reconcilePostVoteAfterError(
  queryClient: ReturnType<typeof useQueryClient>,
  postId: string,
) {
  try {
    const result = await queryClient.fetchQuery({
      queryKey: postQueryKeys.detail(postId),
      queryFn: () => getPost(postId),
    });

    patchPostSnapshotQueries(queryClient, result.post);

    return normalizeVote(result.post.my_vote);
  } catch {
    return readCachedPostVoteState(queryClient, postId);
  }
}

function patchPostSnapshotQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  snapshot: Post,
) {
  for (const queryKey of [
    postQueryKeys.latestPrefix(),
    postQueryKeys.communityPostsAll(),
    postQueryKeys.userPostsAll(),
    postQueryKeys.savedPostsAll(),
  ]) {
    patchPostSnapshotListQueries(queryClient, queryKey, snapshot);
  }
}

function patchPostSnapshotListQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  queryKey: readonly unknown[],
  snapshot: Post,
) {
  for (const [cachedQueryKey] of queryClient.getQueriesData<PostListCacheData>({
    queryKey,
  })) {
    queryClient.setQueryData<PostListCacheData>(cachedQueryKey, (current) =>
      patchPostSnapshotCacheData(current, snapshot),
    );
  }
}

function patchPostSnapshotCacheData(
  current: PostListCacheData | undefined,
  snapshot: Post,
): PostListCacheData | undefined {
  if (!current) {
    return current;
  }

  if (isInfinitePostListData(current)) {
    let didPatch = false;
    const pages: ListPostsResponse[] = current.pages.map((page) => {
      const nextPage = patchPostSnapshotListResponse(page, snapshot);

      if (nextPage !== page) {
        didPatch = true;
      }

      return nextPage;
    });

    return didPatch ? { ...current, pages } : current;
  }

  return patchPostSnapshotListResponse(current, snapshot);
}

function patchPostSnapshotListResponse(
  current: ListPostsResponse,
  snapshot: Post,
) {
  let didPatch = false;
  const posts = current.posts.map((post) => {
    if (post.id !== snapshot.id) {
      return post;
    }

    didPatch = true;
    return applyPostVoteSnapshot(post, snapshot);
  });

  return didPatch ? { ...current, posts } : current;
}

async function reconcileCommentVoteAfterError(
  queryClient: ReturnType<typeof useQueryClient>,
  commentId: string,
  postId?: string,
) {
  await Promise.all([
    postId
      ? queryClient.refetchQueries({
          queryKey: commentQueryKeys.postCommentsPrefix(postId),
          type: "active",
        })
      : Promise.resolve(),
    queryClient.refetchQueries({
      queryKey: commentQueryKeys.userCommentsAll(),
      type: "active",
    }),
  ]);

  return readCachedCommentVoteState(queryClient, commentId, postId);
}

function readCachedPostVoteState(
  queryClient: ReturnType<typeof useQueryClient>,
  postId: string,
): -1 | 0 | 1 | null {
  const detail = queryClient.getQueryData<GetPostResponse>(
    postQueryKeys.detail(postId),
  );

  if (detail?.post.id === postId) {
    return normalizeVote(detail.post.my_vote);
  }

  for (const queryKey of [
    postQueryKeys.latestPrefix(),
    postQueryKeys.communityPostsAll(),
    postQueryKeys.userPostsAll(),
    postQueryKeys.savedPostsAll(),
  ]) {
    for (const [, data] of queryClient.getQueriesData<PostListCacheData>({
      queryKey,
    })) {
      const vote = findPostVoteState(data, postId);

      if (vote !== null) {
        return vote;
      }
    }
  }

  return null;
}

function findPostVoteState(
  data: PostListCacheData | undefined,
  postId: string,
): -1 | 0 | 1 | null {
  if (!data) {
    return null;
  }

  if (isInfinitePostListData(data)) {
    for (const page of data.pages) {
      const vote = findPostVoteState(page, postId);

      if (vote !== null) {
        return vote;
      }
    }

    return null;
  }

  const post = data.posts.find((item) => item.id === postId);

  return post ? normalizeVote(post.my_vote) : null;
}

function readCachedCommentVoteState(
  queryClient: ReturnType<typeof useQueryClient>,
  commentId: string,
  postId?: string,
): -1 | 0 | 1 | null {
  const queryKeys = postId
    ? [commentQueryKeys.postCommentsPrefix(postId), commentQueryKeys.userCommentsAll()]
    : [commentQueryKeys.userCommentsAll()];

  for (const queryKey of queryKeys) {
    for (const [, data] of queryClient.getQueriesData<CommentListCacheData>({
      queryKey,
    })) {
      const vote = findCommentVoteState(data, commentId);

      if (vote !== null) {
        return vote;
      }
    }
  }

  return null;
}

function findCommentVoteState(
  data: CommentListCacheData | undefined,
  commentId: string,
): -1 | 0 | 1 | null {
  if (!data) {
    return null;
  }

  if (isInfiniteCommentListData(data)) {
    for (const page of data.pages) {
      const vote = findCommentVoteState(page, commentId);

      if (vote !== null) {
        return vote;
      }
    }

    return null;
  }

  return findCommentVoteStateInTree(data.comments, commentId);
}

function findCommentVoteStateInTree(
  comments: Comment[],
  commentId: string,
): -1 | 0 | 1 | null {
  for (const comment of comments) {
    if (comment.id === commentId) {
      return normalizeVote(comment.my_vote ?? 0);
    }

    if (comment.children?.length) {
      const vote = findCommentVoteStateInTree(comment.children, commentId);

      if (vote !== null) {
        return vote;
      }
    }
  }

  return null;
}

function isInfinitePostListData(
  data: PostListCacheData,
): data is InfiniteData<ListPostsResponse, unknown> {
  return Array.isArray((data as { pages?: unknown }).pages);
}

function isInfiniteCommentListData(
  data: CommentListCacheData,
): data is InfiniteData<ListCommentsResponse, unknown> {
  return Array.isArray((data as { pages?: unknown }).pages);
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
