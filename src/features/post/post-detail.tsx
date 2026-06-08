"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageSquare, Share2, User } from "lucide-react";

import {
  readPostNavigationSource,
  resolvePostBackSource,
  type PostNavigationSource,
} from "@/components/app-shell/post-navigation-source";
import { SourceBackLink } from "@/components/app-shell/source-back-link";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { TextAction } from "@/components/ui/text-action";
import { useAuthSession } from "@/features/auth/auth-session";
import { useCurrentUserQuery } from "@/features/auth/queries";
import { CommentForm } from "@/features/comment/comment-form";
import { CommentTree } from "@/features/comment/comment-tree";
import { usePostCommentsQuery } from "@/features/comment/queries";
import type { ListCommentsResponse } from "@/features/comment/types";
import { ContentBody } from "@/features/content/content-body";
import { ModerationRemoveDialog } from "@/features/moderation/moderation-remove-dialog";
import { ReportContentDialog } from "@/features/moderation/report-content-dialog";
import { RedditVoteControl } from "@/features/vote/reddit-vote-control";
import { ApiError } from "@/lib/api/client";

import { PostLifecycleControls } from "./post-lifecycle-controls";
import { usePostQuery } from "./queries";
import type { GetPostResponse, Post } from "./types";

type PostDetailProps = {
  id: string;
  initialCommentsData?: ListCommentsResponse;
  initialPostData?: GetPostResponse;
};

export function PostDetail({
  id,
  initialCommentsData,
  initialPostData,
}: PostDetailProps) {
  const { isReady, token } = useAuthSession();
  const [navigationSource] = useState<PostNavigationSource | null>(() =>
    readPostNavigationSource(id),
  );
  const currentUserQuery = useCurrentUserQuery();
  const postQuery = usePostQuery(id, isReady, initialPostData);
  const canRequestComments =
    isReady && postQuery.isSuccess && Boolean(postQuery.data?.post);
  const commentsQuery = usePostCommentsQuery(
    id,
    20,
    0,
    "tree",
    "new",
    6,
    canRequestComments,
    initialCommentsData,
  );
  const post = postQuery.data?.post;
  const comments = canRequestComments ? (commentsQuery.data?.comments ?? []) : [];
  const currentUserId = currentUserQuery.data?.id ?? null;
  const isAuthenticated = Boolean(token);
  const canModerate = currentUserQuery.data?.is_platform_staff === true;
  const canManagePost =
    Boolean(post) &&
    currentUserQuery.isSuccess &&
    currentUserId === post?.author_id;
  const commentCount = post?.comment_count ?? comments.length;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 py-4 lg:grid-cols-[minmax(0,1fr)_312px]">
      <div className="min-w-0">
        <PostBackLink post={post} source={navigationSource} />

        <section className="mt-3">
          {!isReady || postQuery.isLoading ? <LoadingState rows={3} /> : null}

          {isReady && postQuery.isError ? (
            <ErrorState
              title={getErrorTitle(postQuery.error, "无法加载帖子")}
              description={getErrorDescription(postQuery.error)}
              action={
                isUnauthenticated(postQuery.error) ? (
                  <TextAction href="/" tone="primary">
                    返回信息流
                  </TextAction>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => postQuery.refetch()}
                  >
                    重试
                  </Button>
                )
              }
            />
          ) : null}

          {post ? (
            <PostArticle
              canManage={canManagePost}
              canModerate={canModerate}
              commentCount={commentCount}
              isAuthenticated={isAuthenticated}
              post={post}
            />
          ) : null}
        </section>

        {post ? (
          <section className="mt-4">
            <div className="border-x border-t border-border bg-background px-3 py-3 sm:px-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold tracking-normal">
                    评论
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    按最新回复展示，回复会保留树状层级。
                  </p>
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  {commentCount} 条评论
                </span>
              </div>
            </div>

            <div className="border-x border-t border-border bg-background px-3 py-4 sm:px-4">
              <CommentForm postId={id} />
            </div>

            <div className="border-x border-border bg-background">
              {commentsQuery.isLoading ? (
                <div className="border-b border-border p-4">
                  <LoadingState rows={3} />
                </div>
              ) : null}

              {commentsQuery.isError ? (
                <div className="border-b border-border p-4">
                  <ErrorState
                    title={getErrorTitle(commentsQuery.error, "无法加载评论")}
                    description={getErrorDescription(commentsQuery.error)}
                    action={
                      isUnauthenticated(commentsQuery.error) ? (
                        <TextAction href="/" tone="primary">
                          返回信息流
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
                    title="还没有评论"
                    description="发布第一条评论，让这条讨论继续展开。"
                  />
                </div>
              ) : null}

              {commentsQuery.isSuccess && comments.length > 0 ? (
                <CommentTree
                  canModerate={canModerate}
                  comments={comments}
                  currentUserId={currentUserId}
                  isAuthenticated={isAuthenticated}
                  maxDepth={6}
                  postId={id}
                />
              ) : null}
            </div>
          </section>
        ) : null}
      </div>

      {post ? <PostRail post={post} commentCount={commentCount} /> : null}
    </div>
  );
}

