"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { CornerDownRight, MessageSquare } from "lucide-react";

import { rememberPostNavigationSource } from "@/components/app-shell/post-navigation-source";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { InfoRow } from "@/components/ui/data-display";
import { TextAction } from "@/components/ui/text-action";
import { useAuthSession } from "@/features/auth/auth-session";
import { useUserCommentsQuery } from "@/features/comment/queries";
import type { Comment, ListCommentsResponse } from "@/features/comment/types";
import { ContentBody } from "@/features/content/content-body";
import { getMarkdownPlainTextSummary } from "@/features/content/markdown-summary";
import { RedditVoteControl } from "@/features/vote/reddit-vote-control";
import { ApiError } from "@/lib/api/client";

import {
  PublicUserLayout,
  formatDate,
} from "./public-user-layout";
import { usePublicUserQuery } from "./queries";
import type { GetPublicUserResponse, PublicUser } from "./types";

type PublicUserCommentsProps = {
  initialCommentsData?: ListCommentsResponse;
  initialProfileData?: GetPublicUserResponse;
  username: string;
};

type CommentContext = {
  communityHref: string | null;
  communityLabel: string | null;
  postHref: string;
  postId: string;
  postMeta: string;
  postTitle: string | null;
};

export function PublicUserComments({
  initialCommentsData,
  initialProfileData,
  username,
}: PublicUserCommentsProps) {
  const { isReady } = useAuthSession();
  const profileQuery = usePublicUserQuery(username, isReady, initialProfileData);
  const user = profileQuery.data?.user;
  const canRequestComments = isReady && profileQuery.isSuccess && Boolean(user);
  const commentsQuery = useUserCommentsQuery(
    username,
    20,
    0,
    canRequestComments,
    initialCommentsData,
  );
  const comments = canRequestComments ? (commentsQuery.data?.comments ?? []) : [];

  if (!isReady || profileQuery.isPending) {
    return (
      <div className="py-4">
        <section className="border border-border bg-background p-4">
          <LoadingState rows={4} />
        </section>
      </div>
    );
  }

  if (profileQuery.isError) {
    return (
      <div className="py-4">
        <section className="border border-border bg-background p-4">
          {isNotFound(profileQuery.error) ? (
            <EmptyState
              title="没有找到这个用户"
              description="这个用户名不存在，或该账号当前不可公开访问。"
              action={
                <TextAction href="/communities" tone="primary">
                  浏览社区
                </TextAction>
              }
            />
          ) : (
            <ErrorState
              title={getErrorTitle(profileQuery.error, "无法加载用户主页")}
              description={getErrorDescription(profileQuery.error)}
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => profileQuery.refetch()}
                >
                  重试
                </Button>
              }
            />
          )}
        </section>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <PublicUserLayout
      activeTab="comments"
      railContent={<UserCommentsRail comments={comments} user={user} />}
      user={user}
    >
      <section className="mt-3 border-x border-border bg-background">
        <div className="border-b border-border px-3 py-3 sm:px-4">
          <h2 className="text-sm font-semibold">公开评论</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            这个用户留下的公开讨论记录。
          </p>
        </div>

        {commentsQuery.isPending ? (
          <div className="border-b border-border p-4">
            <LoadingState rows={5} />
          </div>
        ) : null}

        {commentsQuery.isError ? (
          <div className="border-b border-border p-4">
            <ErrorState
              title={getErrorTitle(commentsQuery.error, "无法加载公开评论")}
              description={getErrorDescription(commentsQuery.error)}
              action={
                isUnauthenticated(commentsQuery.error) ? (
                  <TextAction href="/communities" tone="primary">
                    浏览社区
                  </TextAction>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => commentsQuery.refetch()}
                  >
                    重试
                  </Button>
                )
              }
            />
          </div>
        ) : null}

        {commentsQuery.isSuccess && comments.length === 0 ? (
          <div className="border-b border-border p-4">
            <EmptyState
              title="还没有公开评论"
              description="这个用户还没有留下可公开浏览的评论。"
              action={
                <TextAction href="/communities" tone="primary">
                  浏览社区
                </TextAction>
              }
            />
          </div>
        ) : null}

        {commentsQuery.isSuccess && comments.length > 0
          ? comments.map((comment) => (
              <UserCommentRow key={comment.id} comment={comment} user={user} />
            ))
          : null}
      </section>
    </PublicUserLayout>
  );
}

