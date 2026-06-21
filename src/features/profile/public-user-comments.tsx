"use client";

import { useCallback, type ReactNode } from "react";
import Link from "next/link";
import { CornerDownRight, MessageSquare, User as UserIcon } from "lucide-react";

import { rememberPostNavigationSource } from "@/components/app-shell/post-navigation-source";
import {
  RightRailRaisedList,
  RightRailSection,
} from "@/components/app-shell/right-rail";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { InfiniteListStatus } from "@/components/feedback/infinite-list-status";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { TextAction } from "@/components/ui/text-action";
import { useAuthSession } from "@/features/auth/auth-session";
import { CommentEffectMenu } from "@/features/comment/comment-effect-menu";
import { CommentEffectSummary } from "@/features/comment/comment-effect-summary";
import { useInfiniteUserCommentsQuery } from "@/features/comment/queries";
import type { Comment, ListCommentsResponse } from "@/features/comment/types";
import {
  CommunityHoverPreview,
  type CommunityHoverIdentity,
} from "@/features/community/community-hover-card";
import { ContentBody } from "@/features/content/content-body";
import { getMarkdownPlainTextSummary } from "@/features/content/markdown-summary";
import {
  UserHoverPreview,
  type UserHoverIdentity,
} from "@/features/profile/user-hover-card";
import { AuthorRoleBadges } from "@/features/profile/author-role-badges";
import { UserInlineIdentity } from "@/features/profile/user-identity-marks";
import { RedditVoteControl } from "@/features/vote/reddit-vote-control";
import { ApiError } from "@/lib/api/client";
import { useInfiniteScrollTrigger } from "@/lib/hooks/use-infinite-scroll-trigger";

import {
  PublicUserLayout,
  formatDate,
} from "./public-user-layout";
import { usePublicUserQuery } from "./queries";
import type { GetPublicUserResponse, PublicUser } from "./types";

type PublicUserCommentsProps = {
  initialCommentsData?: ListCommentsResponse;
  initialProfileData?: GetPublicUserResponse;
  username: string;
};

type CommentContext = {
  community: CommunityHoverIdentity | null;
  postHref: string;
  postId: string;
  postMeta: string | null;
  postTitle: string | null;
};

export function PublicUserComments({
  initialCommentsData,
  initialProfileData,
  username,
}: PublicUserCommentsProps) {
  const { isReady, token } = useAuthSession();
  const profileQuery = usePublicUserQuery(username, isReady, initialProfileData);
  const user = profileQuery.data?.user;
  const canRequestComments = isReady && profileQuery.isSuccess && Boolean(user);
  const commentsQuery = useInfiniteUserCommentsQuery(
    username,
    20,
    canRequestComments,
    token ? undefined : initialCommentsData,
  );
  const commentPages = commentsQuery.data?.pages ?? [];
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

  if (!isReady || profileQuery.isPending) {
    return (
      <div className="py-4">
        <section className="bg-background p-4">
          <LoadingState rows={4} />
        </section>
      </div>
    );
  }

  if (profileQuery.isError) {
    return (
      <div className="py-4">
        <section className="bg-background p-4">
          {isNotFound(profileQuery.error) ? (
            <EmptyState
              title="没有找到这个用户"
              description="这个用户名不存在，或该账号当前不可公开访问。"
              action={
                <TextAction href="/communities" tone="primary">
                  浏览社区
                </TextAction>
              }
            />
          ) : (
            <ErrorState
              title={getErrorTitle(profileQuery.error, "无法加载用户主页")}
              description={getErrorDescription(profileQuery.error)}
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => profileQuery.refetch()}
                >
                  重试
                </Button>
              }
            />
          )}
        </section>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <PublicUserLayout
      activeTab="comments"
      railContent={<UserCommentsRail comments={comments} user={user} />}
      user={user}
    >
      <section className="bg-background">
        <div className="border-b border-border py-3">
          <h2 className="text-sm font-semibold text-foreground">公开评论</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            已加载 {comments.length} 条 / 共 {user.stats.comment_count} 条
          </p>
        </div>

        {isInitialCommentsLoading ? (
          <div className="p-4">
            <LoadingState rows={5} />
          </div>
        ) : null}

        {commentsQuery.isError && comments.length === 0 ? (
          <div className="p-4">
            <ErrorState
              title={getErrorTitle(commentsQuery.error, "无法加载公开评论")}
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
          </div>
        ) : null}

        {commentsQuery.isSuccess &&
        !commentsQuery.isFetching &&
        comments.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="还没有公开评论"
              description="这个用户还没有留下可公开浏览的评论。"
              action={
                <TextAction href="/communities" tone="primary">
                  浏览社区
                </TextAction>
              }
            />
          </div>
        ) : null}

        {comments.length > 0 ? (
          <>
            {comments.map((comment) => (
              <UserCommentRow
                key={comment.id}
                comment={comment}
                isAuthenticated={Boolean(token)}
                user={user}
              />
            ))}
            <InfiniteListStatus
              ref={loadMoreRef}
              className="mt-2"
              hasNextPage={hasNextCommentsPage}
              isFetching={isFetchingNextCommentsPage}
              loadingLabel="正在加载更多评论"
              loadMoreLabel="加载更多评论"
              onLoadMore={loadMoreComments}
            />
          </>
        ) : null}
      </section>
    </PublicUserLayout>
  );
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

