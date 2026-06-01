"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  Bell,
  Compass,
  FilePlus2,
  Hash,
  Home,
  Plus,
  Search,
} from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApiError } from "@/lib/api/client";
import { useLatestPostsQuery } from "@/features/post/queries";
import type { Post } from "@/features/post/types";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Latest", icon: Home, href: "/", active: true },
  { label: "Communities", icon: Hash, href: "/communities" },
  { label: "Explore", icon: Compass, href: "/communities" },
  { label: "Apply", icon: FilePlus2, href: "/community-applications/new" },
];

export function HomeShell() {
  const latestPostsQuery = useLatestPostsQuery();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden border-r border-border/80 bg-background-soft/70 px-4 py-5 lg:block">
          <Link href="/" className="flex items-center gap-3 px-2">
            <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-card text-sm font-semibold text-primary">
              CN
            </div>
            <div>
              <div className="text-sm font-semibold">CUMT Nexus</div>
              <div className="text-xs text-muted-foreground">Campus community</div>
            </div>
          </Link>

          <nav className="mt-8 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  item.active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <item.icon className="size-4" aria-hidden="true" />
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <section className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-10 border-b border-border/80 bg-background/85 px-4 py-3 backdrop-blur md:px-6">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-medium text-muted-foreground">Latest</div>
                <h1 className="truncate text-xl font-semibold tracking-normal md:text-2xl">
                  Campus discussion feed
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" aria-label="Search">
                  <Search className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Notifications">
                  <Bell className="size-4" />
                </Button>
                <Button>
                  <Plus className="size-4" aria-hidden="true" />
                  New post
                </Button>
              </div>
            </div>
          </header>

          <div className="grid flex-1 grid-cols-1 gap-0 xl:grid-cols-[minmax(0,1fr)_320px]">
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="min-w-0 px-4 py-5 md:px-6"
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <CardTitle>Latest posts</CardTitle>
                      <CardDescription>
                        Visible posts from active public communities.
                      </CardDescription>
                    </div>
                    <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
                      Live
                    </span>
                  </div>
                </CardHeader>

                <CardContent>
                  {latestPostsQuery.isLoading ? <LoadingState rows={4} /> : null}

                  {latestPostsQuery.isError ? (
                    <ErrorState
                      title={getErrorTitle(latestPostsQuery.error)}
                      description={getErrorDescription(latestPostsQuery.error)}
                      action={
                        isUnauthenticated(latestPostsQuery.error) ? (
                          <Button asChild variant="outline" size="sm">
                            <Link href="/login">Sign in</Link>
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => latestPostsQuery.refetch()}
                          >
                            Retry
                          </Button>
                        )
                      }
                    />
                  ) : null}

                  {latestPostsQuery.isSuccess &&
                  latestPostsQuery.data.posts.length === 0 ? (
                    <EmptyState
                      title="No posts yet"
                      description="Latest public posts will appear here once communities start publishing."
                    />
                  ) : null}

                  {latestPostsQuery.isSuccess &&
                  latestPostsQuery.data.posts.length > 0 ? (
                    <div className="divide-y divide-border">
                      {latestPostsQuery.data.posts.map((post) => (
                        <LatestPostRow key={post.id} post={post} />
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </motion.section>

            <aside className="border-t border-border bg-background-soft/60 px-4 py-5 md:px-6 xl:border-l xl:border-t-0">
              <div className="rounded-xl border border-border bg-card p-4">
                <h2 className="text-sm font-semibold">Workspace state</h2>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Design system</span>
                    <span className="text-primary">Ready</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">API client</span>
                    <span className="text-muted-foreground">Next</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Auth flow</span>
                    <span className="text-muted-foreground">Next</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

function LatestPostRow({ post }: { post: Post }) {
  return (
    <Link
      href={`/posts/${post.id}`}
      className="block px-1 py-4 transition-colors first:pt-0 last:pb-0 hover:text-primary"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-foreground">{post.title}</h2>
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{post.body}</p>
          <p className="mt-3 text-xs text-muted-foreground">
            Created {formatDate(post.created_at)}
          </p>
        </div>
        <div className="shrink-0 rounded-lg border border-border bg-background-soft px-2.5 py-1 text-xs text-muted-foreground">
          {post.score}
        </div>
      </div>
    </Link>
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

  return "Could not load latest posts";
}

function getErrorDescription(error: Error | null) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "Request failed. Please try again.";
}
