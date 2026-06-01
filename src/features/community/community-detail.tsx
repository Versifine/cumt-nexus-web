"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  MessageSquare,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApiError } from "@/lib/api/client";
import { useCommunityPostsQuery } from "@/features/post/queries";
import type { Post } from "@/features/post/types";

import { useCommunityQuery } from "./queries";

type CommunityDetailProps = {
  slug: string;
};

export function CommunityDetail({ slug }: CommunityDetailProps) {
  const communityQuery = useCommunityQuery(slug);
  const postsQuery = useCommunityPostsQuery(slug);
  const community = communityQuery.data?.community;

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground md:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <Link
          href="/communities"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Communities
        </Link>

        <section className="mt-6">
          {communityQuery.isLoading ? (
            <LoadingState rows={1} />
          ) : communityQuery.isError ? (
            <ErrorState
              title={getErrorTitle(communityQuery.error, "Could not load community")}
              description={getErrorDescription(communityQuery.error)}
              action={
                isUnauthenticated(communityQuery.error) ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href="/login">Sign in</Link>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => communityQuery.refetch()}
                  >
                    Retry
                  </Button>
                )
              }
            />
          ) : community ? (
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <CardTitle className="text-2xl">{community.name}</CardTitle>
                    <CardDescription className="mt-2 flex flex-wrap items-center gap-2">
                      <span>/{community.slug}</span>
                      <Badge
                        variant={
                          community.kind === "system"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {community.kind}
                      </Badge>
                      <Badge variant="outline">
                        {community.visibility}
                      </Badge>
                    </CardDescription>
                  </div>
                  <Button asChild>
                    <Link href={`/communities/${slug}/new`}>New post</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {community.description || "No description yet."}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </section>

        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Posts</h2>
              <p className="text-sm text-muted-foreground">
                Latest visible posts in this community.
              </p>
            </div>
          </div>

          {postsQuery.isLoading ? <LoadingState rows={4} /> : null}

          {postsQuery.isError ? (
            <ErrorState
              title={getErrorTitle(postsQuery.error, "Could not load posts")}
              description={getErrorDescription(postsQuery.error)}
              action={
                isUnauthenticated(postsQuery.error) ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href="/login">Sign in</Link>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => postsQuery.refetch()}
                  >
                    Retry
                  </Button>
                )
              }
            />
          ) : null}

          {postsQuery.isSuccess && postsQuery.data.posts.length === 0 ? (
            <EmptyState
              title="No posts yet"
              description="Visible posts from this board will appear here."
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href={`/communities/${slug}/new`}>Create post</Link>
                </Button>
              }
            />
          ) : null}

          {postsQuery.isSuccess && postsQuery.data.posts.length > 0 ? (
            <div className="grid gap-3">
              {postsQuery.data.posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function PostCard({ post }: { post: Post }) {
  return (
    <Card className="transition-colors hover:border-border/80 hover:bg-card/90">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="truncate text-base">{post.title}</CardTitle>
            <CardDescription className="mt-2">
              Created {formatDate(post.created_at)}
            </CardDescription>
          </div>
          <Badge variant={post.my_vote === 1 ? "default" : "secondary"}>
            {post.score}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{post.body}</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <ThumbsUp className="size-4" aria-hidden="true" />
              {post.upvote_count}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ThumbsDown className="size-4" aria-hidden="true" />
              {post.downvote_count}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MessageSquare className="size-4" aria-hidden="true" />
              Comments
            </span>
          </div>
          <Link
            href={`/posts/${post.id}`}
            className="inline-flex items-center gap-1 text-primary transition-colors hover:text-primary/80"
          >
            Open
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
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
    return "Sign in required";
  }

  return fallback;
}

function getErrorDescription(error: Error | null) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "Request failed. Please try again.";
}
