"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CornerDownRight,
  MessageSquare,
  User,
} from "lucide-react";

import { rememberPostNavigationSource } from "@/components/app-shell/post-navigation-source";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { InfoRow, MetricBlock, StatusToken } from "@/components/ui/data-display";
import { TextAction } from "@/components/ui/text-action";
import { useAuthSession } from "@/features/auth/auth-session";
import { useUserCommentsQuery } from "@/features/comment/queries";
import type { Comment, ListCommentsResponse } from "@/features/comment/types";
import { ContentBody } from "@/features/content/content-body";
import { getMarkdownPlainTextSummary } from "@/features/content/markdown-summary";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

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
    <div className="grid gap-8 py-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <TextAction href={`/users/${encodeURIComponent(username)}`} variant="bar">
          返回用户主页
        </TextAction>

        <section className="mt-5 border-b border-border pb-6">
          {!isReady || profileQuery.isPending ? (
            <LoadingState rows={3} />
          ) : profileQuery.isError ? (
            isNotFound(profileQuery.error) ? (
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
            )
          ) : user ? (
            <UserCommentsHero user={user} comments={comments} />
          ) : null}
        </section>

        {user ? (
          <section className="pt-6">
            <div className="border-b border-border pb-4">
              <div className="font-mono text-xs uppercase text-primary">
                COMMENTS / 公开评论
              </div>
              <h2 className="mt-2 text-2xl font-black tracking-normal">
                评论记录
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                这里展示该用户在公开帖子下留下的可见评论。进入原帖后可以查看完整上下文和树状讨论。
              </p>
            </div>

            <div className="py-5">
              {commentsQuery.isPending ? (
                <div className="border-b border-border pb-5">
                  <LoadingState rows={5} />
                </div>
              ) : null}

              {commentsQuery.isError ? (
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
              ) : null}

              {commentsQuery.isSuccess && comments.length === 0 ? (
                <EmptyState
                  title="还没有公开评论"
                  description="这个用户还没有留下可公开浏览的评论。"
                  action={
                    <TextAction href="/communities" tone="primary">
                      浏览社区
                    </TextAction>
                  }
                />
              ) : null}

              {commentsQuery.isSuccess && comments.length > 0 ? (
                <div className="divide-y divide-border border-b border-border">
                  {comments.map((comment, index) => (
                    <UserCommentRow
                      key={comment.id}
                      comment={comment}
                      index={index}
                      sourceUsername={user.username}
                      user={user}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>

      {user ? (
        <UserCommentsRail user={user} comments={comments} />
      ) : null}
    </div>
  );
}

function UserCommentsHero({
  comments,
  user,
}: {
  comments: Comment[];
  user: PublicUser;
}) {
  const displayName = getDisplayName(user);
  const totalScore = comments.reduce(
    (total, comment) => total + (comment.score ?? 0),
    0,
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
      <div className="min-w-0">
        <div className="font-mono text-xs uppercase text-primary">
          CUMT NEXUS / 用户评论
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <StatusToken tone="primary">@{user.username}</StatusToken>
          <StatusToken>{formatUserStatus(user.status)}</StatusToken>
          <StatusToken>公开评论</StatusToken>
        </div>
        <div className="mt-5 flex items-end gap-4">
          <ProfileAvatar user={user} />
          <div className="min-w-0">
            <h1 className="break-words text-5xl font-black leading-[0.95] tracking-normal text-foreground md:text-6xl">
              {displayName} 的评论
            </h1>
            <p className="mt-3 break-words font-mono text-sm text-primary">
              @{user.username}
            </p>
          </div>
        </div>
        <p className="mt-5 max-w-3xl text-sm leading-6 text-muted-foreground">
          {user.headline || "这个用户还没有写个人签名。"}
        </p>
      </div>

      <div className="grid grid-cols-3 border border-border text-center">
        <MetricBlock label="公开评论" value={String(user.stats.comment_count)} />
        <MetricBlock label="当前页" value={String(comments.length)} />
        <MetricBlock label="总分" value={String(totalScore)} />
      </div>
    </div>
  );
}

function UserCommentRow({
  comment,
  index,
  sourceUsername,
  user,
}: {
  comment: Comment;
  index: number;
  sourceUsername: string;
  user: PublicUser;
}) {
  const replyCount = comment.reply_count ?? 0;
  const score = comment.score ?? 0;

  return (
    <article className="grid gap-4 py-5 md:grid-cols-[64px_minmax(0,1fr)_128px]">
      <div className="flex items-center gap-3 md:block">
        <div className="font-mono text-xs text-muted-foreground">
          {String(index + 1).padStart(2, "0")}
        </div>
        <div className="mt-0 flex items-center gap-1 text-xs text-muted-foreground md:mt-4">
          <ArrowUp
            className={cn("size-3", comment.my_vote === 1 ? "text-primary" : null)}
            aria-hidden="true"
          />
          <span className="font-mono">{comment.upvote_count ?? 0}</span>
          <ArrowDown
            className={cn("size-3", comment.my_vote === -1 ? "text-primary" : null)}
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="border border-border px-2 py-0.5 text-foreground">
            关联原帖
          </span>
          <span>{getAuthorLabel(comment, user)}</span>
          <span>发布于 {formatDate(comment.created_at)}</span>
        </div>
        <ContentBody
          attachments={comment.attachments}
          value={comment.body}
          className="mt-3 text-sm leading-7"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <StatusToken>{formatCommentStatus(comment.status)}</StatusToken>
          <span className="inline-flex items-center gap-1">
            <CornerDownRight className="size-3" aria-hidden="true" />
            深度 {comment.depth ?? 0}
          </span>
          {replyCount > 0 ? (
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="size-3" aria-hidden="true" />
              {replyCount} 条回复
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-3 text-sm text-muted-foreground md:flex-col md:items-end md:justify-center">
        <span className="border border-border bg-background px-2.5 py-1 font-mono text-foreground">
          {score}
        </span>
        <Link
          href={`/posts/${comment.post_id}`}
          onClick={() =>
            rememberPostNavigationSource({
              href: `/users/${encodeURIComponent(sourceUsername)}/comments`,
              label: `返回 @${sourceUsername} 的评论`,
              postId: comment.post_id,
            })
          }
          className="inline-flex items-center gap-1 text-xs font-semibold transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          查看原帖
          <ArrowRight
            className="size-4 transition-transform"
            aria-hidden="true"
          />
        </Link>
      </div>
    </article>
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
    .sort((left, right) => (right.score ?? 0) - (left.score ?? 0))
    .slice(0, 3);

  return (
    <aside className="border-t border-border pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
      <div className="sticky top-6 space-y-8">
        <section className="border-b border-border pb-6">
          <div className="font-mono text-xs uppercase text-muted-foreground">
            用户上下文
          </div>
          <div className="mt-3 divide-y divide-border border-y border-border">
            <InfoRow label="昵称" value={getDisplayName(user)} />
            <InfoRow label="用户名" value={`@${user.username}`} />
            <InfoRow label="公开评论" value={String(user.stats.comment_count)} />
            <InfoRow label="加入" value={formatDate(user.created_at)} />
          </div>
        </section>

        <section className="border-b border-border pb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">高分评论</h2>
            <span className="font-mono text-xs text-muted-foreground">
              TOP {topComments.length}
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
                    {comment.score ?? 0} 分 / 可查看原帖
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
        className="size-20 shrink-0 rounded-full border border-border object-cover"
      />
    );
  }

  return (
    <div
      className="flex size-20 shrink-0 items-center justify-center rounded-full border border-border bg-secondary font-black text-primary"
      aria-label={`${getDisplayName(user)} 的头像占位`}
    >
      <User className="size-6" aria-hidden="true" />
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

function formatUserStatus(status: string) {
  switch (status) {
    case "active":
      return "正常";
    case "disabled":
      return "已停用";
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
    return "前端已按游客身份请求公开用户评论；如果仍返回认证错误，需要后端保持 optional Bearer 公开读取合同。";
  }

  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}
