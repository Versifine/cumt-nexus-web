"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, CornerDownRight, User } from "lucide-react";

import { CommentLifecycleControls } from "@/features/comment/comment-lifecycle-controls";
import { CommentForm } from "@/features/comment/comment-form";
import { ContentBody } from "@/features/content/content-body";
import { getMarkdownPlainTextSummary } from "@/features/content/markdown-summary";
import { ModerationRemoveDialog } from "@/features/moderation/moderation-remove-dialog";
import { ReportContentDialog } from "@/features/moderation/report-content-dialog";
import {
  UserHoverPreview,
  type UserHoverIdentity,
} from "@/features/profile/user-hover-card";
import { RedditVoteControl } from "@/features/vote/reddit-vote-control";
import { cn } from "@/lib/utils";

import type { Comment } from "./types";

type CommentTreeProps = {
  canModerate?: boolean;
  comments: Comment[];
  currentUserId?: string | null;
  isAuthenticated?: boolean;
  maxDepth?: number;
  postId: string;
};

type CommentTreeNode = {
  children: CommentTreeNode[];
  comment: Comment;
  order: number;
};

export function CommentTree({
  canModerate = false,
  comments,
  currentUserId = null,
  isAuthenticated = false,
  maxDepth = 6,
  postId,
}: CommentTreeProps) {
  const roots = useMemo(() => buildCommentTree(comments), [comments]);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
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
    <div className="border-b border-border">
      {roots.map((node) => (
        <CommentBranch
          key={node.comment.id}
          canModerate={canModerate}
          collapsedIds={collapsedIds}
          currentUserId={currentUserId}
          expandedDepthIds={expandedDepthIds}
          isAuthenticated={isAuthenticated}
          maxDepth={maxDepth}
          node={node}
          onExpandDepth={expandDepth}
          onReply={setReplyingTo}
          onToggleCollapsed={toggleCollapsed}
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
  currentUserId,
  expandedDepthIds,
  isAuthenticated,
  maxDepth,
  node,
  onExpandDepth,
  onReply,
  onToggleCollapsed,
  postId,
  replyingTo,
  visualDepth,
}: {
  canModerate: boolean;
  collapsedIds: Set<string>;
  currentUserId: string | null;
  expandedDepthIds: Set<string>;
  isAuthenticated: boolean;
  maxDepth: number;
  node: CommentTreeNode;
  onExpandDepth: (commentId: string) => void;
  onReply: (commentId: string | null) => void;
  onToggleCollapsed: (commentId: string) => void;
  postId: string;
  replyingTo: string | null;
  visualDepth: number;
}) {
  const { children, comment } = node;
  const apiDepth = typeof comment.depth === "number" ? comment.depth : visualDepth;
  const replyCount = comment.reply_count ?? children.length;
  const hasChildren = children.length > 0;
  const isCollapsed = collapsedIds.has(comment.id);
  const canManageComment = currentUserId === comment.author_id;
  const isDepthLimited =
    apiDepth >= maxDepth && hasChildren && !expandedDepthIds.has(comment.id);
  const hasMoreReplies = comment.has_more_replies || isDepthLimited;
  const commentTargetLabel = getMarkdownPlainTextSummary(comment.body, "评论").slice(
    0,
    80,
  );
  const score =
    typeof comment.score === "number"
      ? comment.score
      : (comment.upvote_count ?? 0) - (comment.downvote_count ?? 0);

  return (
    <div
      className={cn(
        "border-t border-border",
        visualDepth > 0 && "border-l border-border pl-2 sm:pl-4",
      )}
    >
      <article className="grid grid-cols-[34px_minmax(0,1fr)] bg-background">
        <RedditVoteControl
          className="py-3"
          downvoteCount={comment.downvote_count ?? 0}
          myVote={comment.my_vote ?? 0}
          postId={postId}
          score={score}
          targetId={comment.id}
          targetType="comment"
          upvoteCount={comment.upvote_count ?? 0}
        />

        <div className="grid min-w-0 grid-cols-[32px_minmax(0,1fr)] gap-3 py-3 pl-2 sm:pl-3">
          <CommentAuthorAvatar
            comment={comment}
            name={getCommentAuthorName(comment)}
          />

          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <CommentAuthorMeta comment={comment} />
              <span aria-hidden="true">·</span>
              <span>{formatDate(comment.created_at)}</span>
              {comment.status !== "visible" ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{formatCommentStatus(comment.status)}</span>
                </>
              ) : null}
            </div>

            {!isCollapsed ? (
              <>
                <ContentBody
                  attachments={comment.attachments}
                  value={comment.body}
                  className="mt-2 text-sm leading-7"
                />

                <div className="mt-2 flex flex-wrap items-center gap-1 text-xs">
                  <TextCommand
                    onClick={() =>
                      onReply(replyingTo === comment.id ? null : comment.id)
                    }
                  >
                    <CornerDownRight className="size-3.5" aria-hidden="true" />
                    {replyingTo === comment.id ? "收起回复" : "回复"}
                  </TextCommand>

                  {hasChildren ? (
                    <TextCommand onClick={() => onToggleCollapsed(comment.id)}>
                      <ChevronDown className="size-3.5" aria-hidden="true" />
                      折叠
                    </TextCommand>
                  ) : null}

                  <CommentLifecycleControls
                    canManage={canManageComment}
                    comment={comment}
                    postId={postId}
                  />

                  {isAuthenticated &&
                  comment.viewer_permissions?.can_report !== false ? (
                    <ReportContentDialog
                      targetId={comment.id}
                      targetLabel={commentTargetLabel || "评论"}
                      targetType="comment"
                    />
                  ) : null}

                  {canModerate ? (
                    <ModerationRemoveDialog
                      targetId={comment.id}
                      targetLabel={commentTargetLabel || "评论"}
                      targetType="comment"
                    />
                  ) : null}
                </div>

                {replyingTo === comment.id ? (
                  <div className="mt-3">
                    <CommentForm
                      compact
                      onSubmitted={() => onReply(null)}
                      parentId={comment.id}
                      placeholder="回复这条评论"
                      postId={postId}
                      submitLabel="发布回复"
                    />
                  </div>
                ) : null}
              </>
            ) : (
              <button
                type="button"
                className="mt-2 inline-flex h-8 items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => onToggleCollapsed(comment.id)}
              >
                <ChevronRight className="size-3.5" aria-hidden="true" />
                展开{replyCount > 0 ? ` ${replyCount} 条回复` : "评论"}
              </button>
            )}
          </div>
        </div>
      </article>

      {hasChildren && !isCollapsed ? (
        <div>
          {isDepthLimited ? (
            <button
              type="button"
              className="my-2 inline-flex min-h-9 items-center gap-2 border-l border-primary/50 px-3 py-2 text-xs text-primary transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => onExpandDepth(comment.id)}
            >
              查看后续 {children.length} 条回复
            </button>
          ) : (
            children.map((child) => (
              <CommentBranch
                key={child.comment.id}
                canModerate={canModerate}
                collapsedIds={collapsedIds}
                currentUserId={currentUserId}
                expandedDepthIds={expandedDepthIds}
                isAuthenticated={isAuthenticated}
                maxDepth={maxDepth}
                node={child}
                onExpandDepth={onExpandDepth}
                onReply={onReply}
                onToggleCollapsed={onToggleCollapsed}
                postId={postId}
                replyingTo={replyingTo}
                visualDepth={visualDepth + 1}
              />
            ))
          )}
        </div>
      ) : null}

      {hasMoreReplies && isCollapsed ? (
        <div className="ml-9 border-l border-border/70 px-3 py-2 text-xs text-muted-foreground">
          这条评论已折叠，展开后可以继续查看回复。
        </div>
      ) : null}
    </div>
  );
}

function TextCommand({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="inline-flex h-8 items-center gap-1.5 px-1 font-semibold text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      onClick={onClick}
    >
      {children}
    </button>
  );
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
        className="mt-0.5 size-8 shrink-0 rounded-full bg-secondary object-cover ring-1 ring-border/70"
      />
    );
  }

  return (
    <span
      className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-primary ring-1 ring-border/70"
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
    displayName: getCommentAuthorName(comment),
    headline: comment.author?.headline?.trim() || "",
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
