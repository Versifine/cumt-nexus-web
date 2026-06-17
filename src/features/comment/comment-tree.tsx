"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, CornerDownRight, User } from "lucide-react";

import { CommentEffectSummary } from "@/features/comment/comment-effect-summary";
import { CommentEffectMenu } from "@/features/comment/comment-effect-menu";
import { CommentLifecycleControls } from "@/features/comment/comment-lifecycle-controls";
import { CommentForm } from "@/features/comment/comment-form";
import { ContentBody } from "@/features/content/content-body";
import { getMarkdownPlainTextSummary } from "@/features/content/markdown-summary";
import { DisabledMessageShareAction } from "@/features/message/disabled-share-action";
import { createMessageShareSnapshot } from "@/features/message/share";
import { ModerationQuickActions } from "@/features/moderation/moderation-quick-actions";
import { ReportContentDialog } from "@/features/moderation/report-content-dialog";
import {
  UserHoverPreview,
  type UserHoverIdentity,
} from "@/features/profile/user-hover-card";
import { UserInlineIdentity } from "@/features/profile/user-identity-marks";
import { RedditVoteControl } from "@/features/vote/reddit-vote-control";
import { cn } from "@/lib/utils";

import type { Comment } from "./types";

type CommentTreeProps = {
  canModerate?: boolean;
  comments: Comment[];
  communityModerationSlug?: string;
  currentUserId?: string | null;
  isAuthenticated?: boolean;
  maxDepth?: number;
  onCommentSubmitted?: (comment: Comment) => void;
  onReplyChange: (commentId: string | null) => void;
  platformAuditEnabled?: boolean;
  postId: string;
  replyingTo: string | null;
};

type CommentTreeNode = {
  children: CommentTreeNode[];
  comment: Comment;
  order: number;
};

export function CommentTree({
  canModerate = false,
  comments,
  communityModerationSlug,
  currentUserId = null,
  isAuthenticated = false,
  maxDepth = 6,
  onCommentSubmitted,
  onReplyChange,
  platformAuditEnabled = false,
  postId,
  replyingTo,
}: CommentTreeProps) {
  const roots = useMemo(() => buildCommentTree(comments), [comments]);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [expandedDepthIds, setExpandedDepthIds] = useState<Set<string>>(new Set());

  function toggleCollapsed(commentId: string) {
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  }

  function expandDepth(commentId: string) {
    setExpandedDepthIds((current) => {
      const next = new Set(current);
      next.add(commentId);
      return next;
    });
  }

  return (
    <div className="space-y-2">
      {roots.map((node) => (
        <CommentBranch
          key={node.comment.id}
          canModerate={canModerate}
          collapsedIds={collapsedIds}
          communityModerationSlug={communityModerationSlug}
          currentUserId={currentUserId}
          expandedDepthIds={expandedDepthIds}
          isAuthenticated={isAuthenticated}
          maxDepth={maxDepth}
          node={node}
          onExpandDepth={expandDepth}
          onCommentSubmitted={onCommentSubmitted}
          onReply={onReplyChange}
          onToggleCollapsed={toggleCollapsed}
          platformAuditEnabled={platformAuditEnabled}
          postId={postId}
          replyingTo={replyingTo}
          visualDepth={0}
        />
      ))}
    </div>
  );
}

