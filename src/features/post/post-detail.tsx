"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MessageSquare, Share2 } from "lucide-react";

import { useAppShellBackAction } from "@/components/app-shell/app-shell";
import {
  resolvePostBackSource,
  usePostNavigationSource,
  type PostNavigationSource,
} from "@/components/app-shell/post-navigation-source";
import {
  RightRail,
  RightRailInfoList,
  RightRailInfoRow,
  RightRailSection,
} from "@/components/app-shell/right-rail";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { InfiniteListStatus } from "@/components/feedback/infinite-list-status";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { SortMenu } from "@/components/ui/sort-menu";
import { TextAction } from "@/components/ui/text-action";
import { useAuthSession } from "@/features/auth/auth-session";
import { resolvePlatformRole } from "@/features/auth/platform-role";
import { useCurrentUserQuery } from "@/features/auth/queries";
import { CommentForm } from "@/features/comment/comment-form";
import { CommentTree } from "@/features/comment/comment-tree";
import { useInfinitePostCommentsQuery } from "@/features/comment/queries";
import {
  commentSortItems,
  DEFAULT_COMMENT_SORT,
  formatCommentSortDescription,
  formatCommentSortFallbackNotice,
} from "@/features/comment/sort";
import type {
  Comment,
  CommentSort,
  ListCommentsResponse,
} from "@/features/comment/types";
import { ContentBody } from "@/features/content/content-body";
import { getMarkdownPlainTextSummary } from "@/features/content/markdown-summary";
import {
  CommunityHoverAvatar,
  CommunityHoverPreview,
} from "@/features/community/community-hover-card";
import { canAccessCommunityManagement } from "@/features/community/permissions";
import { DisabledMessageShareAction } from "@/features/message/disabled-share-action";
import { createMessageShareSnapshot } from "@/features/message/share";
import { ModerationQuickActions } from "@/features/moderation/moderation-quick-actions";
import { ReportContentDialog } from "@/features/moderation/report-content-dialog";
import { RedditVoteControl } from "@/features/vote/reddit-vote-control";
import { ApiError } from "@/lib/api/client";
import { useInfiniteScrollTrigger } from "@/lib/hooks/use-infinite-scroll-trigger";
import { cn } from "@/lib/utils";

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

