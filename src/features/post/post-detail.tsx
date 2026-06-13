"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MessageSquare, Share2 } from "lucide-react";

import { useAppShellBackAction } from "@/components/app-shell/app-shell";
import {
  resolvePostBackSource,
  usePostNavigationSource,
  type PostNavigationSource,
} from "@/components/app-shell/post-navigation-source";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { SortMenu } from "@/components/ui/sort-menu";
import { TextAction } from "@/components/ui/text-action";
import { useAuthSession } from "@/features/auth/auth-session";
import { useCurrentUserQuery } from "@/features/auth/queries";
import { CommentForm } from "@/features/comment/comment-form";
import { CommentTree } from "@/features/comment/comment-tree";
import { usePostCommentsQuery } from "@/features/comment/queries";
import {
  commentSortItems,
  DEFAULT_COMMENT_SORT,
  formatCommentSortDescription,
  formatCommentSortFallbackNotice,
} from "@/features/comment/sort";
import type { CommentSort, ListCommentsResponse } from "@/features/comment/types";
import { ContentBody } from "@/features/content/content-body";
import {
  CommunityHoverAvatar,
  CommunityHoverPreview,
} from "@/features/community/community-hover-card";
import { ModerationRemoveDialog } from "@/features/moderation/moderation-remove-dialog";
import { ReportContentDialog } from "@/features/moderation/report-content-dialog";
import { RedditVoteControl } from "@/features/vote/reddit-vote-control";
import { ApiError } from "@/lib/api/client";

import {
  formatPostStatus,
  getPostAuthorIdentity,
  getPostCommunityIdentity,
  PostAuthorAvatar,
  PostDetailAttribution,
} from "./post-attribution";
import { PostLifecycleControls } from "./post-lifecycle-controls";
import { PostSaveButton } from "./post-save-button";
import { usePostQuery } from "./queries";
import type { GetPostResponse, Post } from "./types";

type PostDetailProps = {
  id: string;
  initialCommentSort?: CommentSort;
  initialCommentsData?: ListCommentsResponse;
  initialPostData?: GetPostResponse;
};