function CommentBranch({
  canModerate,
  collapsedIds,
  communityModerationSlug,
  currentUserId,
  expandedDepthIds,
  isAuthenticated,
  maxDepth,
  node,
  onExpandDepth,
  onCommentSubmitted,
  onReply,
  onToggleCollapsed,
  platformAuditEnabled,
  postId,
  replyingTo,
  visualDepth,
}: {
  canModerate: boolean;
  collapsedIds: Set<string>;
  communityModerationSlug?: string;
  currentUserId: string | null;
  expandedDepthIds: Set<string>;
  isAuthenticated: boolean;
  maxDepth: number;
  node: CommentTreeNode;
  onExpandDepth: (commentId: string) => void;
  onCommentSubmitted?: (comment: Comment) => void;
  onReply: (commentId: string | null) => void;
  onToggleCollapsed: (commentId: string) => void;
  platformAuditEnabled: boolean;
  postId: string;
  replyingTo: string | null;
  visualDepth: number;
}) {
  const { children, comment } = node;
  const apiDepth = typeof comment.depth === "number" ? comment.depth : visualDepth;
  const replyCount = comment.reply_count ?? children.length;
  const hasChildren = children.length > 0;
  const areRepliesCollapsed = collapsedIds.has(comment.id);
  const canManageComment = currentUserId === comment.author_id;
  const isDepthLimited =
    apiDepth >= maxDepth && hasChildren && !expandedDepthIds.has(comment.id);
  const commentTargetLabel = getMarkdownPlainTextSummary(comment.body, "评论").slice(
    0,
    80,
  );
  const messageShare = createMessageShareSnapshot({
    shareId: comment.id,
    shareType: "comment",
    snapshotCreatedAt: comment.updated_at || comment.created_at,
    summary: commentTargetLabel,
    targetUrl: `/posts/${postId}?comment=${encodeURIComponent(comment.id)}`,
    title: "评论分享",
  });
  const score =
    typeof comment.score === "number"
      ? comment.score
      : (comment.upvote_count ?? 0) - (comment.downvote_count ?? 0);
  const isReplying = replyingTo === comment.id;

  return (
    <div className="relative">
      <article
        id={getCommentElementId(comment.id)}
        data-comment-id={comment.id}
        className={cn(
          "grid scroll-mt-24 grid-cols-[30px_minmax(0,1fr)] overflow-hidden rounded-md transition-[background-color,box-shadow] data-[focus-comment=true]:ring-2 data-[focus-comment=true]:ring-primary/40",
          visualDepth > 0 && "pl-2 sm:pl-4",
          visualDepth > 0
            ? "bg-surface-raised/50 hover:bg-surface-hover"
            : "bg-surface-raised",
          isReplying && "bg-surface-hover ring-1 ring-primary/25",
        )}
      >
        <RedditVoteControl
          className="bg-surface-raised/70 py-3"
          downvoteCount={comment.downvote_count ?? 0}
          myVote={comment.my_vote ?? 0}
          postId={postId}
          score={score}
          targetId={comment.id}
          targetType="comment"
          upvoteCount={comment.upvote_count ?? 0}
        />

        <div className="grid min-w-0 grid-cols-[28px_minmax(0,1fr)] gap-2 py-3 pl-2 sm:gap-3 sm:pl-3">
          <CommentAuthorAvatar
            comment={comment}
            name={getCommentAuthorName(comment)}
          />

          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <CommentAuthorMeta comment={comment} />
              <UserInlineIdentity
                level={comment.author?.progression ?? comment.author?.level}
                title={
                  comment.author?.progression?.active_title?.name ??
                  comment.author?.display_title
                }
                username={comment.author?.username}
                size="xs"
              />
              <span aria-hidden="true">·</span>
              <span>{formatDate(comment.created_at)}</span>
              {comment.status !== "visible" ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{formatCommentStatus(comment.status)}</span>
                </>
              ) : null}
            </div>

            <ContentBody
              attachments={comment.attachments}
              value={comment.body}
              className="mt-2 text-sm leading-7"
            />

            <CommentEffectSummary effects={comment.effects} />

            <div className="mt-2 space-y-1.5 text-xs">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <TextCommand
                  active={isReplying}
                  onClick={() => onReply(isReplying ? null : comment.id)}
                >
                  <CornerDownRight className="size-3.5" aria-hidden="true" />
                  {isReplying ? "收起回复" : "回复"}
                </TextCommand>

                {hasChildren ? (
                  <TextCommand onClick={() => onToggleCollapsed(comment.id)}>
                    {areRepliesCollapsed ? (
                      <ChevronRight className="size-3.5" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="size-3.5" aria-hidden="true" />
                    )}
                    {areRepliesCollapsed
                      ? `展开 ${replyCount} 条回复`
                      : `收起 ${replyCount} 条回复`}
                  </TextCommand>
                ) : null}

                <CommentLifecycleControls
                  canManage={canManageComment}
                  comment={comment}
                  postId={postId}
                />

                <CommentEffectMenu
                  commentId={comment.id}
                  isAuthenticated={isAuthenticated}
                  postId={postId}
                />

                <DisabledMessageShareAction label="发送给好友" share={messageShare} />

                {isAuthenticated &&
                comment.viewer_permissions?.can_report !== false ? (
                  <ReportContentDialog
                    targetId={comment.id}
                    targetLabel={commentTargetLabel || "评论"}
                    targetType="comment"
                  />
                ) : null}
              </div>

              {canModerate && comment.status !== "removed" ? (
                <div className="min-w-0">
                  <ModerationQuickActions
                    auditHref={
                      platformAuditEnabled
                        ? `/admin/audit-logs?target_type=comment&target_id=${encodeURIComponent(comment.id)}`
                        : null
                    }
                    canRemove={comment.status !== "removed"}
                    communityManageHref={
                      communityModerationSlug
                        ? `/communities/${encodeURIComponent(communityModerationSlug)}/manage`
                        : null
                    }
                    communitySlug={communityModerationSlug}
                    targetId={comment.id}
                    targetAuthorId={comment.author_id}
                    targetLabel={commentTargetLabel || "评论"}
                    targetPostId={postId}
                    targetStatus={comment.status}
                    targetType="comment"
                    userHref={
                      platformAuditEnabled
                        ? `/admin/users?q=${encodeURIComponent(
                            comment.author?.username || comment.author_id,
                          )}`
                        : null
                    }
                  />
                </div>
              ) : null}
            </div>

          </div>
        </div>

        {isReplying ? (
          <div className="col-span-2 min-w-0 px-2 pb-3 pt-1 sm:px-3">
            <ReplyComposerFrame>
              <CommentForm
                compact
                onSubmitted={(newComment) => {
                  onReply(null);
                  onCommentSubmitted?.(newComment);
                }}
                parentId={comment.id}
                placeholder="回复这条评论"
                postId={postId}
                submitLabel="发布回复"
              />
            </ReplyComposerFrame>
          </div>
        ) : null}
      </article>

      {hasChildren && !areRepliesCollapsed ? (
        <ThreadRail depth={visualDepth}>
          {isDepthLimited ? (
            <ThreadRailItem>
              <button
                type="button"
                className="my-2 inline-flex min-h-9 items-center gap-2 px-3 py-2 text-xs text-primary transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={() => onExpandDepth(comment.id)}
              >
                查看后续 {children.length} 条回复
              </button>
            </ThreadRailItem>
          ) : (
            children.map((child) => (
              <ThreadRailItem key={child.comment.id}>
                <CommentBranch
                  canModerate={canModerate}
                  collapsedIds={collapsedIds}
                  communityModerationSlug={communityModerationSlug}
                  currentUserId={currentUserId}
                  expandedDepthIds={expandedDepthIds}
                  isAuthenticated={isAuthenticated}
                  maxDepth={maxDepth}
                  node={child}
                  onExpandDepth={onExpandDepth}
                  onCommentSubmitted={onCommentSubmitted}
                  onReply={onReply}
                  onToggleCollapsed={onToggleCollapsed}
                  platformAuditEnabled={platformAuditEnabled}
                  postId={postId}
                  replyingTo={replyingTo}
                  visualDepth={visualDepth + 1}
                />
              </ThreadRailItem>
            ))
          )}
        </ThreadRail>
      ) : null}

      {hasChildren && areRepliesCollapsed ? (
        <ThreadRail depth={visualDepth}>
          <ThreadRailItem>
            <div className="py-2 text-xs text-muted-foreground">
              回复已收起，展开后可以继续查看楼中楼。
            </div>
          </ThreadRailItem>
        </ThreadRail>
      ) : null}
    </div>
  );
}

