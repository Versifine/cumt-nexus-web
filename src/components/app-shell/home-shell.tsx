"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  Bell,
  ChevronDown,
  Compass,
  FilePlus2,
  Hash,
  Home,
  LogOut,
  Plus,
  Search,
  User,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthSession } from "@/features/auth/auth-session";
import { useCurrentUserQuery } from "@/features/auth/queries";
import { ApiError } from "@/lib/api/client";
import { useLatestPostsQuery } from "@/features/post/queries";
import type { Post } from "@/features/post/types";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "最新", icon: Home, href: "/", active: true },
  { label: "社区", icon: Hash, href: "/communities" },
  { label: "探索", icon: Compass, href: "/communities" },
  { label: "申请", icon: FilePlus2, href: "/community-applications/new" },
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
              <div className="text-xs text-muted-foreground">校园社区</div>
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
                <div className="text-sm font-medium text-muted-foreground">最新</div>
                <h1 className="truncate text-xl font-semibold tracking-normal md:text-2xl">
                  校园讨论流
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" aria-label="搜索">
                  <Search className="size-4" />
                </Button>
                <Button
                  className="hidden sm:inline-flex"
                  variant="ghost"
                  size="icon"
                  aria-label="通知"
                >
                  <Bell className="size-4" />
                </Button>
                <Button asChild>
                  <Link href="/communities">
                    <Plus className="size-4" aria-hidden="true" />
                    <span className="hidden sm:inline">发帖</span>
                  </Link>
                </Button>
                <HeaderAuthControls />
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
                      <CardTitle>最新帖子</CardTitle>
                      <CardDescription>
                        来自公开活跃社区的可见帖子。
                      </CardDescription>
                    </div>
                    <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
                      实时
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
                            <Link href="/login">登录</Link>
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => latestPostsQuery.refetch()}
                          >
                            重试
                          </Button>
                        )
                      }
                    />
                  ) : null}

                  {latestPostsQuery.isSuccess &&
                  latestPostsQuery.data.posts.length === 0 ? (
                    <EmptyState
                      title="还没有帖子"
                      description="公开社区开始发布内容后，最新帖子会出现在这里。"
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
                <h2 className="text-sm font-semibold">工作区状态</h2>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">设计系统</span>
                    <span className="text-primary">已就绪</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">API 客户端</span>
                    <span className="text-muted-foreground">已接入</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">登录态</span>
                    <span className="text-muted-foreground">已接入</span>
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

function HeaderAuthControls() {
  const router = useRouter();
  const { clearSession, isReady, token } = useAuthSession();
  const currentUserQuery = useCurrentUserQuery();

  const signOut = () => {
    clearSession();
    router.push("/login");
  };

  if (!isReady || (token && currentUserQuery.isLoading)) {
    return (
      <div
        className="h-10 w-10 animate-pulse rounded-lg border border-border bg-muted sm:w-28"
        aria-label="正在加载用户"
      />
    );
  }

  if (!token || !currentUserQuery.data) {
    if (token && currentUserQuery.isError) {
      return (
        <Button variant="outline" onClick={() => currentUserQuery.refetch()}>
          重试
        </Button>
      );
    }

    return (
      <Button asChild variant="outline">
        <Link href="/login">登录</Link>
      </Button>
    );
  }

  const user = currentUserQuery.data;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-10 max-w-44 gap-2 px-2"
          aria-label="打开用户菜单"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-xs font-semibold text-primary">
            {getUserInitial(user.username)}
          </span>
          <span className="hidden min-w-0 truncate text-sm sm:inline">
            {user.username}
          </span>
          <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <span className="block truncate text-sm text-foreground">
            {user.username}
          </span>
          <span className="mt-1 block text-xs font-normal text-muted-foreground">
            {user.status}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/communities">
            <Hash className="size-4" aria-hidden="true" />
            社区
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/community-applications/new">
            <User className="size-4" aria-hidden="true" />
            申请社区
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={signOut}>
          <LogOut className="size-4" aria-hidden="true" />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function getUserInitial(username: string) {
  return username.trim().charAt(0).toUpperCase() || "U";
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
            发布于 {formatDate(post.created_at)}
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
  return new Intl.DateTimeFormat("zh-CN", {
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
    return "需要登录";
  }

  return "无法加载最新帖子";
}

function getErrorDescription(error: Error | null) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}
