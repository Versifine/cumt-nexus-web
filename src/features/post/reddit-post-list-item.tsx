"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  ExternalLink,
  Link as LinkIcon,
  MessageSquare,
  Share2,
  ShieldCheck,
} from "lucide-react";

import { rememberPostNavigationSource } from "@/components/app-shell/post-navigation-source";
import { resolvePlatformRole } from "@/features/auth/platform-role";
import { useCurrentUserQuery } from "@/features/auth/queries";
import {
  resolveLinkPreview,
  type ResolvedLinkPreview,
} from "@/features/content/link-preview";
import { ContentImageGallery } from "@/features/content/content-image-gallery";
import {
  resolveEmbedMediaBlockFromUrl,
  resolveFirstContentMediaBlock,
} from "@/features/content/content-media";
import { getMarkdownPlainTextSummary } from "@/features/content/markdown-summary";
import { canAccessCommunityManagement } from "@/features/community/permissions";
import { MediaEmbedPlayer } from "@/features/content/media-embed-player";
import { DisabledMessageShareAction } from "@/features/message/disabled-share-action";
import { ModerationQuickActions } from "@/features/moderation/moderation-quick-actions";
import { RedditVoteControl } from "@/features/vote/reddit-vote-control";
import { cn } from "@/lib/utils";

import {
  PostPreviewAttribution,
  type PostAuthorFallback,
  type PostCommunityFallback,
} from "./post-attribution";
import { PostSaveButton } from "./post-save-button";
import type { Post } from "./types";

type PostSourceContext = {
  href: string;
  label: string;
};

type RedditPostListItemProps = {
  authorFallback?: PostAuthorFallback;
  className?: string;
  communityFallback?: PostCommunityFallback;
  onRememberSource?: (postId: string) => void;
  post: Post;
  showCommunity?: boolean;
  source: PostSourceContext;
};

