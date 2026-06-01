"use client";

import Link from "next/link";
import { ArrowRight, Hash, Lock, Plus } from "lucide-react";

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

import { useCommunitiesQuery } from "./queries";
import type { Community } from "./types";

export function CommunityList() {
  const communitiesQuery = useCommunitiesQuery();

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground md:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-6 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm font-medium text-muted-foreground">Communities</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal">
              Browse campus boards
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Active public communities from the CUMT Nexus API.
            </p>
          </div>
          <Button asChild>
            <Link href="/community-applications/new">
              <Plus className="size-4" aria-hidden="true" />
              Apply
            </Link>
          </Button>
        </header>

        {communitiesQuery.isLoading ? <LoadingState rows={4} /> : null}

        {communitiesQuery.isError ? (
          <ErrorState
            title={getErrorTitle(communitiesQuery.error)}
            description={getErrorDescription(communitiesQuery.error)}
            action={
              isUnauthenticated(communitiesQuery.error) ? (
                <Button asChild variant="outline" size="sm">
                  <Link href="/login">Sign in</Link>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => communitiesQuery.refetch()}
                >
                  Retry
                </Button>
              )
            }
          />
        ) : null}

        {communitiesQuery.isSuccess &&
        communitiesQuery.data.communities.length === 0 ? (
          <EmptyState
            title="No communities yet"
            description="Once active public communities exist, they will appear here."
          />
        ) : null}

        {communitiesQuery.isSuccess &&
        communitiesQuery.data.communities.length > 0 ? (
          <div className="grid gap-3">
            {communitiesQuery.data.communities.map((community) => (
              <CommunityCard key={community.id} community={community} />
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}

function CommunityCard({ community }: { community: Community }) {
  return (
    <Card className="transition-colors hover:border-border/80 hover:bg-card/90">
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2">
            <Hash className="size-4 text-primary" aria-hidden="true" />
            <span className="truncate">{community.name}</span>
          </CardTitle>
          <CardDescription className="mt-2 flex flex-wrap items-center gap-2">
            <span>/{community.slug}</span>
            <Badge variant={community.kind === "system" ? "default" : "secondary"}>
              {community.kind}
            </Badge>
            <Badge variant="outline">{community.visibility}</Badge>
          </CardDescription>
        </div>
        {community.status === "active" ? (
          <Badge variant="success">active</Badge>
        ) : (
          <Badge variant="warning">{community.status}</Badge>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {community.description || "No description yet."}
        </p>
        <div className="mt-4 flex items-center justify-between gap-3 text-sm">
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <Lock className="size-4" aria-hidden="true" />
            Created {formatDate(community.created_at)}
          </span>
          <Link
            href={`/communities/${community.slug}`}
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

function getErrorTitle(error: Error | null) {
  if (isUnauthenticated(error)) {
    return "Sign in required";
  }

  return "Could not load communities";
}

function getErrorDescription(error: Error | null) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "Request failed. Please try again.";
}