const APP_LAYOUT_SYNC_EVENT = "cumt-nexus:app-layout-sync";

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
  const navigationSource = usePostNavigationSource(id);
  const commentColumnRef = useRef<HTMLDivElement | null>(null);
  const commentComposerAnchorRef = useRef<HTMLDivElement | null>(null);
  const [commentComposerFocusSignal, setCommentComposerFocusSignal] = useState(0);
  const [isCommentComposerExpanded, setIsCommentComposerExpanded] =
    useState(false);
  const [isCommentDockVisible, setIsCommentDockVisible] = useState(false);
  const [replyingCommentId, setReplyingCommentId] = useState<string | null>(null);
  const [pendingCommentId, setPendingCommentId] = useState<string | null>(null);
  const [commentDockMetrics, setCommentDockMetrics] = useState<{
    left: number;
    width: number;
  } | null>(null);
  const isAuthenticated = Boolean(token);
  const currentUserQuery = useCurrentUserQuery();
  const postQuery = usePostQuery(
    id,
    isReady,
    isAuthenticated ? undefined : initialPostData,
  );
  const canRequestComments =
    isReady && postQuery.isSuccess && Boolean(postQuery.data?.post);
  const commentsQuery = useInfinitePostCommentsQuery(
    id,
    20,
    "tree",
    initialCommentSort,
    6,
    canRequestComments,
    isAuthenticated ? undefined : initialCommentsData,
  );
  const commentPages = commentsQuery.data?.pages ?? [];
  const firstCommentPage = commentPages[0];
  const commentSortFallbackNotice = formatCommentSortFallbackNotice(
    firstCommentPage?.requested_sort,
    firstCommentPage?.effective_sort,
  );
  const post = postQuery.data?.post;
  const comments = canRequestComments ? getUniqueComments(commentPages) : [];
  const isInitialCommentsLoading =
    commentsQuery.isLoading && comments.length === 0;
  const hasNextCommentsPage = Boolean(commentsQuery.hasNextPage);
  const isFetchingNextCommentsPage = commentsQuery.isFetchingNextPage;
  const fetchNextCommentsPage = commentsQuery.fetchNextPage;
  const loadMoreComments = useCallback(() => {
    void fetchNextCommentsPage();
  }, [fetchNextCommentsPage]);
  const loadMoreRef = useInfiniteScrollTrigger({
    enabled:
      canRequestComments &&
      comments.length > 0 &&
      hasNextCommentsPage &&
      !isFetchingNextCommentsPage,
    onLoadMore: loadMoreComments,
  });
  const currentUserId = currentUserQuery.data?.id ?? null;
  const platformRole = resolvePlatformRole(currentUserQuery.data);
  const canModerate = Boolean(platformRole);
  const postCommunitySlug = post ? getPostCommunitySlug(post) : null;
  const canUseCommunityManage =
    Boolean(post) &&
    (post?.viewer_permissions?.can_moderate === true ||
      post?.viewer_permissions?.can_manage === true ||
      canAccessCommunityManagement(post?.community, platformRole) ||
      (platformRole === "owner" && Boolean(postCommunitySlug)));
  const canManagePost =
    Boolean(post) &&
    currentUserQuery.isSuccess &&
    currentUserId === post?.author_id;
  const commentCount = Math.max(post?.comment_count ?? 0, comments.length);
  const postIdForCommentDock = post?.id;
  const postBackTarget = getPostBackTarget(post, navigationSource);
  const shouldShowCommentDock = isCommentDockVisible && !replyingCommentId;

  useAppShellBackAction(postBackTarget);

  useEffect(() => {
    if (!pendingCommentId) {
      return;
    }

    const targetCommentId = pendingCommentId;
    let frame = 0;
    let attempts = 0;
    const maxAttempts = 8;

    function focusPendingComment() {
      const element = document.getElementById(getCommentElementId(targetCommentId));
      if (!element) {
        attempts += 1;
        if (attempts < maxAttempts) {
          frame = window.requestAnimationFrame(focusPendingComment);
        }
        return;
      }

      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.setAttribute("data-focus-comment", "true");
      window.setTimeout(() => {
        element.removeAttribute("data-focus-comment");
      }, 1800);
      setPendingCommentId(null);
    }

    frame = window.requestAnimationFrame(focusPendingComment);

    return () => window.cancelAnimationFrame(frame);
  }, [commentsQuery.dataUpdatedAt, pendingCommentId]);

  useEffect(() => {
    let animationFrame = 0;
    let layoutSyncFrame = 0;
    const layoutSyncTimeouts: number[] = [];

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
      const column = commentColumnRef.current;

      if (!anchor || !column) {
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

      const nextMetrics = getCommentDockMetrics(column);
      setCommentDockMetrics((currentMetrics) =>
        currentMetrics?.left === nextMetrics.left &&
        currentMetrics.width === nextMetrics.width
          ? currentMetrics
          : nextMetrics,
      );
    }

    function scheduleCommentDockUpdate() {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(updateCommentDock);
    }

    function scheduleLayoutSyncSamples() {
      scheduleCommentDockUpdate();

      window.cancelAnimationFrame(layoutSyncFrame);
      layoutSyncFrame = window.requestAnimationFrame(() => {
        scheduleCommentDockUpdate();
      });

      layoutSyncTimeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
      layoutSyncTimeouts.length = 0;
      [80, 160, 240].forEach((delay) => {
        layoutSyncTimeouts.push(
          window.setTimeout(scheduleCommentDockUpdate, delay),
        );
      });
    }

    const column = commentColumnRef.current;
    const anchor = commentComposerAnchorRef.current;
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(scheduleCommentDockUpdate);

    if (column) {
      resizeObserver?.observe(column);
    }

    if (anchor) {
      resizeObserver?.observe(anchor);
    }

    animationFrame = window.requestAnimationFrame(updateCommentDock);
    window.addEventListener("scroll", scheduleCommentDockUpdate, { passive: true });
    window.addEventListener("resize", scheduleCommentDockUpdate);
    window.addEventListener(APP_LAYOUT_SYNC_EVENT, scheduleLayoutSyncSamples);
    window.visualViewport?.addEventListener("resize", scheduleCommentDockUpdate);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.cancelAnimationFrame(layoutSyncFrame);
      layoutSyncTimeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
      resizeObserver?.disconnect();
      window.removeEventListener("scroll", scheduleCommentDockUpdate);
      window.removeEventListener("resize", scheduleCommentDockUpdate);
      window.removeEventListener(APP_LAYOUT_SYNC_EVENT, scheduleLayoutSyncSamples);
      window.visualViewport?.removeEventListener(
        "resize",
        scheduleCommentDockUpdate,
      );
    };
  }, [postIdForCommentDock]);

  function focusCommentComposer() {
    setReplyingCommentId(null);
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

  function handleCommentSubmitted(comment: Comment) {
    setReplyingCommentId(null);
    setPendingCommentId(comment.id);
  }

  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,1fr)] gap-5 pt-2 lg:grid-cols-[minmax(0,1fr)_280px]",
        shouldShowCommentDock ? "pb-24" : "pb-2",
      )}
    >
      <div ref={commentColumnRef} className="min-w-0">
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
              canUseCommunityManage={canUseCommunityManage}
              commentCount={commentCount}
              isAuthenticated={isAuthenticated}
              onCommentIntent={focusCommentComposer}
              post={post}
            />
          ) : null}
        </section>

        {post ? (
          <section
            className="mt-5 rounded-lg bg-surface p-4"
            aria-labelledby="comments-heading"
          >
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
                <CommentSortMenu
                  disabled={!canRequestComments || isInitialCommentsLoading}
                  onSortChange={(nextSort) => {
                    if (nextSort !== initialCommentSort) {
                      router.push(getCommentSortHref(pathname, nextSort));
                    }
                  }}
                  sort={initialCommentSort}
                />
              </div>
            </div>

            <div
              id="post-comment-composer"
              ref={commentComposerAnchorRef}
              className={cn(
                "mt-4 scroll-mt-32",
                shouldShowCommentDock && "min-h-20",
              )}
            >
              <div
                className={cn(
                  shouldShowCommentDock &&
                    "fixed bottom-3 z-40 rounded-md bg-surface/95 p-1 shadow-[0_12px_36px_rgba(0,0,0,0.28)] backdrop-blur sm:bottom-4",
                  shouldShowCommentDock &&
                    isCommentComposerExpanded &&
                    "rounded-lg p-2 sm:p-3",
                )}
                style={
                  shouldShowCommentDock && commentDockMetrics
                    ? {
                        left: commentDockMetrics.left,
                        width: commentDockMetrics.width,
                      }
                    : undefined
                }
              >
                <CommentForm
                  docked={shouldShowCommentDock}
                  focusSignal={commentComposerFocusSignal}
                  onExpandedChange={setIsCommentComposerExpanded}
                  onSubmitted={handleCommentSubmitted}
                  postId={id}
                />
              </div>
            </div>

            <div className="mt-4">
              {isInitialCommentsLoading ? (
                <div className="rounded-md bg-surface-raised px-4 py-4">
                  <LoadingState rows={3} />
                </div>
              ) : null}

              {commentsQuery.isError && comments.length === 0 ? (
                <div className="rounded-md bg-surface-raised px-4 py-4">
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

              {commentsQuery.isSuccess &&
              !commentsQuery.isFetching &&
              comments.length === 0 ? (
                <div className="rounded-md bg-surface-raised px-4 py-4">
                  <EmptyState
                    title="还没有评论"
                    description="发布第一条评论，让这条讨论继续展开。"
                  />
                </div>
              ) : null}

              {comments.length > 0 ? (
                <div className="space-y-3">
                  <CommentTree
                    canModerate={canModerate || canUseCommunityManage}
                    comments={comments}
                    communityModerationSlug={
                      canUseCommunityManage
                        ? (postCommunitySlug ?? undefined)
                        : undefined
                    }
                    currentUserId={currentUserId}
                    isAuthenticated={isAuthenticated}
                    maxDepth={6}
                    onCommentSubmitted={handleCommentSubmitted}
                    onReplyChange={setReplyingCommentId}
                    platformAuditEnabled={canModerate}
                    postId={id}
                    replyingTo={replyingCommentId}
                  />
                  <InfiniteListStatus
                    ref={loadMoreRef}
                    hasNextPage={hasNextCommentsPage}
                    isFetching={isFetchingNextCommentsPage}
                    loadingLabel="正在加载更多评论"
                    loadMoreLabel="加载更多评论"
                    onLoadMore={loadMoreComments}
                  />
                </div>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>

      {post ? (
        <PostRail
          post={post}
          commentCount={commentCount}
        />
      ) : null}
    </div>
  );
}

function getCommentElementId(commentId: string) {
  return `comment-${commentId}`;
}

function getUniqueComments(pages: ListCommentsResponse[]) {
  const seenCommentIds = new Set<string>();
  const comments: Comment[] = [];

  for (const page of pages) {
    for (const comment of page.comments) {
      if (seenCommentIds.has(comment.id)) {
        continue;
      }

      seenCommentIds.add(comment.id);
      comments.push(comment);
    }
  }

  return comments;
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
  sort: CommentSort,
) {
  const params = new URLSearchParams();

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

function getCommentDockMetrics(column: HTMLElement) {
  const rect = column.getBoundingClientRect();
  const horizontalInset = window.innerWidth >= 640 ? 16 : 12;
  const left = Math.max(horizontalInset, Math.round(rect.left));
  const right = Math.min(
    window.innerWidth - horizontalInset,
    Math.round(rect.right),
  );

  return {
    left,
    width: Math.max(280, right - left),
  };
}

function PostArticle({
  canManage,
  canModerate,
  canUseCommunityManage,
  commentCount,
  isAuthenticated,
  onCommentIntent,
  post,
}: {
  canManage: boolean;
  canModerate: boolean;
  canUseCommunityManage: boolean;
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

  const author = getPostAuthorIdentity(post);
  const communitySlug = getPostCommunitySlug(post);
  const communityManageHref = canUseCommunityManage && communitySlug
    ? `/communities/${encodeURIComponent(communitySlug)}/manage`
    : null;
  const authorQuery = author.slug || post.author_id;
  const canQuickModerate = canModerate || canUseCommunityManage;
  const messageShare = createMessageShareSnapshot({
    shareId: post.id,
    shareType: "post",
    snapshotCreatedAt: post.updated_at || post.created_at,
    summary: getMarkdownPlainTextSummary(post.body, ""),
    targetUrl: `/posts/${post.id}`,
    title: post.title,
  });

  return (
    <article className="grid grid-cols-[42px_minmax(0,1fr)] overflow-hidden rounded-lg bg-surface sm:grid-cols-[52px_minmax(0,1fr)]">
      <RedditVoteControl
        className={cn(
          "bg-surface-raised/75 py-3 transition-colors",
          post.my_vote === 1 && "bg-primary/10",
          post.my_vote === -1 && "bg-destructive/10",
        )}
        downvoteCount={post.downvote_count}
        myVote={post.my_vote}
        score={post.score}
        targetId={post.id}
        targetType="post"
        upvoteCount={post.upvote_count}
      />

      <div className="min-w-0">
        <header className="px-3 py-4 sm:px-4">
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

        <footer className="mx-3 mb-3 space-y-1.5 rounded-md bg-surface-raised px-3 py-2 text-xs text-muted-foreground sm:mx-4">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
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
            <DisabledMessageShareAction
              className="h-8 font-semibold"
              iconClassName="size-4"
              label="发送给好友"
              share={messageShare}
            />
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
          </div>

          {canQuickModerate ? (
            <div className="min-w-0">
              <ModerationQuickActions
                auditHref={
                  canModerate
                    ? `/admin/audit-logs?target_type=post&target_id=${encodeURIComponent(post.id)}`
                    : null
                }
                canRemove={canQuickModerate && post.status !== "removed"}
                communityManageHref={communityManageHref}
                communitySlug={canUseCommunityManage ? communitySlug : null}
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
                userHref={
                  canModerate
                    ? `/admin/users?q=${encodeURIComponent(authorQuery)}`
                    : null
                }
              />
            </div>
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
    <RightRail className="px-0 lg:pl-1">
      <RightRailSection title="所在社区">
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
      </RightRailSection>

      <RightRailSection title="作者">
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
      </RightRailSection>

      <RightRailSection title="发布时间">
        <RightRailInfoList>
          {post.status !== "visible" ? (
            <RightRailInfoRow
              columnsClassName="grid-cols-[72px_minmax(0,1fr)]"
              label="状态"
              value={formatPostStatus(post.status)}
              valueClassName="truncate text-right font-normal"
            />
          ) : null}
          <RightRailInfoRow
            columnsClassName="grid-cols-[72px_minmax(0,1fr)]"
            label="发布"
            value={formatDate(post.created_at)}
            valueClassName="truncate text-right font-normal"
          />
          {post.updated_at !== post.created_at ? (
            <RightRailInfoRow
              columnsClassName="grid-cols-[72px_minmax(0,1fr)]"
              label="更新"
              value={formatDate(post.updated_at)}
              valueClassName="truncate text-right font-normal"
            />
          ) : null}
        </RightRailInfoList>
      </RightRailSection>
    </RightRail>
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

function getPostCommunitySlug(post: Post) {
  return post.community?.slug?.trim() || post.community_slug?.trim() || null;
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

