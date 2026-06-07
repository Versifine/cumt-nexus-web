"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, CornerDownRight, User } from "lucide-react";

import { CommentLifecycleControls } from "@/features/comment/comment-lifecycle-controls";
import { CommentForm } from "@/features/comment/comment-form";
import { ContentBody } from "@/features/content/content-body";
import { ModerationRemoveDialog } from "@/features/moderation/moderation-remove-dialog";
import { ReportContentDialog } from "@/features/moderation/report-content-dialog";
import { cn } from "@/lib/utils";

import type { Comment } from "./types";

type CommentTreeProps = {
  canModerate?: boolean;
  comments: Comment[];
  currentUserId?: string | null;
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
      <div className="border-y border-border bg-primary/5 px-3 py-2 text-xs text-muted-foreground sm:px-4">
        <span className="font-mono text-primary">
          TREE / {comments.length} 条评论
        </span>
        <span className="ml-3">回复以左侧细线组织，深层讨论可折叠。</span>
      </div>

      <div className="divide-y divide-border">
        {roots.map((node, index) => (
          <CommentBranch
            key={node.comment.id}
            canModerate={canModerate}
            collapsedIds={collapsedIds}
            currentUserId={currentUserId}
            expandedDepthIds={expandedDepthIds}
            indexLabel={String(index + 1).padStart(2, "0")}
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
    </div>
  );
}

function CommentBranch({
  canModerate,
  collapsedIds,
  currentUserId,
  expandedDepthIds,
  indexLabel,
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
  indexLabel: string;
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

  return (
    <div
      className={cn(
        "relative py-5",
        visualDepth > 0 && "ml-3 border-l border-border pl-3 sm:ml-5 sm:pl-5",
      )}
    >
      <article className="grid gap-3 md:grid-cols-[72px_minmax(0,1fr)_128px]">
        <div className="font-mono text-xs text-muted-foreground">
          {indexLabel}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <CommentAuthorMeta comment={comment} />
            <span>{formatCommentStatus(comment.status)}</span>
            <span>深度 {apiDepth}</span>
            {replyCount > 0 ? <span>{replyCount} 条回复</span> : null}
          </div>

          <ContentBody
            attachments={comment.attachments}
            value={comment.body}
            className="mt-3 text-sm leading-7"
          />

          <CommentLifecycleControls
            canManage={canManageComment}
            comment={comment}
            postId={postId}
          />

          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
            <TextCommand
              onClick={() => onReply(replyingTo === comment.id ? null : comment.id)}
            >
              <CornerDownRight className="size-3.5" aria-hidden="true" />
              {replyingTo === comment.id ? "收起回复框" : "回复"}
            </TextCommand>

            {hasChildren ? (
              <TextCommand onClick={() => onToggleCollapsed(comment.id)}>
                {isCollapsed ? (
                  <ChevronRight className="size-3.5" aria-hidden="true" />
                ) : (
                  <ChevronDown className="size-3.5" aria-hidden="true" />
                )}
                {isCollapsed ? "展开分支" : "折叠分支"}
              </TextCommand>
            ) : null}

            <ReportContentDialog
              targetId={comment.id}
              targetLabel={comment.body.slice(0, 80) || "评论"}
              targetType="comment"
            />
            {canModerate ? (
              <ModerationRemoveDialog
                targetId={comment.id}
                targetLabel={comment.body.slice(0, 80) || "评论"}
                targetType="comment"
              />
            ) : null}
          </div>

          {replyingTo === comment.id ? (
            <div className="mt-4">
              <CommentForm
                compact
                onSubmitted={() => onReply(null)}
                parentId={comment.id}
                placeholder="回复这条评论，补充一个明确观点。"
                postId={postId}
                submitLabel="发布回复"
              />
            </div>
          ) : null}
        </div>

        <div className="text-left text-xs text-muted-foreground md:text-right">
          {formatDate(comment.created_at)}
        </div>
      </article>

      {hasChildren && !isCollapsed ? (
        <div className="mt-2">
          {isDepthLimited ? (
            <button
              type="button"
              className="ml-3 inline-flex min-h-10 items-center gap-2 border-l border-primary/50 px-3 py-2 text-xs text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:ml-5"
              onClick={() => onExpandDepth(comment.id)}
            >
              查看后续 {children.length} 条回复
            </button>
          ) : (
            children.map((child, index) => (
              <CommentBranch
                key={child.comment.id}
                canModerate={canModerate}
                collapsedIds={collapsedIds}
                currentUserId={currentUserId}
                expandedDepthIds={expandedDepthIds}
                indexLabel={`${indexLabel}.${index + 1}`}
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
        <div className="mt-3 border-l border-border px-3 py-2 text-xs text-muted-foreground">
          该分支已折叠，展开后可继续查看回复。
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
      className="-mx-1 inline-flex min-h-10 items-center gap-1.5 px-1 py-2 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
  const authorHandle = getCommentAuthorHandle(comment);
  const authorHref = getCommentAuthorHref(comment);

  const content = (
    <>
      <CommentAuthorAvatar comment={comment} name={authorName} />
      <span className="min-w-0">
        <span className="block truncate text-foreground">{authorName}</span>
        {authorHandle ? (
          <span className="mt-0.5 block truncate font-mono text-[11px] text-primary">
            {authorHandle}
          </span>
        ) : null}
      </span>
    </>
  );

  if (authorHref) {
    return (
      <Link
        href={authorHref}
        className="inline-flex min-w-0 items-center gap-1.5 border border-border bg-background px-2 py-1 transition-colors hover:border-primary/50 hover:text-primary"
      >
        {content}
      </Link>
    );
  }

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 border border-border bg-background px-2 py-1">
      {content}
    </span>
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

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={`${name} 的头像`}
        className="size-6 shrink-0 rounded-full border border-border object-cover"
      />
    );
  }

  return (
    <span
      className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-primary"
      aria-label={`${name} 的头像占位`}
    >
      <User className="size-3.5" aria-hidden="true" />
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

function getCommentAuthorHandle(comment: Comment) {
  const username = comment.author?.username?.trim();

  return username ? `@${username}` : "";
}

function getCommentAuthorHref(comment: Comment) {
  const username = comment.author?.username?.trim();

  return username ? `/users/${encodeURIComponent(username)}` : null;
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
