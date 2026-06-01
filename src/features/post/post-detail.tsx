"use client";

import Link from "next/link";
import { ArrowLeft, MessageSquare } from "lucide-react";

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
import { CommentForm } from "@/features/comment/comment-form";
import { usePostCommentsQuery } from "@/features/comment/queries";
import type { Comment } from "@/features/comment/types";
import { VoteControl } from "@/features/vote/vote-control";

import { usePostQuery } from "./queries";

type PostDetailProps = {
  id: string;
};

export function PostDetail({ id }: PostDetailProps) {
  const postQuery = usePostQuery(id);
  const commentsQuery = usePostCommentsQuery(id);
  const post = postQuery.data?.post;

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground md:px-6">
      <div className="mx-auto w-full max-w-4xl">
        <Link
          href="/communities"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back
        </Link>

        <section className="mt-6">
          {postQuery.isLoading ? (
            <LoadingState rows={1} />
          ) : postQuery.isError ? (
            <ErrorState
              title={getErrorTitle(postQuery.error, "Could not load post")}
              description={getErrorDescription(postQuery.error)}
              action={
                isUnauthenticated(postQuery.error) ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href="/login">Sign in</Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => postQuery.refetch()}>
                    Retry
                  </Button>
                )
              }
            />
          ) : post ? (
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <CardTitle className="text-2xl">{post.title}</CardTitle>
                    <CardDescription className="mt-2">
                      Created {formatDate(post.created_at)}
                    </CardDescription>
                  </div>
                  <Badge variant={post.my_vote === 1 ? "default" : "secondary"}>
                    score {post.score}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                  {post.body}
                </p>
                <div className="mt-5 flex flex-col gap-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                  <VoteControl
                    postId={post.id}
                    upvoteCount={post.upvote_count}
                    downvoteCount={post.downvote_count}
                    score={post.score}
                    myVote={post.my_vote}
                  />
                  <span className="inline-flex items-center gap-1.5">
                    <MessageSquare className="size-4" aria-hidden="true" />
                    Comments
                  </span>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </section>

        <section className="mt-6 grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Comment</CardTitle>
              <CardDescription>
                Add a visible comment to this post.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CommentForm postId={id} />
            </CardContent>
          </Card>

          <div>
            <div className="mb-3">
              <h2 className="text-lg font-semibold">Comments</h2>
              <p className="text-sm text-muted-foreground">
                Latest visible comments on this post.
              </p>
            </div>

            {commentsQuery.isLoading ? <LoadingState rows={3} /> : null}

            {commentsQuery.isError ? (
              <ErrorState
                title="Could not load comments"
                description={getErrorDescription(commentsQuery.error)}
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => commentsQuery.refetch()}
                  >
                    Retry
                  </Button>
                }
              />
            ) : null}

            {commentsQuery.isSuccess && commentsQuery.data.comments.length === 0 ? (
              <EmptyState
                title="No comments yet"
                description="Be the first to add a comment."
              />
            ) : null}

            {commentsQuery.isSuccess && commentsQuery.data.comments.length > 0 ? (
              <div className="grid gap-3">
                {commentsQuery.data.comments.map((comment) => (
                  <CommentCard key={comment.id} comment={comment} />
                ))}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function CommentCard({ comment }: { comment: Comment }) {
  return (
    <Card>
      <CardContent>
        <p className="whitespace-pre-wrap text-sm leading-6">{comment.body}</p>
        <p className="mt-3 text-xs text-muted-foreground">
          Created {formatDate(comment.created_at)}
        </p>
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