function UserCommentRow({
  comment,
  user,
}: {
  comment: Comment;
  user: PublicUser;
}) {
  const context = getCommentContext(comment);
  const replyCount = comment.reply_count ?? 0;
  const sourceHref = `/users/${encodeURIComponent(user.username)}/comments`;
  const sourceLabel = `返回 @${user.username} 的评论`;

  function rememberSource() {
    rememberPostNavigationSource({
      href: sourceHref,
      label: sourceLabel,
      postId: context.postId,
    });
  }

  return (
    <article className="grid grid-cols-[42px_minmax(0,1fr)] border-b border-border bg-background transition-colors hover:bg-background-soft/60 sm:grid-cols-[48px_minmax(0,1fr)]">
      <RedditVoteControl
        className="border-r border-border bg-background-soft/45 py-3"
        downvoteCount={comment.downvote_count ?? 0}
        mode="column"
        myVote={comment.my_vote ?? 0}
        postId={context.postId}
        score={getCommentScore(comment)}
        targetId={comment.id}
        targetType="comment"
        upvoteCount={comment.upvote_count ?? 0}
      />

      <div className="min-w-0 px-3 py-3 sm:px-4">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5 text-muted-foreground">
          <span className="font-semibold text-foreground">
            {getAuthorLabel(comment, user)}
          </span>
          <span aria-hidden="true">·</span>
          <span>{formatDate(comment.created_at)}</span>
          {comment.status !== "visible" ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{formatCommentStatus(comment.status)}</span>
            </>
          ) : null}
        </div>

        <div className="mt-2 border border-border bg-background-soft/45 px-3 py-2">
          <Link
            href={context.postHref}
            onClick={rememberSource}
            className="line-clamp-2 text-sm font-semibold leading-6 text-foreground transition-colors hover:text-primary"
          >
            {context.postTitle || "查看原帖"}
          </Link>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5 text-muted-foreground">
            <span>{context.postMeta}</span>
            {context.communityHref && context.communityLabel ? (
              <>
                <span aria-hidden="true">·</span>
                <Link
                  href={context.communityHref}
                  className="font-semibold text-muted-foreground transition-colors hover:text-primary"
                >
                  {context.communityLabel}
                </Link>
              </>
            ) : context.communityLabel ? (
              <>
                <span aria-hidden="true">·</span>
                <span>{context.communityLabel}</span>
              </>
            ) : null}
          </div>
        </div>

        <div className="mt-3">
          <ContentBody
            attachments={comment.attachments}
            value={comment.body}
            className="text-sm leading-7 text-muted-foreground"
          />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <PostActionLink href={context.postHref} onClick={rememberSource}>
            <CornerDownRight className="size-4" aria-hidden="true" />
            查看原帖
          </PostActionLink>
          {replyCount > 0 ? (
            <span className="inline-flex h-8 items-center gap-1.5 px-2 font-semibold">
              <MessageSquare className="size-4" aria-hidden="true" />
              {replyCount} 条回复
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function PostActionLink({
  children,
  href,
  onClick,
}: {
  children: ReactNode;
  href: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="inline-flex h-8 items-center gap-1.5 px-2 font-semibold transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {children}
    </Link>
  );
}

function UserCommentsRail({
  comments,
  user,
}: {
  comments: Comment[];
  user: PublicUser;
}) {
  const totalScore = comments.reduce(
    (total, comment) => total + getCommentScore(comment),
    0,
  );
  const topComments = [...comments]
    .sort((left, right) => getCommentScore(right) - getCommentScore(left))
    .slice(0, 3);

  return (
    <>
      <section className="border-b border-border pb-5">
        <h2 className="text-sm font-semibold">评论上下文</h2>
        <div className="mt-3 divide-y divide-border border-y border-border">
          <InfoRow label="当前页" value={String(comments.length)} />
          <InfoRow label="公开评论" value={String(user.stats.comment_count)} />
          <InfoRow label="当前页总分" value={String(totalScore)} />
          <InfoRow label="加入" value={formatDate(user.created_at)} />
        </div>
      </section>

      <section className="border-b border-border pb-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">高分评论</h2>
          <span className="font-mono text-xs text-muted-foreground">
            {topComments.length}
          </span>
        </div>
        {topComments.length > 0 ? (
          <div className="divide-y divide-border">
            {topComments.map((comment) => {
              const context = getCommentContext(comment);

              return (
                <Link
                  key={comment.id}
                  href={context.postHref}
                  onClick={() =>
                    rememberPostNavigationSource({
                      href: `/users/${encodeURIComponent(user.username)}/comments`,
                      label: `返回 @${user.username} 的评论`,
                      postId: context.postId,
                    })
                  }
                  className="block py-3 transition-colors hover:text-primary"
                >
                  <div className="font-mono text-xs text-muted-foreground">
                    {getCommentScore(comment)} 分 / {context.postMeta}
                  </div>
                  <div className="mt-1 line-clamp-2 text-sm font-medium">
                    {context.postTitle ||
                      getMarkdownPlainTextSummary(comment.body, "查看原帖")}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            暂无可展示的公开评论。
          </p>
        )}
      </section>
    </>
  );
}

function getCommentContext(comment: Comment): CommentContext {
  const postId = getPostId(comment);
  const postTitle =
    comment.post?.title?.trim() || comment.post_title?.trim() || null;
  const postHref =
    normalizeInternalHref(comment.permalink) ||
    normalizeInternalHref(comment.post?.url) ||
    `/posts/${encodeURIComponent(postId)}`;
  const communitySlug =
    comment.community?.slug?.trim() || comment.post?.community_slug?.trim() || "";
  const communityName =
    comment.community?.name?.trim() || comment.post?.community_name?.trim() || "";
  const communityLabel = communitySlug
    ? `/${communitySlug}`
    : communityName || null;
  const communityHref = communitySlug
    ? `/communities/${encodeURIComponent(communitySlug)}`
    : null;

  return {
    communityHref,
    communityLabel,
    postHref,
    postId,
    postMeta: `帖子 ${formatShortId(postId)}`,
    postTitle,
  };
}

function getPostId(comment: Comment) {
  return comment.post?.id?.trim() || comment.post_id;
}

function normalizeInternalHref(value?: string | null) {
  const href = value?.trim();

  if (!href || !href.startsWith("/") || href.startsWith("//")) {
    return null;
  }

  return href;
}

function formatShortId(value: string) {
  return value.length > 8 ? value.slice(0, 8) : value;
}

function getAuthorLabel(comment: Comment, user: PublicUser) {
  const author = comment.author;

  if (author?.display_name) {
    return author.display_name;
  }

  if (author?.username) {
    return `@${author.username}`;
  }

  return `@${user.username}`;
}

function getCommentScore(comment: Comment) {
  if (typeof comment.score === "number") {
    return comment.score;
  }

  return (comment.upvote_count ?? 0) - (comment.downvote_count ?? 0);
}

function formatCommentStatus(status: string) {
  switch (status) {
    case "visible":
      return "可见";
    case "deleted":
      return "已删除";
    case "removed":
      return "已移除";
    default:
      return status;
  }
}

function isNotFound(error: Error | null) {
  return error instanceof ApiError && error.code === "not_found";
}

function isUnauthenticated(error: Error | null) {
  return error instanceof ApiError && error.code === "unauthenticated";
}

function getErrorTitle(error: Error | null, fallback: string) {
  if (isUnauthenticated(error)) {
    return "公开用户评论暂不可读";
  }

  return fallback;
}

function getErrorDescription(error: Error | null) {
  if (isUnauthenticated(error)) {
    return "这个用户的公开评论暂时无法读取。可以先登录，或稍后再试。";
  }

  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}
