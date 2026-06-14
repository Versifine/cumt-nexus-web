"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, CornerDownRight, User } from "lucide-react";

import { CommentEffectSummary } from "@/features/comment/comment-effect-summary";
import { CommentEffectMenu } from "@/features/comment/comment-effect-menu";
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
import { UserIdentityMarks } from "@/features/profile/user-identity-marks";
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
  const areRepliesCollapsed = collapsedIds.has(comment.id);
  const canManageComment = currentUserId === comment.author_id;
  const isDepthLimited =
    apiDepth >= maxDepth && hasChildren && !expandedDepthIds.has(comment.id);
  const commentTargetLabel = getMarkdownPlainTextSummary(comment.body, "评论").slice(
    0,
    80,
  );
  const score =
    typeof comment.score === "number"
      ? comment.score
      : (comment.upvote_count ?? 0) - (comment.downvote_count ?? 0);
  const isReplying = replyingTo === comment.id;

  return (
    <div
      className="relative border-t border-border"
    >
      <article
        className={cn(
          "grid grid-cols-[30px_minmax(0,1fr)] transition-colors",
          visualDepth > 0
            ? "hover:bg-background-soft/[0.16]"
            : "bg-background",
        )}
      >
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

        <div className="grid min-w-0 grid-cols-[28px_minmax(0,1fr)] gap-2 py-3 pl-2 sm:gap-3 sm:pl-3">
          <CommentAuthorAvatar
            comment={comment}
            name={getCommentAuthorName(comment)}
          />

          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <CommentAuthorMeta comment={comment} />
              <UserIdentityMarks
                badges={comment.author?.badges?.filter(Boolean) ?? []}
                displayTitle={
                  comment.author?.progression?.active_title?.name ??
                  comment.author?.display_title
                }
                level={comment.author?.progression ?? comment.author?.level}
                maxItems={2}
                size="sm"
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

            <div className="mt-2 flex flex-wrap items-center gap-1 text-xs">
              <TextCommand
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

              {isAuthenticated &&
              comment.viewer_permissions?.can_report !== false ? (
                <ReportContentDialog
                  targetId={comment.id}
                  targetLabel={commentTargetLabel || "评论"}
                  targetType="comment"
                />
              ) : null}

              {canModerate && comment.status !== "removed" ? (
                <ModerationRemoveDialog
                  targetId={comment.id}
                  targetLabel={commentTargetLabel || "评论"}
                  targetPostId={postId}
                  targetStatus={comment.status}
                  targetType="comment"
                />
              ) : null}
            </div>

            {isReplying ? (
              <ThreadRail active className="mt-3" depth={visualDepth}>
                <ThreadRailItem active nodeTop="compact">
                  <CommentForm
                    compact
                    onSubmitted={() => onReply(null)}
                    parentId={comment.id}
                    placeholder="回复这条评论"
                    postId={postId}
                    submitLabel="发布回复"
                  />
                </ThreadRailItem>
              </ThreadRail>
            ) : null}
          </div>
        </div>
      </article>

      {hasChildren && !areRepliesCollapsed ? (
        <ThreadRail active={isReplying} depth={visualDepth}>
          {isDepthLimited ? (
            <ThreadRailItem active nodeTop="compact">
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
              <ThreadRailItem
                key={child.comment.id}
                active={replyingTo === child.comment.id}
              >
                <CommentBranch
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
              </ThreadRailItem>
            ))
          )}
        </ThreadRail>
      ) : null}

      {hasChildren && areRepliesCollapsed ? (
        <ThreadRail depth={visualDepth}>
          <ThreadRailItem nodeTop="compact">
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

function ThreadRail({
  active = false,
  children,
  className,
  depth,
}: {
  active?: boolean;
  children: ReactNode;
  className?: string;
  depth: number;
}) {
  return (
    <div
      className={cn(
        "relative pl-4",
        depth === 0 ? "ml-9 sm:ml-10" : "ml-5 sm:ml-6",
        className,
      )}
      style={{ "--thread-rail-x": "4px" } as CSSProperties}
    >
      <span
        className={cn(
          "absolute bottom-0 left-[calc(var(--thread-rail-x)-0.5px)] top-0 w-px transition-colors",
          active ? "bg-primary/60" : "bg-border/55",
        )}
        aria-hidden="true"
      />
      {children}
    </div>
  );
}

function ThreadRailItem({
  active = false,
  children,
  className,
  nodeTop = "comment",
}: {
  active?: boolean;
  children: ReactNode;
  className?: string;
  nodeTop?: "comment" | "compact";
}) {
  return (
    <div className={cn("relative", className)}>
      <span
        className={cn(
          "absolute left-[calc(var(--thread-rail-x)-20px)] size-2 rounded-full border border-background transition-colors",
          nodeTop === "compact" ? "top-4" : "top-[26px]",
          active ? "bg-primary" : "bg-border-strong",
        )}
        aria-hidden="true"
      />
      {children}
    </div>
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