function PostBackLink({
  post,
  source,
}: {
  post?: Post;
  source: PostNavigationSource | null;
}) {
  const fallbackSlug = post?.community_slug?.trim() || post?.community?.slug?.trim();
  const { href, label } = resolvePostBackSource({
    communitySlug: fallbackSlug,
    postId: post?.id ?? "",
    source,
  });

  return <SourceBackLink href={href}>{label}</SourceBackLink>;
}

function PostArticle({
  canManage,
  canModerate,
  commentCount,
  isAuthenticated,
  post,
}: {
  canManage: boolean;
  canModerate: boolean;
  commentCount: number;
  isAuthenticated: boolean;
  post: Post;
}) {
  const [shareState, setShareState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const communityHref = getCommunityHref(post);
  const communityLabel = getCommunityLabel(post);
  const authorName = getAuthorName(post);
  const authorHandle = getAuthorHandle(post);
  const authorHref = getAuthorHref(post);

  async function copyPostLink() {
    const href = new URL(`/posts/${post.id}`, window.location.origin).toString();

    try {
      await navigator.clipboard.writeText(href);
      setShareState("copied");
      window.setTimeout(() => setShareState("idle"), 1600);
    } catch {
      setShareState("failed");
      window.setTimeout(() => setShareState("idle"), 1600);
    }
  }

  return (
    <article className="grid grid-cols-[42px_minmax(0,1fr)] border border-border bg-background sm:grid-cols-[56px_minmax(0,1fr)]">
      <RedditVoteControl
        className="border-r border-border bg-background-soft/45 py-3"
        downvoteCount={post.downvote_count}
        myVote={post.my_vote}
        score={post.score}
        targetId={post.id}
        targetType="post"
        upvoteCount={post.upvote_count}
      />

      <div className="min-w-0">
        <header className="border-b border-border px-3 py-3 sm:px-4">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5 text-muted-foreground">
            {communityHref ? (
              <Link
                href={communityHref}
                className="font-semibold text-foreground hover:text-primary"
              >
                {communityLabel}
              </Link>
            ) : (
              <span className="font-semibold text-foreground">{communityLabel}</span>
            )}
            <span aria-hidden="true">·</span>
            {authorHref ? (
              <Link href={authorHref} className="hover:text-foreground">
                {authorName}
                {authorHandle ? ` ${authorHandle}` : ""}
              </Link>
            ) : (
              <span>{authorName}</span>
            )}
            <span aria-hidden="true">·</span>
            <span>{formatDate(post.created_at)}</span>
            {post.status !== "visible" ? (
              <>
                <span aria-hidden="true">·</span>
                <span>{formatPostStatus(post.status)}</span>
              </>
            ) : null}
          </div>
          <h1 className="mt-2 break-words text-xl font-semibold leading-7 tracking-normal text-foreground sm:text-2xl sm:leading-8">
            {post.title}
          </h1>
        </header>

        <div className="px-3 py-4 sm:px-4">
          <ContentBody
            attachments={post.attachments}
            value={post.body}
            className="text-base leading-8"
          />
        </div>

        <footer className="flex flex-wrap items-center gap-1 border-t border-border px-3 py-2 text-xs text-muted-foreground sm:px-4">
          <span className="inline-flex h-8 items-center gap-1.5 px-2 font-semibold">
            <MessageSquare className="size-4" aria-hidden="true" />
            {commentCount} 条评论
          </span>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 px-2 font-semibold transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            onClick={copyPostLink}
          >
            <Share2 className="size-4" aria-hidden="true" />
            {shareState === "copied"
              ? "已复制"
              : shareState === "failed"
                ? "复制失败"
                : "分享"}
          </button>
          <PostLifecycleControls canManage={canManage} post={post} />
          {isAuthenticated && post.viewer_permissions?.can_report !== false ? (
            <ReportContentDialog
              targetId={post.id}
              targetLabel={post.title}
              targetType="post"
            />
          ) : null}
          {canModerate ? (
            <ModerationRemoveDialog
              targetId={post.id}
              targetLabel={post.title}
              targetType="post"
            />
          ) : null}
        </footer>
      </div>
    </article>
  );
}

function PostRail({
  commentCount,
  post,
}: {
  commentCount: number;
  post: Post;
}) {
  const communityHref = getCommunityHref(post);
  const communityDisplay = getCommunityDisplay(post);
  const authorName = getAuthorName(post);
  const authorHandle = getAuthorHandle(post);
  const authorHref = getAuthorHref(post);

  return (
    <aside className="border-t border-border bg-background-soft/45 px-4 py-5 lg:border-l lg:border-t-0">
      <div className="sticky top-20 space-y-5">
        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">所在社区</h2>
          <div className="mt-3">
            {communityHref ? (
              <Link
                href={communityHref}
                className="text-lg font-semibold tracking-normal hover:text-primary"
              >
                {communityDisplay}
              </Link>
            ) : (
              <span className="text-lg font-semibold tracking-normal">
                {communityDisplay}
              </span>
            )}
          </div>
          {post.community?.description ? (
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
              {post.community.description}
            </p>
          ) : null}
          <div className="mt-4 grid grid-cols-3 border border-border text-center">
            <RailMetric label="分数" value={String(post.score)} />
            <RailMetric label="评论" value={String(commentCount)} />
            <RailMetric
              label="成员"
              value={
                typeof post.community?.member_count === "number"
                  ? String(post.community.member_count)
                  : "--"
              }
            />
          </div>
        </section>

        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">作者</h2>
          <div className="mt-3 flex min-w-0 items-center gap-3">
            <PostAuthorAvatar name={authorName} post={post} />
            <div className="min-w-0">
              {authorHref ? (
                <Link
                  href={authorHref}
                  className="block truncate font-semibold hover:text-primary"
                >
                  {authorName}
                </Link>
              ) : (
                <span className="block truncate font-semibold">{authorName}</span>
              )}
              {authorHandle ? (
                <span className="mt-1 block truncate font-mono text-xs text-primary">
                  {authorHandle}
                </span>
              ) : null}
            </div>
          </div>
          {post.author?.headline ? (
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
              {post.author.headline}
            </p>
          ) : null}
        </section>

        <section>
          <h2 className="text-sm font-semibold">帖子状态</h2>
          <div className="mt-3 divide-y divide-border border-y border-border text-sm">
            <RailRow label="状态" value={formatPostStatus(post.status)} />
            <RailRow label="发布" value={formatDate(post.created_at)} />
            <RailRow label="更新" value={formatDate(post.updated_at)} />
          </div>
        </section>
      </div>
    </aside>
  );
}

function RailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-border p-2 last:border-r-0">
      <div className="font-mono text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}

function RailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right">{value}</span>
    </div>
  );
}