function TextCommand({
  active = false,
  children,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-8 items-center gap-1.5 px-1 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        active ? "text-primary" : "text-muted-foreground hover:text-primary",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ReplyComposerFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-md bg-surface px-2 py-2 ring-1 ring-primary/20">
      {children}
    </div>
  );
}

function getCommentElementId(commentId: string) {
  return `comment-${commentId}`;
}

function ThreadRail({
  children,
  className,
  depth,
}: {
  children: ReactNode;
  className?: string;
  depth: number;
}) {
  return (
    <div
      className={cn(
        "relative",
        depth === 0
          ? "ml-6 pl-2 sm:ml-7"
          : depth === 1
            ? "ml-4 pl-2 sm:ml-5"
            : "ml-3 pl-2 sm:ml-4",
        className,
      )}
    >
      <span
        className="absolute bottom-2 left-1 top-2 w-px rounded-full bg-border-strong/45"
        aria-hidden="true"
      />
      {children}
    </div>
  );
}

function ThreadRailItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("relative", className)}>{children}</div>;
}

function buildCommentTree(comments: Comment[]) {
  const nodeById = new Map<string, CommentTreeNode>();
  const roots: CommentTreeNode[] = [];

  comments.forEach((comment, order) => {
    nodeById.set(comment.id, {
      children: [],
      comment,
      order,
    });
  });

  comments.forEach((comment) => {
    const node = nodeById.get(comment.id);
    if (!node) {
      return;
    }

    const parentId = comment.parent_id || null;
    const parent = parentId ? nodeById.get(parentId) : null;

    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  sortTreeByInputOrder(roots);
  return roots;
}

function sortTreeByInputOrder(nodes: CommentTreeNode[]) {
  nodes.sort((left, right) => left.order - right.order);
  nodes.forEach((node) => sortTreeByInputOrder(node.children));
}

function CommentAuthorMeta({ comment }: { comment: Comment }) {
  const authorName = getCommentAuthorName(comment);
  const authorHref = getCommentAuthorHref(comment);
  const hoverUser = getCommentAuthorHoverIdentity(comment);
  const className =
    "min-w-0 truncate font-semibold text-foreground transition-colors hover:text-primary";

  if (authorHref) {
    return (
      <UserHoverPreview
        className="min-w-0"
        user={hoverUser}
        panelClassName="w-72"
      >
        <Link href={authorHref} className={className}>
          {authorName}
        </Link>
      </UserHoverPreview>
    );
  }

  return (
    <UserHoverPreview
      className="min-w-0"
      user={hoverUser}
      panelClassName="w-72"
    >
      <span className={className}>{authorName}</span>
    </UserHoverPreview>
  );
}

function CommentAuthorAvatar({
  comment,
  name,
}: {
  comment: Comment;
  name: string;
}) {
  const avatarUrl = comment.author?.avatar_url?.trim();
  const authorHref = getCommentAuthorHref(comment);
  const hoverUser = getCommentAuthorHoverIdentity(comment);
  const avatar = <CommentAuthorAvatarVisual avatarUrl={avatarUrl} name={name} />;

  if (authorHref) {
    return (
      <UserHoverPreview user={hoverUser} panelClassName="w-72">
        <Link
          href={authorHref}
          aria-label={`进入${name}的主页`}
          className="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {avatar}
        </Link>
      </UserHoverPreview>
    );
  }

  return (
    <UserHoverPreview user={hoverUser} panelClassName="w-72">
      {avatar}
    </UserHoverPreview>
  );
}

function CommentAuthorAvatarVisual({
  avatarUrl,
  name,
}: {
  avatarUrl?: string;
  name: string;
}) {

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={`${name} 的头像`}
        className="mt-0.5 size-8 shrink-0 rounded-full bg-secondary object-cover"
      />
    );
  }

  return (
    <span
      className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-primary"
      aria-label={`${name} 的头像占位`}
    >
      <User className="size-4" aria-hidden="true" />
    </span>
  );
}

function getCommentAuthorName(comment: Comment) {
  return (
    comment.author?.display_name?.trim() ||
    comment.author?.username?.trim() ||
    "用户"
  );
}

function getCommentAuthorHref(comment: Comment) {
  const username = comment.author?.username?.trim();

  return username ? `/users/${encodeURIComponent(username)}` : null;
}

function getCommentAuthorHoverIdentity(comment: Comment): UserHoverIdentity {
  return {
    avatarUrl: comment.author?.avatar_url?.trim() || "",
    badges: comment.author?.badges?.filter(Boolean) ?? [],
    displayTitle:
      comment.author?.progression?.active_title?.name?.trim() ||
      comment.author?.display_title?.trim() ||
      null,
    displayName: getCommentAuthorName(comment),
    headline: comment.author?.headline?.trim() || "",
    level: comment.author?.progression ?? comment.author?.level ?? null,
    username: comment.author?.username?.trim() || "",
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatCommentStatus(status: string) {
  switch (status) {
    case "visible":
      return "可见";
    case "archived":
      return "已归档";
    case "hidden":
      return "已隐藏";
    case "removed":
      return "已移除";
    case "deleted":
      return "已删除";
    default:
      return status;
  }
}
