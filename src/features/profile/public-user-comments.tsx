"use client";

/* eslint-disable @next/next/no-img-element */

import type { ReactNode } from "react";
import Link from "next/link";
import { CornerDownRight, MessageSquare, User } from "lucide-react";

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

import { usePublicUserQuery } from "./queries";
import type { GetPublicUserResponse, PublicUser } from "./types";

type PublicUserCommentsProps = {
  initialCommentsData?: ListCommentsResponse;
  initialProfileData?: GetPublicUserResponse;
  username: string;
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

  return (
    <div className="grid grid-cols-1 gap-0 py-4 xl:grid-cols-[minmax(0,1fr)_312px]">
      <div className="min-w-0">
        <TextAction href={`/users/${encodeURIComponent(username)}`} variant="bar">
          返回用户主页
        </TextAction>

        <section className="mt-3 border border-border bg-background">
          {!isReady || profileQuery.isPending ? (
            <div className="p-4">
              <LoadingState rows={3} />
            </div>
          ) : profileQuery.isError ? (
            <div className="p-4">
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
            </div>
          ) : user ? (
            <UserCommentsHeader comments={comments} user={user} />
          ) : null}
        </section>

        {user ? (
          <section className="mt-3 border-x border-border bg-background">
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

            {commentsQuery.isSuccess && comments.length > 0 ? (
              comments.map((comment) => (
                <UserCommentRow
                  key={comment.id}
                  comment={comment}
                  sourceUsername={user.username}
                  user={user}
                />
              ))
            ) : null}
          </section>
        ) : null}
      </div>

      {user ? <UserCommentsRail user={user} comments={comments} /> : null}
    </div>
  );
}

function UserCommentsHeader({
  comments,
  user,
}: {
  comments: Comment[];
  user: PublicUser;
}) {
  const displayName = getDisplayName(user);
  const totalScore = comments.reduce(
    (total, comment) => total + getCommentScore(comment),
    0,
  );

  return (
    <div className="grid gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-3">
          <ProfileAvatar user={user} />
          <div className="min-w-0">
            <h1 className="break-words text-xl font-semibold leading-7 tracking-normal text-foreground sm:text-2xl">
              {displayName} 的评论
            </h1>
            <p className="mt-1 truncate font-mono text-xs text-primary">
              @{user.username}
            </p>
          </div>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          {user.headline || "这个用户还没有写个人签名。"}
        </p>
      </div>

      <div className="grid grid-cols-3 border border-border text-center">
        <HeaderMetric label="公开评论" value={String(user.stats.comment_count)} />
        <HeaderMetric label="当前页" value={String(comments.length)} />
        <HeaderMetric label="总分" value={String(totalScore)} />
      </div>
    </div>
  );
}

function HeaderMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-border p-2 last:border-r-0">
      <div className="font-mono text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}

function UserCommentRow({
  comment,
  sourceUsername,
  user,
}: {
  comment: Comment;
  sourceUsername: string;
  user: PublicUser;
}) {
  const replyCount = comment.reply_count ?? 0;
  const postHref = `/posts/${comment.post_id}`;
  const sourceHref = `/users/${encodeURIComponent(sourceUsername)}/comments`;
  const sourceLabel = `返回 @${sourceUsername} 的评论`;

  function rememberSource() {
    rememberPostNavigationSource({
      href: sourceHref,
      label: sourceLabel,
      postId: comment.post_id,
    });
  }

  return (
    <article className="grid grid-cols-[42px_minmax(0,1fr)] border-b border-border bg-background transition-colors hover:bg-background-soft/60 sm:grid-cols-[48px_minmax(0,1fr)]">
      <RedditVoteControl
        className="border-r border-border bg-background-soft/45 py-3"
        downvoteCount={comment.downvote_count ?? 0}
        mode="column"
        myVote={comment.my_vote ?? 0}
        postId={comment.post_id}
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
          <Link href={postHref} onClick={rememberSource} className="hover:text-primary">
            原帖 {comment.post_id.slice(0, 8)}
          </Link>
          <span aria-hidden="true">·</span>
          <span>{formatDate(comment.created_at)}</span>
          {comment.status !== "visible" ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{formatCommentStatus(comment.status)}</span>
            </>
          ) : null}
        </div>

        <div className="mt-2">
          <ContentBody
            attachments={comment.attachments}
            value={comment.body}
            className="text-sm leading-7 text-muted-foreground"
          />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <PostActionLink href={postHref} onClick={rememberSource}>
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
  const topComments = [...comments]
    .sort((left, right) => getCommentScore(right) - getCommentScore(left))
    .slice(0, 3);

  return (
    <aside className="border-t border-border bg-background-soft/45 px-4 py-5 xl:border-l xl:border-t-0">
      <div className="sticky top-20 space-y-5">
        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">用户上下文</h2>
          <div className="mt-3 divide-y divide-border border-y border-border">
            <InfoRow label="昵称" value={getDisplayName(user)} />
            <InfoRow label="用户名" value={`@${user.username}`} />
            <InfoRow label="公开评论" value={String(user.stats.comment_count)} />
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
              {topComments.map((comment) => (
                <Link
                  key={comment.id}
                  href={`/posts/${comment.post_id}`}
                  onClick={() =>
                    rememberPostNavigationSource({
                      href: `/users/${encodeURIComponent(user.username)}/comments`,
                      label: `返回 @${user.username} 的评论`,
                      postId: comment.post_id,
                    })
                  }
                  className="block py-3 transition-colors hover:text-primary"
                >
                  <div className="font-mono text-xs text-muted-foreground">
                    {getCommentScore(comment)} 分 / 原帖 {comment.post_id.slice(0, 8)}
                  </div>
                  <div className="mt-1 line-clamp-2 text-sm font-medium">
                    {getMarkdownPlainTextSummary(comment.body, "暂无内容。")}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              暂无可展示的公开评论。
            </p>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold">继续浏览</h2>
          <div className="mt-3 flex flex-col border-y border-border">
            <TextAction
              href={`/users/${encodeURIComponent(user.username)}`}
              variant="bar"
            >
              返回用户主页
            </TextAction>
            <TextAction
              href={`/users/${encodeURIComponent(user.username)}/posts`}
              variant="bar"
            >
              查看公开帖子
            </TextAction>
            <TextAction href="/communities" variant="bar">
              浏览社区
            </TextAction>
          </div>
        </section>
      </div>
    </aside>
  );
}

function ProfileAvatar({ user }: { user: PublicUser }) {
  if (user.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={`${getDisplayName(user)} 的头像`}
        className="size-12 shrink-0 rounded-full border border-border object-cover"
      />
    );
  }

  return (
    <div
      className="flex size-12 shrink-0 items-center justify-center rounded-full border border-border bg-secondary font-black text-primary"
      aria-label={`${getDisplayName(user)} 的头像占位`}
    >
      <User className="size-5" aria-hidden="true" />
    </div>
  );
}

function getDisplayName(user: PublicUser) {
  return user.display_name || user.username;
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
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