function PostAuthorAvatar({ name, post }: { name: string; post: Post }) {
  const avatarUrl = post.author?.avatar_url?.trim();

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={`${name} 的头像`}
        className="size-10 shrink-0 rounded-full border border-border object-cover"
      />
    );
  }

  return (
    <span
      className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-primary"
      aria-label={`${name} 的头像占位`}
    >
      <User className="size-5" aria-hidden="true" />
    </span>
  );
}

function getCommunitySlug(post: Post) {
  return post.community?.slug?.trim() || post.community_slug?.trim() || "";
}

function getCommunityLabel(post: Post) {
  const slug = getCommunitySlug(post);

  return slug ? `/${slug}` : getCommunityName(post);
}

function getCommunityName(post: Post) {
  return post.community?.name?.trim() || post.community_name?.trim() || "社区";
}

function getCommunityDisplay(post: Post) {
  const slug = getCommunitySlug(post);
  const name = getCommunityName(post);

  if (slug && name && name !== `/${slug}`) {
    return `${name} /${slug}`;
  }

  return slug ? `/${slug}` : name;
}

function getCommunityHref(post: Post) {
  const slug = getCommunitySlug(post);

  return slug ? `/communities/${encodeURIComponent(slug)}` : null;
}

function getAuthorName(post: Post) {
  return post.author?.display_name?.trim() || post.author?.username?.trim() || "用户";
}

function getAuthorHandle(post: Post) {
  const username = post.author?.username?.trim();

  return username ? `@${username}` : "";
}

function getAuthorHref(post: Post) {
  const username = post.author?.username?.trim();

  return username ? `/users/${encodeURIComponent(username)}` : null;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function isUnauthenticated(error: Error | null) {
  return error instanceof ApiError && error.code === "unauthenticated";
}

function getErrorTitle(error: Error | null, fallback: string) {
  if (isUnauthenticated(error)) {
    return "公开内容暂时不可读";
  }

  return fallback;
}

function getErrorDescription(error: Error | null) {
  if (isUnauthenticated(error)) {
    return "这个帖子暂时无法公开读取。可以先返回信息流，或登录后再试。";
  }

  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}

function formatPostStatus(status: string) {
  switch (status) {
    case "visible":
      return "可见";
    case "archived":
      return "已归档";
    case "hidden":
      return "已隐藏";
    case "deleted":
      return "已删除";
    case "removed":
      return "已移除";
    default:
      return status;
  }
}
