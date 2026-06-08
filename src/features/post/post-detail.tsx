"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, MessageSquare, User } from "lucide-react";

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
import {
  InfoRow,
  MetricBlock,
  StatusToken,
} from "@/components/ui/data-display";
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
import { VoteControl } from "@/features/vote/vote-control";
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
  const { isReady } = useAuthSession();
  const [navigationSource] = useState<PostNavigationSource | null>(() =>
    readPostNavigationSource(id),
  );
  const currentUserQuery = useCurrentUserQuery();
  const canRequestPost = isReady;
  const postQuery = usePostQuery(id, canRequestPost, initialPostData);
  const canRequestComments =
    canRequestPost && postQuery.isSuccess && Boolean(postQuery.data?.post);
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
  const canModerate = currentUserQuery.data?.is_platform_staff === true;
  const canManagePost =
    Boolean(post) &&
    currentUserQuery.isSuccess &&
    currentUserId === post?.author_id;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 py-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <PostBackLink post={post} source={navigationSource} />

        <section className="mt-4">
          {!isReady ? (
            <LoadingState rows={3} />
          ) : postQuery.isLoading ? (
            <LoadingState rows={3} />
          ) : postQuery.isError ? (
            <ErrorState
              title={getErrorTitle(postQuery.error, "无法加载帖子")}
              description={getErrorDescription(postQuery.error)}
              action={
                isUnauthenticated(postQuery.error) ? (
                  <TextAction href="/communities" tone="primary">
                    浏览社区
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
          ) : post ? (
            <PostArticle
              canManage={canManagePost}
              canModerate={canModerate}
              post={post}
              commentCount={comments.length}
            />
          ) : null}
        </section>

        {post ? (
          <section className="mt-8 border-t border-border pt-6">
            <div className="border-b border-border pb-4">
              <div className="font-mono text-xs uppercase text-primary">
                COMMENTS / 帖子评论
              </div>
              <h2 className="mt-2 text-2xl font-black tracking-normal">
                评论
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                用评论补充信息、提出问题或回应观点。回复会以树状结构展开，深层讨论可以折叠。
              </p>
            </div>

            <div className="border-b border-border py-5">
              <CommentForm postId={id} />
            </div>

            <div className="py-5">
              {commentsQuery.isLoading ? (
                <div className="border-b border-border pb-5">
                  <LoadingState rows={3} />
                </div>
              ) : null}

              {commentsQuery.isError ? (
                <ErrorState
                  title={getErrorTitle(commentsQuery.error, "无法加载评论")}
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
                  title="还没有评论"
                  description="发布第一条评论，让这条讨论继续展开。"
                />
              ) : null}

              {commentsQuery.isSuccess && comments.length > 0 ? (
                <CommentTree
                  comments={comments}
                  currentUserId={currentUserId}
                  canModerate={canModerate}
                  maxDepth={6}
                  postId={id}
                />
              ) : null}
            </div>
          </section>
        ) : null}
      </div>

      {post ? (
        <PostRail
          post={post}
          commentCount={comments.length}
          isCommentsLoading={commentsQuery.isLoading}
        />
      ) : null}
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

  return (
    <SourceBackLink href={href}>{label}</SourceBackLink>
  );
}

function PostArticle({
  canManage,
  canModerate,
  post,
  commentCount,
}: {
  canManage: boolean;
  canModerate: boolean;
  post: Post;
  commentCount: number;
}) {
  const communityHref = getCommunityHref(post);
  const communityLabel = getCommunityLabel(post);
  const communityName = getCommunityName(post);

  return (
    <article>
      <div className="border-b border-border pb-6">
        <div className="font-mono text-xs uppercase text-primary">
          CUMT NEXUS / 讨论详情
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <StatusToken tone="primary">
            {communityHref ? (
              <Link href={communityHref} className="hover:text-foreground">
                {communityLabel}
              </Link>
            ) : (
              communityLabel
            )}
          </StatusToken>
          {communityName !== communityLabel ? (
            <StatusToken>{communityName}</StatusToken>
          ) : null}
          <StatusToken>{formatPostStatus(post.status)}</StatusToken>
        </div>
        <PostAuthorSummary post={post} />
        <h1 className="mt-4 break-words text-4xl font-black leading-tight tracking-normal text-foreground md:text-5xl">
          {post.title}
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          发布于 {formatDate(post.created_at)}，更新于 {formatDate(post.updated_at)}
        </p>
      </div>

      <div className="border-b border-border py-6">
        <ContentBody
          attachments={post.attachments}
          value={post.body}
          className="text-base leading-8"
        />
      </div>

      <PostLifecycleControls canManage={canManage} post={post} />

      <div className="border-b border-border py-4">
        <div className="flex flex-col gap-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <VoteControl
            postId={post.id}
            upvoteCount={post.upvote_count}
            downvoteCount={post.downvote_count}
            score={post.score}
            myVote={post.my_vote}
          />
          <span className="inline-flex items-center gap-1.5">
            <MessageSquare className="size-4" aria-hidden="true" />
            {commentCount} 条评论
          </span>
          <ReportContentDialog
            targetId={post.id}
            targetLabel={post.title}
            targetType="post"
          />
          {canModerate ? (
            <ModerationRemoveDialog
              targetId={post.id}
              targetLabel={post.title}
              targetType="post"
            />
          ) : null}
        </div>
      </div>
    </article>
  );
}

function PostRail({
  post,
  commentCount,
  isCommentsLoading,
}: {
  post?: Post;
  commentCount: number;
  isCommentsLoading: boolean;
}) {
  const communityHref = post ? getCommunityHref(post) : null;
  const communityDisplay = post ? getCommunityDisplay(post) : "--";
  const authorDisplay = post ? getAuthorDisplay(post) : "--";

  return (
    <aside className="border-t border-border pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
      <div className="sticky top-6 space-y-8">
        <section className="border-b border-border pb-6">
          <div className="font-mono text-xs uppercase text-muted-foreground">
            帖子数据
          </div>
          <div className="mt-3 grid grid-cols-2 border border-border text-center">
            <MetricBlock label="分数" value={post ? String(post.score) : "--"} />
            <MetricBlock
              label="评论"
              value={isCommentsLoading ? "--" : String(commentCount)}
            />
          </div>
          {post ? <PostAuthorCard post={post} /> : null}
          <div className="mt-4 divide-y divide-border border-y border-border">
            <InfoRow label="状态" value={post ? formatPostStatus(post.status) : "--"} />
            <InfoRow
              label="社区"
              value={
                communityHref ? (
                  <Link href={communityHref} className="hover:text-primary">
                    {communityDisplay}
                  </Link>
                ) : (
                  communityDisplay
                )
              }
            />
            <InfoRow label="作者" value={authorDisplay} />
            <InfoRow label="创建" value={post ? formatDate(post.created_at) : "--"} />
          </div>
        </section>

        <section className="border-b border-border pb-6">
          <h2 className="text-sm font-semibold">投票概览</h2>
          <div className="mt-3 divide-y divide-border border-y border-border">
            <InfoRow
              icon={<ArrowUp className="size-4" aria-hidden="true" />}
              label="赞成"
              value={post ? String(post.upvote_count) : "--"}
              active={post?.my_vote === 1}
            />
            <InfoRow
              icon={<ArrowDown className="size-4" aria-hidden="true" />}
              label="反对"
              value={post ? String(post.downvote_count) : "--"}
              active={post?.my_vote === -1}
            />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold">参与提示</h2>
          <div className="mt-3 divide-y divide-border border-y border-border">
            {["先阅读正文，再投票或评论。", "评论只补充真实信息和明确观点。", "遇到争议内容时优先描述事实。"].map(
              (item, index) => (
                <div key={item} className="flex gap-3 py-3 text-sm leading-6">
                  <span className="font-mono text-xs text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-muted-foreground">{item}</span>
                </div>
              ),
            )}
          </div>
        </section>
      </div>
    </aside>
  );
}

function PostAuthorSummary({ post }: { post: Post }) {
  const authorName = getAuthorName(post);
  const authorHandle = getAuthorHandle(post);
  const authorHref = getAuthorHref(post);
  const headline = post.author?.headline?.trim();
  const badges = post.author?.badges ?? [];

  const authorContent = (
    <>
      <PostAuthorAvatar name={authorName} post={post} size="large" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-foreground">
          {authorName}
        </span>
        {authorHandle ? (
          <span className="mt-1 block truncate font-mono text-xs text-primary">
            {authorHandle}
          </span>
        ) : null}
      </span>
    </>
  );

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <span className="font-mono text-xs text-muted-foreground">作者</span>
      {authorHref ? (
        <Link
          href={authorHref}
          className="inline-flex min-w-0 items-center gap-2 transition-colors hover:text-primary"
        >
          {authorContent}
        </Link>
      ) : (
        <span className="inline-flex min-w-0 items-center gap-2">
          {authorContent}
        </span>
      )}
      {headline ? (
        <span className="max-w-xl truncate text-sm text-muted-foreground">
          {headline}
        </span>
      ) : null}
      {badges.map((badge) => (
        <StatusToken key={badge} tone="primary">
          {badge}
        </StatusToken>
      ))}
    </div>
  );
}