export function PostDetail({
  id,
  initialCommentSort = DEFAULT_COMMENT_SORT,
  initialCommentsData,
  initialPostData,
}: PostDetailProps) {
  const { isReady, token } = useAuthSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const navigationSource = usePostNavigationSource(id);
  const commentComposerAnchorRef = useRef<HTMLDivElement | null>(null);
  const [commentComposerFocusSignal, setCommentComposerFocusSignal] = useState(0);
  const [isCommentComposerExpanded, setIsCommentComposerExpanded] =
    useState(false);
  const [isCommentDockVisible, setIsCommentDockVisible] = useState(false);
  const [commentDockMetrics, setCommentDockMetrics] = useState<{
    left: number;
    width: number;
  } | null>(null);
  const currentUserQuery = useCurrentUserQuery();
  const postQuery = usePostQuery(id, isReady, initialPostData);
  const canRequestComments =
    isReady && postQuery.isSuccess && Boolean(postQuery.data?.post);
  const commentsQuery = usePostCommentsQuery(
    id,
    20,
    0,
    "tree",
    initialCommentSort,
    6,
    canRequestComments,
    initialCommentsData,
  );
  const commentSortFallbackNotice = formatCommentSortFallbackNotice(
    commentsQuery.data?.requested_sort,
    commentsQuery.data?.effective_sort,
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
  const commentCount = Math.max(post?.comment_count ?? 0, comments.length);
  const postIdForCommentDock = post?.id;
  const postBackTarget = getPostBackTarget(post, navigationSource);

  useAppShellBackAction(postBackTarget);

  useEffect(() => {
    let animationFrame = 0;

    if (!postIdForCommentDock) {
      animationFrame = window.requestAnimationFrame(() => {
        setIsCommentDockVisible(false);
      });

      return () => {
        window.cancelAnimationFrame(animationFrame);
      };
    }

    function updateCommentDock() {
      const anchor = commentComposerAnchorRef.current;

      if (!anchor) {
        setIsCommentDockVisible(false);
        setCommentDockMetrics(null);
        return;
      }

      const isDockVisible = anchor.getBoundingClientRect().bottom < 80;
      setIsCommentDockVisible(isDockVisible);

      if (!isDockVisible) {
        setCommentDockMetrics(null);
        return;
      }

      const nextMetrics = getCommentDockMetrics(anchor);
      setCommentDockMetrics((currentMetrics) =>
        currentMetrics?.left === nextMetrics.left &&
        currentMetrics.width === nextMetrics.width
          ? currentMetrics
          : nextMetrics,
      );
    }

    animationFrame = window.requestAnimationFrame(updateCommentDock);
    window.addEventListener("scroll", updateCommentDock, { passive: true });
    window.addEventListener("resize", updateCommentDock);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", updateCommentDock);
      window.removeEventListener("resize", updateCommentDock);
    };
  }, [postIdForCommentDock]);

  function focusCommentComposer() {
    setCommentComposerFocusSignal((value) => value + 1);

    if (isCommentDockVisible) {
      return;
    }

    window.requestAnimationFrame(() => {
      document
        .getElementById("post-comment-composer")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  return (
    <div
      className={
        isCommentDockVisible && isCommentComposerExpanded
          ? "grid grid-cols-[minmax(0,1fr)] gap-5 pb-64 pt-2 lg:grid-cols-[minmax(0,1fr)_280px]"
          : isCommentDockVisible
            ? "grid grid-cols-[minmax(0,1fr)] gap-5 pb-24 pt-2 lg:grid-cols-[minmax(0,1fr)_280px]"
            : "grid grid-cols-[minmax(0,1fr)] gap-5 py-2 lg:grid-cols-[minmax(0,1fr)_280px]"
      }
    >
      <div className="min-w-0">
        <section>
          {!isReady || postQuery.isLoading ? <LoadingState rows={3} /> : null}

          {isReady && postQuery.isError ? (
            <ErrorState
              title={getErrorTitle(postQuery.error, "无法加载帖子")}
              description={getErrorDescription(postQuery.error)}
              action={
                isUnauthenticated(postQuery.error) ? (
                  <TextAction href="/" tone="primary">
                    信息流首页
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
              onCommentIntent={focusCommentComposer}
              post={post}
            />
          ) : null}
        </section>

        {post ? (
          <section className="mt-6 border-t border-border pt-4" aria-labelledby="comments-heading">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
              <h2
                id="comments-heading"
                className="text-lg font-semibold tracking-normal"
              >
                评论
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {formatCommentSortDescription(initialCommentSort)}
                回复会保留树状层级。
              </p>
              {commentSortFallbackNotice ? (
                <p className="mt-2 max-w-2xl text-xs leading-5 text-warning">
                  {commentSortFallbackNotice}
                </p>
              ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">
                  {commentCount} 条评论
                </span>
                  <button
                    type="button"
                    className="inline-flex h-8 items-center gap-1.5 border-b border-transparent px-1 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    onClick={focusCommentComposer}
                  >
                    写评论
                    <span className="font-mono text-primary" aria-hidden="true">
                      +
                    </span>
                  </button>
                  <CommentSortMenu
                    disabled={!canRequestComments || commentsQuery.isFetching}
                    onSortChange={(nextSort) => {
                      if (nextSort !== initialCommentSort) {
                        router.push(
                          getCommentSortHref(pathname, searchParams, nextSort),
                        );
                      }
                    }}
                    sort={initialCommentSort}
                  />
              </div>
            </div>

            <div
              id="post-comment-composer"
              ref={commentComposerAnchorRef}
              className={
                isCommentDockVisible
                  ? isCommentComposerExpanded
                    ? "mt-4 min-h-64 scroll-mt-32"
                    : "mt-4 min-h-20 scroll-mt-32"
                  : "mt-4 scroll-mt-32 border-t border-border pt-3"
              }
            >
              <div
                className={
                  isCommentDockVisible
                    ? isCommentComposerExpanded
                      ? "fixed bottom-3 z-40 border border-border bg-background/95 p-2 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur sm:bottom-4 sm:p-3"
                      : "fixed bottom-3 z-40 shadow-[0_10px_30px_rgba(0,0,0,0.35)] sm:bottom-4"
                    : ""
                }
                style={
                  isCommentDockVisible && commentDockMetrics
                    ? {
                        left: commentDockMetrics.left,
                        width: commentDockMetrics.width,
                      }
                    : undefined
                }
              >
                <div
                  className={isCommentDockVisible ? "w-full" : ""}
                >
                  <CommentForm
                    docked={isCommentDockVisible}
                    focusSignal={commentComposerFocusSignal}
                    onExpandedChange={setIsCommentComposerExpanded}
                    postId={id}
                  />
                </div>
              </div>
            </div>

            <div className="mt-3 border-t border-border">
              {commentsQuery.isLoading ? (
                <div className="border-b border-border py-4">
                  <LoadingState rows={3} />
                </div>
              ) : null}

              {commentsQuery.isError ? (
                <div className="border-b border-border py-4">
                  <ErrorState
                    title={getErrorTitle(commentsQuery.error, "无法加载评论")}
                    description={getErrorDescription(commentsQuery.error)}
                    action={
                      isUnauthenticated(commentsQuery.error) ? (
                        <TextAction href="/" tone="primary">
                          信息流首页
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
                <div className="border-b border-border py-4">
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

function CommentSortMenu({
  disabled,
  onSortChange,
  sort,
}: {
  disabled: boolean;
  onSortChange: (sort: CommentSort) => void;
  sort: CommentSort;
}) {
  return (
    <SortMenu
      aria-label="选择评论排序方式"
      disabled={disabled}
      items={commentSortItems}
      onValueChange={onSortChange}
      value={sort}
    />
  );
}

function getCommentSortHref(
  pathname: string,
  searchParams: { toString(): string },
  sort: CommentSort,
) {
  const params = new URLSearchParams(searchParams.toString());
  params.delete("comment_sort");

  if (sort === DEFAULT_COMMENT_SORT) {
    params.delete("sort");
  } else {
    params.set("sort", sort);
  }

  const query = params.toString();

  return query ? `${pathname}?${query}` : pathname;
}

function getPostBackTarget(
  post: Post | undefined,
  source: PostNavigationSource | null,
) {
  const fallbackSlug = post?.community_slug?.trim() || post?.community?.slug?.trim();

  return resolvePostBackSource({
    communitySlug: fallbackSlug,
    postId: post?.id ?? "",
    source,
  });
}

function getCommentDockMetrics(anchor: HTMLElement) {
  const composerSurface = anchor.querySelector<HTMLElement>(
    'button[aria-label="展开评论输入框"], form',
  );

  if (composerSurface) {
    const rect = composerSurface.getBoundingClientRect();

    return {
      left: Math.round(rect.left),
      width: Math.round(rect.width),
    };
  }

  const rect = anchor.getBoundingClientRect();
  const horizontalInset = window.innerWidth >= 640 ? 16 : 12;
  const composerLeft = Math.round(rect.left + horizontalInset);
  const left = Math.max(horizontalInset, composerLeft);
  const right = Math.min(
    window.innerWidth - horizontalInset,
    Math.round(rect.right - horizontalInset),
  );
  const availableWidth = Math.max(0, right - left);

  return {
    left,
    width: Math.min(768, Math.max(280, availableWidth)),
  };
}

function PostArticle({
  canManage,
  canModerate,
  commentCount,
  isAuthenticated,
  onCommentIntent,
  post,
}: {
  canManage: boolean;
  canModerate: boolean;
  commentCount: number;
  isAuthenticated: boolean;
  onCommentIntent: () => void;
  post: Post;
}) {
  const [shareState, setShareState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );

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
    <article className="grid grid-cols-[42px_minmax(0,1fr)] border-t border-border bg-background sm:grid-cols-[52px_minmax(0,1fr)]">
      <RedditVoteControl
        className="border-r border-border/70 py-3"
        downvoteCount={post.downvote_count}
        myVote={post.my_vote}
        score={post.score}
        targetId={post.id}
        targetType="post"
        upvoteCount={post.upvote_count}
      />

      <div className="min-w-0">
        <header className="border-b border-border px-3 py-4 sm:px-4">
          <PostDetailAttribution post={post}>
            <h1 className="mt-3 break-words text-xl font-semibold leading-7 tracking-normal text-foreground sm:text-2xl sm:leading-8">
              {post.title}
            </h1>
          </PostDetailAttribution>
        </header>

        <div className="px-3 py-5 sm:px-4">
          <ContentBody
            attachments={post.attachments}
            value={post.body}
            className="text-base leading-8"
          />
        </div>

        <footer className="flex flex-wrap items-center gap-1 border-t border-border px-3 py-2 text-xs text-muted-foreground sm:px-4">
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 px-1 font-semibold transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            onClick={onCommentIntent}
          >
            <MessageSquare className="size-4" aria-hidden="true" />
            {commentCount} 条评论
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 px-1 font-semibold transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            onClick={copyPostLink}
          >
            <Share2 className="size-4" aria-hidden="true" />
            {shareState === "copied"
              ? "已复制"
              : shareState === "failed"
                ? "复制失败"
                : "分享"}
          </button>
          <PostSaveButton
            className="h-8 text-xs"
            isSaved={post.is_saved}
            postId={post.id}
            saveCount={post.save_count}
          />
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
  const community = getPostCommunityIdentity(post);
  const author = getPostAuthorIdentity(post);

  return (
    <aside className="border-t border-border px-0 py-5 lg:border-l lg:border-t-0 lg:pl-5">
      <div className="sticky top-20 space-y-5">
        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">所在社区</h2>
          <div className="mt-3 flex min-w-0 items-start gap-3">
            <CommunityHoverPreview
              community={{
                avatarUrl: community.avatarUrl,
                description: post.community?.description,
                href: community.href,
                label: community.label,
                memberCount: post.community?.member_count,
                name: community.name,
                postCount: post.community?.post_count,
                slug: community.slug,
                viewerIsFollowing: post.community?.viewer_is_following,
              }}
              panelClassName="w-80"
            >
              {community.href ? (
                <Link
                  href={community.href}
                  className="block shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  aria-label={`进入${community.name}`}
                >
                  <CommunityHoverAvatar
                    avatarUrl={community.avatarUrl}
                    label={community.name}
                  />
                </Link>
              ) : (
                <CommunityHoverAvatar
                  avatarUrl={community.avatarUrl}
                  label={community.name}
                />
              )}
            </CommunityHoverPreview>
            <div className="min-w-0">
              {community.href ? (
                <Link
                  href={community.href}
                  className="block truncate text-lg font-semibold tracking-normal hover:text-primary"
                >
                  {community.name}
                </Link>
              ) : (
                <span className="block truncate text-lg font-semibold tracking-normal">
                  {community.name}
                </span>
              )}
              {community.slug ? (
                <span className="mt-1 block truncate font-mono text-xs text-muted-foreground">
                  /{community.slug}
                </span>
              ) : null}
            </div>
          </div>
          {post.community?.description ? (
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
              {post.community.description}
            </p>
          ) : null}
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            {formatCommunityStats(post, commentCount)}
          </p>
        </section>

        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">作者</h2>
          <div className="mt-3 flex min-w-0 items-center gap-3">
            <PostAuthorAvatar avatarUrl={author.avatarUrl} name={author.name} />
            <div className="min-w-0">
              {author.href ? (
                <Link
                  href={author.href}
                  className="block truncate font-semibold hover:text-primary"
                >
                  {author.name}
                </Link>
              ) : (
                <span className="block truncate font-semibold">{author.name}</span>
              )}
            </div>
          </div>
          {post.author?.headline ? (
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
              {post.author.headline}
            </p>
          ) : null}
        </section>

        <section>
          <h2 className="text-sm font-semibold">发布时间</h2>
          <dl className="mt-3 space-y-2 border-t border-border pt-3 text-sm">
            {post.status !== "visible" ? (
              <RailRow label="状态" value={formatPostStatus(post.status)} />
            ) : null}
            <RailRow label="发布" value={formatDate(post.created_at)} />
            {post.updated_at !== post.created_at ? (
              <RailRow label="更新" value={formatDate(post.updated_at)} />
            ) : null}
          </dl>
        </section>
      </div>
    </aside>
  );
}

function RailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right">{value}</dd>
    </div>
  );
}

function formatCommunityStats(post: Post, commentCount: number) {
  const parts = [`${post.score} 分`, `${commentCount} 条评论`];

  if (typeof post.community?.member_count === "number") {
    parts.push(`${post.community.member_count} 名成员`);
  }

  return parts.join(" / ");
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
    return "这个帖子暂时无法公开读取。可以先去信息流首页，或登录后再试。";
  }

  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}
