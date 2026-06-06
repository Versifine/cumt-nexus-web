"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, MessageSquare } from "lucide-react";

import {
  readPostNavigationSource,
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
import { MediaAttachmentGallery } from "@/features/media/media-attachments";
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
    <div className="grid gap-8 py-6 lg:grid-cols-[minmax(0,1fr)_320px]">
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
  const href =
    source?.href ?? (fallbackSlug ? `/communities/${fallbackSlug}` : "/communities");
  const label =
    source?.label ?? (fallbackSlug ? `返回 /${fallbackSlug}` : "返回社区");

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
  return (
    <article>
      <div className="border-b border-border pb-6">
        <div className="font-mono text-xs uppercase text-primary">
          CUMT NEXUS / 讨论详情
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <StatusToken tone="primary">
            {post.community_slug ? `/${post.community_slug}` : `社区 ${formatShortId(post.community_id)}`}
          </StatusToken>
          <StatusToken>{formatPostStatus(post.status)}</StatusToken>
          <StatusToken>作者 {formatShortId(post.author_id)}</StatusToken>
        </div>
        <h1 className="mt-4 break-words text-4xl font-black leading-tight tracking-normal text-foreground md:text-5xl">
          {post.title}
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          发布于 {formatDate(post.created_at)}，更新于 {formatDate(post.updated_at)}
        </p>
      </div>

      <div className="border-b border-border py-6">
        <ContentBody value={post.body} className="text-base leading-8" />
        <MediaAttachmentGallery attachments={post.attachments} className="mt-5" />
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
          <div className="mt-4 divide-y divide-border border-y border-border">
            <InfoRow label="状态" value={post ? formatPostStatus(post.status) : "--"} />
            <InfoRow
              label="社区"
              value={post ? post.community_slug ?? formatShortId(post.community_id) : "--"}
            />
            <InfoRow label="作者" value={post ? formatShortId(post.author_id) : "--"} />
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

function formatShortId(value: string) {
  return value.slice(0, 8);
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
    return "前端已按游客身份请求公开帖子内容；如果仍返回认证错误，需要后端保持 optional Bearer 公开读取合同。";
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