function UserCommentRow({
  comment,
  isAuthenticated,
  user,
}: {
  comment: Comment;
  isAuthenticated: boolean;
  user: PublicUser;
}) {
  const context = getCommentContext(comment);
  const replyCount = comment.reply_count ?? 0;
  const sourceHref = `/users/${encodeURIComponent(user.username)}/comments`;
  const sourceLabel = `返回 @${user.username} 的评论`;
  const authorName = getAuthorLabel(comment, user);

  function rememberSource() {
    rememberPostNavigationSource({
      href: sourceHref,
      label: sourceLabel,
      postId: context.postId,
    });
  }

  return (
    <article className="grid grid-cols-[42px_minmax(0,1fr)] border-b border-border bg-background sm:grid-cols-[48px_minmax(0,1fr)]">
      <RedditVoteControl
        className="py-3"
        downvoteCount={comment.downvote_count ?? 0}
        mode="column"
        myVote={comment.my_vote ?? 0}
        postId={context.postId}
        score={getCommentScore(comment)}
        targetId={comment.id}
        targetType="comment"
        upvoteCount={comment.upvote_count ?? 0}
      />

      <div className="grid min-w-0 grid-cols-[32px_minmax(0,1fr)] gap-3 px-3 py-3 sm:px-4">
        <CommentAuthorAvatar
          comment={comment}
          name={authorName}
          user={user}
        />

        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5 text-muted-foreground">
            <CommentAuthorName comment={comment} user={user} />
            <UserInlineIdentity
              level={comment.author?.progression ?? comment.author?.level}
              title={
                comment.author?.progression?.active_title?.name ??
                comment.author?.display_title
              }
              username={comment.author?.username ?? user.username}
              size="xs"
            />
            <AuthorRoleBadges source={comment.author} size="xs" />
            <span aria-hidden="true">·</span>
            <span>{formatDate(comment.created_at)}</span>
            {comment.status !== "visible" ? (
              <>
                <span aria-hidden="true">·</span>
                <span>{formatCommentStatus(comment.status)}</span>
              </>
            ) : null}
          </div>

          <div className="mt-2 rounded-md bg-background-soft px-3 py-2 ring-1 ring-border/60">
            <Link
              href={context.postHref}
              onClick={rememberSource}
              className="line-clamp-2 text-sm font-semibold leading-6 text-foreground transition-colors hover:text-primary"
            >
              {context.postTitle || "关联原帖"}
            </Link>
            {context.postMeta || context.community ? (
              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5 text-muted-foreground">
                {context.postMeta ? <span>{context.postMeta}</span> : null}
                {context.community ? (
                  <>
                    {context.postMeta ? <span aria-hidden="true">·</span> : null}
                    <CommentCommunityLink community={context.community} />
                  </>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="mt-3">
            <ContentBody
              attachments={comment.attachments}
              value={comment.body}
              className="text-sm leading-7 text-muted-foreground"
            />
          </div>

          <CommentEffectSummary effects={comment.effects} />

          <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            <PostActionLink href={context.postHref} onClick={rememberSource}>
              <CornerDownRight className="size-4" aria-hidden="true" />
              查看原帖
            </PostActionLink>
            {replyCount > 0 ? (
              <span className="inline-flex h-8 items-center gap-1.5 px-2 font-semibold">
                <MessageSquare className="size-4" aria-hidden="true" />
                {replyCount} 条回复
              </span>
            ) : null}
            <CommentEffectMenu
              commentId={comment.id}
              isAuthenticated={isAuthenticated}
              postId={context.postId}
              userCommentsUsername={user.username}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

function CommentAuthorName({
  comment,
  user,
}: {
  comment: Comment;
  user: PublicUser;
}) {
  const authorName = getAuthorLabel(comment, user);
  const authorHref = getAuthorHref(comment, user);
  const hoverUser = getAuthorHoverIdentity(comment, user);
  const className =
    "min-w-0 truncate font-semibold text-foreground transition-colors hover:text-primary";

  if (authorHref) {
    return (
      <UserHoverPreview
        className="min-w-0"
        user={hoverUser}
        panelClassName="w-[17.5rem]"
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
      panelClassName="w-[17.5rem]"
    >
      <span className={className}>{authorName}</span>
    </UserHoverPreview>
  );
}

function CommentAuthorAvatar({
  comment,
  name,
  user,
}: {
  comment: Comment;
  name: string;
  user: PublicUser;
}) {
  const avatarUrl = getAuthorAvatarUrl(comment, user);
  const authorHref = getAuthorHref(comment, user);
  const hoverUser = getAuthorHoverIdentity(comment, user);
  const avatar = <CommentAuthorAvatarVisual avatarUrl={avatarUrl} name={name} />;

  if (authorHref) {
    return (
      <UserHoverPreview user={hoverUser} panelClassName="w-[17.5rem]">
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
    <UserHoverPreview user={hoverUser} panelClassName="w-[17.5rem]">
      {avatar}
    </UserHoverPreview>
  );
}

function CommentAuthorAvatarVisual({
  avatarUrl,
  name,
}: {
  avatarUrl: string;
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
      className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-primary"
      aria-label={`${name} 的头像占位`}
    >
      <UserIcon className="size-4" aria-hidden="true" />
    </span>
  );
}

function CommentCommunityLink({
  community,
}: {
  community: CommunityHoverIdentity;
}) {
  const label = community.label || community.name || "社区";
  const className =
    "font-semibold text-muted-foreground transition-colors hover:text-primary";

  if (community.href) {
    return (
      <CommunityHoverPreview community={community} panelClassName="w-[18rem]">
        <Link href={community.href} className={className}>
          {label}
        </Link>
      </CommunityHoverPreview>
    );
  }

  return (
    <CommunityHoverPreview community={community} panelClassName="w-[18rem]">
      <span className={className}>{label}</span>
    </CommunityHoverPreview>
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
      className="inline-flex h-8 items-center gap-1.5 px-1 font-semibold transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {children}
    </Link>
  );
}

function UserCommentsRail({
  comments,
  user,
}: {
  comments: Comment[];
  user: PublicUser;
}) {
  const totalScore = comments.reduce(
    (total, comment) => total + getCommentScore(comment),
    0,
  );
  const topComments = [...comments]
    .sort((left, right) => getCommentScore(right) - getCommentScore(left))
    .slice(0, 3);

  return (
    <>
      <RightRailSection title="评论上下文">
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          已加载{" "}
          <span className="font-mono text-foreground">{comments.length}</span>{" "}
          条公开评论，合计{" "}
          <span className="font-mono text-foreground">{totalScore}</span> 分。
        </p>
      </RightRailSection>

      <RightRailSection title="高分评论" meta={topComments.length}>
        {topComments.length > 0 ? (
          <RightRailRaisedList>
            {topComments.map((comment) => {
              const context = getCommentContext(comment);

              return (
                <Link
                  key={comment.id}
                  href={context.postHref}
                  onClick={() =>
                    rememberPostNavigationSource({
                      href: `/users/${encodeURIComponent(user.username)}/comments`,
                      label: `返回 ${getPublicUserDisplayName(user)} 的评论`,
                      postId: context.postId,
                    })
                  }
                  className="block px-3 py-2.5 transition-colors first:rounded-t-md last:rounded-b-md hover:bg-surface-hover hover:text-primary"
                >
                  <div className="font-mono text-xs text-muted-foreground">
                    {getCommentScore(comment)} 分 ·{" "}
                    {context.postTitle ? "关联帖子" : "关联原帖"}
                  </div>
                  <div className="mt-1 line-clamp-2 text-sm font-medium">
                    {context.postTitle ||
                      getMarkdownPlainTextSummary(comment.body, "查看原帖")}
                  </div>
                </Link>
              );
            })}
          </RightRailRaisedList>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            暂无可展示的公开评论。
          </p>
        )}
      </RightRailSection>
    </>
  );
}

function getCommentContext(comment: Comment): CommentContext {
  const postId = getPostId(comment);
  const postTitle =
    comment.post?.title?.trim() || comment.post_title?.trim() || null;
  const postHref =
    normalizeInternalHref(comment.permalink) ||
    normalizeInternalHref(comment.post?.url) ||
    `/posts/${encodeURIComponent(postId)}`;
  const communitySlug =
    comment.community?.slug?.trim() || comment.post?.community_slug?.trim() || "";
  const communityName =
    comment.community?.name?.trim() || comment.post?.community_name?.trim() || "";
  const communityLabel = communitySlug
    ? `/${communitySlug}`
    : communityName || null;
  const communityHref = communitySlug
    ? `/communities/${encodeURIComponent(communitySlug)}`
    : null;
  const community = communityLabel
    ? {
        href: communityHref,
        label: communityLabel,
        name: communityName || communityLabel,
        slug: communitySlug,
      }
    : null;

  return {
    community,
    postHref,
    postId,
    postMeta: postTitle ? "关联帖子" : null,
    postTitle,
  };
}

function getPostId(comment: Comment) {
  return comment.post?.id?.trim() || comment.post_id;
}

function normalizeInternalHref(value?: string | null) {
  const href = value?.trim();

  if (!href || !href.startsWith("/") || href.startsWith("//")) {
    return null;
  }

  return href;
}

function getAuthorLabel(comment: Comment, user: PublicUser) {
  const author = comment.author;

  if (author?.display_name?.trim()) {
    return author.display_name.trim();
  }

  if (user.display_name?.trim()) {
    return user.display_name.trim();
  }

  return author?.username?.trim() || user.username?.trim() || "用户";
}

function getAuthorAvatarUrl(comment: Comment, user: PublicUser) {
  return comment.author?.avatar_url?.trim() || user.avatar_url?.trim() || "";
}

function getAuthorHref(comment: Comment, user: PublicUser) {
  const username = comment.author?.username?.trim() || user.username?.trim();

  return username ? `/users/${encodeURIComponent(username)}` : null;
}

function getAuthorHoverIdentity(
  comment: Comment,
  user: PublicUser,
): UserHoverIdentity {
  const author = comment.author;
  const username = author?.username?.trim() || user.username?.trim() || "";
  const isPublicUser = username === user.username?.trim();
  const userProgression = user.progression ?? user.level ?? null;

  return {
    avatarUrl: author?.avatar_url?.trim() || user.avatar_url?.trim() || "",
    badges:
      author?.badges && author.badges.length > 0
        ? author.badges.filter(Boolean)
        : user.badges,
    bannerUrl: isPublicUser ? user.banner_url?.trim() || "" : "",
    displayTitle:
      author?.progression?.active_title?.name?.trim() ||
      author?.display_title?.trim() ||
      (isPublicUser
        ? userProgression?.active_title?.name?.trim() ||
          user.display_title?.trim() ||
          null
        : null),
    displayName: getAuthorLabel(comment, user),
    followerCount: isPublicUser ? user.stats.follower_count : undefined,
    followingCount: isPublicUser ? user.stats.following_count : undefined,
    headline: author?.headline?.trim() || user.headline?.trim() || "",
    level: author?.progression ?? author?.level ?? (isPublicUser ? userProgression : null),
    roles: getCommentAuthorPlatformRoles(comment, user, isPublicUser),
    username,
  };
}

function getCommentAuthorPlatformRoles(
  comment: Comment,
  user: PublicUser,
  isPublicUser: boolean,
) {
  const platformRole =
    comment.author?.platform_role?.trim() ||
    (isPublicUser ? user.platform_role?.trim() : "");

  if (platformRole) {
    return [platformRole];
  }

  if (comment.author?.is_platform_staff || (isPublicUser && user.is_platform_staff)) {
    return ["staff"];
  }

  return [];
}

function getPublicUserDisplayName(user: PublicUser) {
  return user.display_name?.trim() || user.username?.trim() || "用户";
}

function getCommentScore(comment: Comment) {
  if (typeof comment.score === "number") {
    return comment.score;
  }

  return (comment.upvote_count ?? 0) - (comment.downvote_count ?? 0);
}

function formatCommentStatus(status: string) {
  switch (status) {
    case "visible":
      return "可见";
    case "deleted":
      return "已删除";
    case "removed":
      return "已移除";
    default:
      return status;
  }
}

function isNotFound(error: Error | null) {
  return error instanceof ApiError && error.code === "not_found";
}

function isUnauthenticated(error: Error | null) {
  return error instanceof ApiError && error.code === "unauthenticated";
}

function getErrorTitle(error: Error | null, fallback: string) {
  if (isUnauthenticated(error)) {
    return "公开用户评论暂不可读";
  }

  return fallback;
}

function getErrorDescription(error: Error | null) {
  if (isUnauthenticated(error)) {
    return "这个用户的公开评论暂时无法读取。可以先登录，或稍后再试。";
  }

  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}