function PostAuthorCard({ post }: { post: Post }) {
  const authorName = getAuthorName(post);
  const authorHandle = getAuthorHandle(post);
  const authorHref = getAuthorHref(post);
  const headline = post.author?.headline?.trim();

  const content = (
    <>
      <PostAuthorAvatar name={authorName} post={post} size="small" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-foreground">
          {authorName}
        </span>
        {authorHandle ? (
          <span className="mt-1 block truncate font-mono text-xs text-primary">
            {authorHandle}
          </span>
        ) : null}
      </span>
    </>
  );

  return (
    <div className="mt-4 border-y border-border py-3">
      {authorHref ? (
        <Link
          href={authorHref}
          className="flex min-w-0 items-center gap-3 transition-colors hover:text-primary"
        >
          {content}
        </Link>
      ) : (
        <div className="flex min-w-0 items-center gap-3">{content}</div>
      )}
      {headline ? (
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
          {headline}
        </p>
      ) : null}
    </div>
  );
}

function PostAuthorAvatar({
  name,
  post,
  size,
}: {
  name: string;
  post: Post;
  size: "large" | "small";
}) {
  const sizeClass = size === "large" ? "size-10" : "size-12";
  const avatarUrl = post.author?.avatar_url?.trim();

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={`${name} 的头像`}
        className={`${sizeClass} shrink-0 rounded-full border border-border object-cover`}
      />
    );
  }

  return (
    <span
      className={`${sizeClass} inline-flex shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-primary`}
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

function getAuthorDisplay(post: Post) {
  const name = getAuthorName(post);
  const handle = getAuthorHandle(post);

  return handle ? `${name} ${handle}` : name;
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
    return "公开内容暂不可读";
  }

  return fallback;
}

function getErrorDescription(error: Error | null) {
  if (isUnauthenticated(error)) {
    return "这个帖子暂时无法公开读取。可以先浏览社区，或登录后再试。";
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
    default:
      return status;
  }
}