export function RedditPostListItem({
  authorFallback,
  className,
  communityFallback,
  onRememberSource,
  post,
  showCommunity = true,
  source,
}: RedditPostListItemProps) {
  const [shareState, setShareState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const postHref = `/posts/${post.id}`;
  const mediaBlock = getPostMediaBlock(post);
  const linkPreview = mediaBlock ? null : getPostLinkPreview(post);
  const excerpt = getPostExcerpt(post);
  const currentUserQuery = useCurrentUserQuery();
  const platformRole = resolvePlatformRole(currentUserQuery.data);
  const communitySlug =
    post.community?.slug?.trim() || post.community_slug?.trim() || null;
  const canUseCommunityManage = canUsePostCommunityManage(post, platformRole);
  const communityManageHref =
    communitySlug && canUseCommunityManage
      ? `/communities/${encodeURIComponent(communitySlug)}/manage`
      : null;
  const postUrl =
    typeof window === "undefined"
      ? postHref
      : new URL(postHref, window.location.origin).toString();

  function rememberSource() {
    if (onRememberSource) {
      onRememberSource(post.id);
      return;
    }

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
        "group flex min-w-0 gap-0 border-b border-border/60",
        className,
      )}
    >
      <div className="flex w-10 shrink-0 flex-col items-center pt-3 sm:w-11">
        <RedditVoteControl
          downvoteCount={post.downvote_count}
          myVote={post.my_vote}
          score={post.score}
          targetId={post.id}
          targetType="post"
          upvoteCount={post.upvote_count}
        />
      </div>

      <PostPreviewAttribution
        authorFallback={authorFallback}
        className="min-w-0 flex-1 px-2 py-3 sm:px-3"
        communityFallback={communityFallback}
        post={post}
        showCommunity={showCommunity}
      >
        <h2 className="mt-1 min-w-0 text-base font-semibold leading-6 tracking-normal text-foreground sm:text-lg">
          <Link
            href={postHref}
            onClick={rememberSource}
            className="break-words hover:text-primary"
          >
            {post.title}
          </Link>
        </h2>

        {mediaBlock?.kind === "image-gallery" ? (
          <div className="mt-3">
            <ContentImageGallery
              attachments={mediaBlock.attachments}
              caption={mediaBlock.caption}
              href={postHref}
              onNavigate={rememberSource}
              variant="preview"
            />
          </div>
        ) : mediaBlock?.kind === "embed" ? (
          <div className="mt-3 max-w-[640px]">
            <MediaEmbedPlayer embed={mediaBlock.embed} />
          </div>
        ) : linkPreview ? (
          <div className="mt-3 space-y-2">
            <PostLinkPreviewCard preview={linkPreview} />
            {excerpt ? (
              <Link
                href={postHref}
                onClick={rememberSource}
                className="line-clamp-2 block max-w-3xl text-sm leading-6 text-muted-foreground hover:text-foreground"
              >
                {excerpt}
              </Link>
            ) : null}
          </div>
        ) : excerpt ? (
          <Link
            href={postHref}
            onClick={rememberSource}
            className="mt-2 line-clamp-3 block max-w-3xl text-sm leading-6 text-muted-foreground hover:text-foreground"
          >
            {excerpt}
          </Link>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <PostActionLink href={postHref} onClick={rememberSource}>
            <MessageSquare className="size-3.5" aria-hidden="true" />
            {post.comment_count ?? 0} 条评论
          </PostActionLink>
          <button
            type="button"
            className="inline-flex h-7 items-center gap-1.5 px-1 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            onClick={copyPostLink}
          >
            <Share2 className="size-3.5" aria-hidden="true" />
            {shareState === "copied"
              ? "已复制"
              : shareState === "failed"
                ? "复制失败"
                : "分享"}
          </button>
          <DisabledMessageShareAction label="发送给好友" />
          <PostSaveButton
            className="h-7 text-xs"
            isSaved={post.is_saved}
            postId={post.id}
            saveCount={post.save_count}
          />
          {communityManageHref ? (
            <PostActionLink href={communityManageHref} onClick={() => undefined}>
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              管理社区
            </PostActionLink>
          ) : null}
          {communityManageHref && communitySlug ? (
            <ModerationQuickActions
              canRemove={post.status !== "removed"}
              communityManageHref={communityManageHref}
              communitySlug={communitySlug}
              targetId={post.id}
              targetAuthorId={post.author_id}
              targetLabel={post.title}
              targetStatus={post.status}
              targetState={{
                flairText: post.flair_text,
                isLocked: post.is_locked,
                isNsfw: post.is_nsfw,
                isPinned: post.is_pinned,
                isSpoiler: post.is_spoiler,
              }}
              targetType="post"
            />
          ) : null}
        </div>
      </PostPreviewAttribution>
    </article>
  );
}

function PostLinkPreviewCard({ preview }: { preview: ResolvedLinkPreview }) {
  return (
    <a
      href={preview.url}
      target="_blank"
      rel="nofollow ugc noopener noreferrer"
      className="group block max-w-[640px] border-l border-border px-3 py-2 transition-colors hover:border-primary"
    >
      <span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <LinkIcon className="size-3 shrink-0" aria-hidden="true" />
          <span className="truncate font-mono">{preview.host}</span>
          {preview.source === "backend" ? (
          <span className="shrink-0 text-muted-foreground/70">预览</span>
          ) : null}
        <ExternalLink
          className="ml-auto size-3.5 shrink-0 opacity-60 transition-colors group-hover:text-primary group-hover:opacity-100"
          aria-hidden="true"
        />
        </span>
      <span className="mt-0.5 block truncate text-sm font-medium text-foreground">
          {preview.title}
        </span>
        {preview.description ? (
        <span className="mt-0.5 line-clamp-1 text-xs leading-5 text-muted-foreground">
            {preview.description}
          </span>
        ) : null}
    </a>
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
      className="inline-flex h-7 items-center gap-1.5 px-1 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {children}
    </Link>
  );
}

function getPostExcerpt(post: Post) {
  return getMarkdownPlainTextSummary(post.body_excerpt || post.body, "");
}

function getPostMediaBlock(post: Post) {
  const bodyMediaBlock = resolveFirstContentMediaBlock({
    attachments: post.attachments,
    markdown: post.body,
  });

  if (bodyMediaBlock) {
    return bodyMediaBlock;
  }

  const excerptMediaBlock = resolveFirstContentMediaBlock({
    attachments: post.attachments,
    markdown: post.body_excerpt,
  });

  return excerptMediaBlock ?? resolveEmbedMediaBlockFromUrl(getPostPreviewUrl(post));
}

function getPostLinkPreview(post: Post) {
  return resolveLinkPreview({
    backendPreview: post.preview?.link ?? post.preview ?? null,
    markdown: post.body || post.body_excerpt,
  });
}

function getPostPreviewUrl(post: Post) {
  return post.preview?.link?.url ?? post.preview?.url ?? null;
}

function canUsePostCommunityManage(
  post: Post,
  platformRole: ReturnType<typeof resolvePlatformRole>,
) {
  const slug = post.community?.slug?.trim() || post.community_slug?.trim();

  return (
    post.viewer_permissions?.can_manage === true ||
    post.viewer_permissions?.can_moderate === true ||
    canAccessCommunityManagement(post.community, platformRole) ||
    (platformRole === "owner" && Boolean(slug))
  );
}
