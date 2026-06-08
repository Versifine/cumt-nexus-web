"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  Image as ImageIcon,
  Link as LinkIcon,
  MessageSquare,
  Share2,
} from "lucide-react";

import { rememberPostNavigationSource } from "@/components/app-shell/post-navigation-source";
import { getMarkdownPlainTextSummary } from "@/features/content/markdown-summary";
import { RedditVoteControl } from "@/features/vote/reddit-vote-control";
import { cn } from "@/lib/utils";

import type { Post } from "./types";

type PostSourceContext = {
  href: string;
  label: string;
};

type AuthorFallback = {
  displayName?: string;
  username?: string;
};

type CommunityFallback = {
  name?: string;
  slug?: string;
};

type RedditPostListItemProps = {
  authorFallback?: AuthorFallback;
  className?: string;
  communityFallback?: CommunityFallback;
  post: Post;
  showCommunity?: boolean;
  source: PostSourceContext;
};

export function RedditPostListItem({
  authorFallback,
  className,
  communityFallback,
  post,
  showCommunity = true,
  source,
}: RedditPostListItemProps) {
  const [shareState, setShareState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const postHref = `/posts/${post.id}`;
  const communitySlug =
    post.community?.slug?.trim() ||
    post.community_slug?.trim() ||
    communityFallback?.slug?.trim() ||
    "";
  const communityName =
    post.community?.name?.trim() ||
    post.community_name?.trim() ||
    communityFallback?.name?.trim() ||
    (communitySlug ? `/${communitySlug}` : "社区");
  const authorName =
    post.author?.display_name?.trim() ||
    post.author?.username?.trim() ||
    authorFallback?.displayName?.trim() ||
    authorFallback?.username?.trim() ||
    "用户";
  const authorUsername =
    post.author?.username?.trim() || authorFallback?.username?.trim() || "";
  const previewImage = getPreviewImage(post);
  const excerpt = getPostExcerpt(post);
  const postUrl =
    typeof window === "undefined"
      ? postHref
      : new URL(postHref, window.location.origin).toString();

  function rememberSource() {
    rememberPostNavigationSource({
      href: source.href,
      label: source.label,
      postId: post.id,
    });
  }

  async function copyPostLink() {
    try {
      await navigator.clipboard.writeText(postUrl);
      setShareState("copied");
      window.setTimeout(() => setShareState("idle"), 1600);
    } catch {
      setShareState("failed");
      window.setTimeout(() => setShareState("idle"), 1600);
    }
  }

  return (
    <article
      className={cn(
        "group grid min-w-0 grid-cols-[42px_minmax(0,1fr)] border-b border-border bg-background transition-colors hover:bg-background-soft/60 sm:grid-cols-[48px_minmax(0,1fr)]",
        className,
      )}
    >
      <RedditVoteControl
        className="border-r border-border bg-background-soft/45 py-3"
        downvoteCount={post.downvote_count}
        myVote={post.my_vote}
        score={post.score}
        targetId={post.id}
        targetType="post"
        upvoteCount={post.upvote_count}
      />

      <div className="min-w-0 px-3 py-3 sm:px-4">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5 text-muted-foreground">
          {showCommunity ? (
            communitySlug ? (
              <Link
                href={`/communities/${encodeURIComponent(communitySlug)}`}
                className="font-semibold text-foreground hover:text-primary"
              >
                /{communitySlug}
              </Link>
            ) : (
              <span className="font-semibold text-foreground">{communityName}</span>
            )
          ) : null}
          {showCommunity ? <span aria-hidden="true">·</span> : null}
          {authorUsername ? (
            <Link
              href={`/users/${encodeURIComponent(authorUsername)}`}
              className="hover:text-foreground"
            >
              {authorName}
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

        <h2 className="mt-1 min-w-0 text-base font-semibold leading-6 tracking-normal text-foreground sm:text-lg">
          <Link
            href={postHref}
            onClick={rememberSource}
            className="break-words hover:text-primary"
          >
            {post.title}
          </Link>
        </h2>

        {previewImage ? (
          <Link
            href={postHref}
            onClick={rememberSource}
            className="mt-3 block w-full max-w-[540px] overflow-hidden border border-border bg-background-soft"
          >
            <img
              src={previewImage.url}
              alt={previewImage.alt_text || `${post.title} 的图片预览`}
              className="max-h-[360px] w-full object-cover"
              loading="lazy"
            />
          </Link>
        ) : excerpt ? (
          <Link
            href={postHref}
            onClick={rememberSource}
            className="mt-2 line-clamp-3 block max-w-3xl text-sm leading-6 text-muted-foreground hover:text-foreground"
          >
            {excerpt}
          </Link>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <PostActionLink href={postHref} onClick={rememberSource}>
            <MessageSquare className="size-4" aria-hidden="true" />
            {post.comment_count ?? 0} 条评论
          </PostActionLink>
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
          {previewImage ? (
            <span className="inline-flex h-8 items-center gap-1.5 px-2">
              <ImageIcon className="size-4" aria-hidden="true" />
              图片
            </span>
          ) : null}
          {post.preview?.kind === "link" ? (
            <span className="inline-flex h-8 items-center gap-1.5 px-2">
              <LinkIcon className="size-4" aria-hidden="true" />
              链接
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

function getPostExcerpt(post: Post) {
  return getMarkdownPlainTextSummary(post.body_excerpt || post.body, "");
}

function getPreviewImage(post: Post) {
  if (post.preview?.image?.url) {
    return post.preview.image;
  }

  return (
    post.attachments?.find(
      (item) => item.kind === "image" && item.status === "ready" && item.url,
    ) ?? null
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatPostStatus(status: string) {
  switch (status) {
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
