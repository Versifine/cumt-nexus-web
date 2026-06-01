"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  FilePlus2,
  Hash,
  Home,
  LogOut,
  MessageSquare,
  User,
} from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
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
import { useLatestPostsQuery } from "@/features/post/queries";
import type { Post } from "@/features/post/types";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "最新", icon: Home, href: "/", active: true },
  { label: "社区", icon: Hash, href: "/communities" },
  { label: "申请", icon: FilePlus2, href: "/community-applications/new" },
];

const guideItems = [
  "先进入具体社区，再发布帖子。",
  "投票会改变帖子分数，取消投票会恢复状态。",
  "社区申请通过前不会创建公开社区。",
];

export function HomeShell() {
  const latestPostsQuery = useLatestPostsQuery();
  const posts = latestPostsQuery.data?.posts ?? [];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid min-h-screen w-full max-w-[1440px] grid-cols-1 lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="hidden border-r border-border bg-background px-5 py-5 lg:block">
          <Link href="/" className="block border-b border-border pb-5">
            <div className="inline-flex items-center border border-foreground bg-foreground px-2 py-1 text-xl font-black leading-none tracking-normal text-background">
              CN
            </div>
            <div className="mt-4 text-sm font-semibold">CUMT Nexus</div>
            <div className="mt-1 text-xs text-muted-foreground">校园社区索引</div>
          </Link>

          <nav className="mt-6 divide-y divide-border border-y border-border">
            {navItems.map((item, index) => (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "group flex items-center justify-between py-3 text-sm transition-colors",
                  item.active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="flex items-center gap-3">
                  <span className="w-6 font-mono text-xs text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <item.icon className="size-4" aria-hidden="true" />
                  {item.label}
                </span>
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full transition-colors",
                    item.active
                      ? "bg-primary"
                      : "bg-border group-hover:bg-muted-foreground",
                  )}
                />
              </Link>
            ))}
          </nav>

          <div className="mt-6 border border-border bg-background-soft p-3">
            <div className="font-mono text-[11px] uppercase text-muted-foreground">
              当前阶段
            </div>
            <p className="mt-2 text-sm leading-6 text-foreground">
              首版主链路已接入，下一步打磨信息流质感和真实联调。
            </p>
          </div>
        </aside>

        <section className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-20 border-b border-border bg-background/90 px-4 py-3 backdrop-blur md:px-6">
            <div className="flex items-center justify-between gap-4">
              <Link href="/" className="flex items-center gap-3 lg:hidden">
                <span className="border border-foreground bg-foreground px-2 py-1 text-sm font-black leading-none text-background">
                  CN
                </span>
                <span className="text-sm font-semibold">CUMT Nexus</span>
              </Link>

              <div className="hidden min-w-0 lg:block">
                <div className="font-mono text-xs uppercase text-muted-foreground">
                  01 / 讨论索引
                </div>
              </div>

              <div className="flex items-center gap-1 sm:gap-2">
                <TextAction href="/communities" className="hidden sm:inline-flex">
                  浏览社区
                </TextAction>
                <TextAction href="/communities" tone="primary">
                  发帖
                </TextAction>
                <HeaderAuthControls />
              </div>
            </div>
          </header>

          <div className="grid flex-1 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px]">
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="min-w-0 px-4 py-6 md:px-6"
            >
              <section className="border-b border-border pb-6">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-3xl">
                    <div className="font-mono text-xs uppercase text-primary">
                      CUMT NEXUS / 最新讨论
                    </div>
                    <h1 className="mt-4 text-5xl font-black leading-[0.95] tracking-normal text-foreground md:text-6xl 2xl:text-7xl">
                      <span className="block whitespace-nowrap">校园里的</span>
                      <span className="block whitespace-nowrap">最新讨论</span>
                    </h1>
                  </div>

                  <div className="grid grid-cols-3 border border-border text-center sm:min-w-80">
                    <MetricBlock label="帖子" value={String(posts.length)} />
                    <MetricBlock
                      label="总分"
                      value={String(posts.reduce((total, post) => total + post.score, 0))}
                    />
                    <MetricBlock label="状态" value="实时" />
                  </div>
                </div>
              </section>

              <section className="border-b border-border py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">公开社区信息流</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      来自后端最新帖子接口，按当前可见数据呈现。
                    </p>
                  </div>
                  <span className="w-fit border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-xs text-primary">
                    LIVE FEED
                  </span>
                </div>
              </section>

              <section>
                {latestPostsQuery.isLoading ? (
                  <div className="border-b border-border py-5">
                    <LoadingState rows={5} />
                  </div>
                ) : null}

                {latestPostsQuery.isError ? (
                  <div className="py-5">
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
                  </div>
                ) : null}

                {latestPostsQuery.isSuccess && posts.length === 0 ? (
                  <div className="py-5">
                    <EmptyState
                      title="还没有帖子"
                      description="公开社区开始发布内容后，最新帖子会出现在这里。"
                      action={
                        <TextAction href="/communities">去社区看看</TextAction>
                      }
                    />
                  </div>
                ) : null}

                {latestPostsQuery.isSuccess && posts.length > 0 ? (
                  <div className="divide-y divide-border border-b border-border">
                    {posts.map((post, index) => (
                      <LatestPostRow key={post.id} index={index} post={post} />
                    ))}
                  </div>
                ) : null}
              </section>
            </motion.section>

            <RightRail posts={posts} />
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
        className="h-10 w-10 animate-pulse border border-border bg-muted sm:w-28"
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

    return <TextAction href="/login">登录</TextAction>;
  }

  const user = currentUserQuery.data;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="group inline-flex h-10 max-w-44 items-center gap-2 border border-border px-2 text-sm font-semibold transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="打开用户菜单"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-xs font-semibold text-primary">
            {getUserInitial(user.username)}
          </span>
          <span className="hidden min-w-0 truncate text-sm sm:inline">
            {user.username}
          </span>
          <ChevronDown
            className="size-4 text-muted-foreground transition-transform group-hover:translate-y-0.5"
            aria-hidden="true"
          />
        </button>
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

function MetricBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-border px-3 py-4 last:border-r-0">
      <div className="font-mono text-[11px] uppercase text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-2xl font-black leading-none text-foreground">
        {value}
      </div>
    </div>
  );
}

function LatestPostRow({ index, post }: { index: number; post: Post }) {
  return (
    <Link
      href={`/posts/${post.id}`}
      className="group grid gap-4 py-5 transition-colors hover:bg-background-soft/70 md:grid-cols-[72px_minmax(0,1fr)_96px]"
    >
      <div className="flex items-center gap-3 md:block">
        <div className="font-mono text-xs text-muted-foreground">
          {String(index + 1).padStart(2, "0")}
        </div>
        <div className="mt-0 flex items-center gap-1 text-xs text-muted-foreground md:mt-4">
          <ArrowUp
            className={cn("size-3", post.my_vote === 1 ? "text-primary" : null)}
            aria-hidden="true"
          />
          <span className="font-mono">{post.upvote_count}</span>
          <ArrowDown
            className={cn("size-3", post.my_vote === -1 ? "text-primary" : null)}
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="border border-border px-2 py-0.5 font-mono">
            社区 {formatShortId(post.community_id)}
          </span>
          <span>作者 {formatShortId(post.author_id)}</span>
          <span>发布于 {formatDate(post.created_at)}</span>
        </div>
        <h2 className="mt-3 text-xl font-semibold leading-7 tracking-normal text-foreground transition-colors group-hover:text-primary">
          {post.title}
        </h2>
        <p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          {post.body}
        </p>
      </div>

      <div className="flex items-center gap-3 text-sm text-muted-foreground md:flex-col md:items-end md:justify-center">
        <span className="border border-border bg-background px-2.5 py-1 font-mono text-foreground">
          {post.score}
        </span>
        <span className="inline-flex items-center gap-1 text-xs">
          <MessageSquare className="size-3" aria-hidden="true" />
          讨论
        </span>
      </div>
    </Link>
  );
}

function RightRail({ posts }: { posts: Post[] }) {
  const topPosts = posts.slice(0, 3);

  return (
    <aside className="border-t border-border bg-background-soft/45 px-4 py-6 md:px-6 xl:border-l xl:border-t-0">
      <div className="sticky top-20 space-y-8">
        <section className="border-b border-border pb-6">
          <div className="font-mono text-xs uppercase text-muted-foreground">
            右侧上下文
          </div>
          <h2 className="mt-3 text-2xl font-black leading-tight">
            今天从最新讨论开始。
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            这里放和社区使用相关的上下文，不再展示开发状态。
          </p>
          <div className="mt-4 flex flex-col border-y border-border">
            <TextAction href="/communities" tone="primary" variant="bar">
              选择社区
            </TextAction>
            <TextAction href="/community-applications/new" variant="bar">
              申请社区
            </TextAction>
          </div>
        </section>

        <section className="border-b border-border pb-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">高分讨论</h3>
            <span className="font-mono text-xs text-muted-foreground">
              TOP {topPosts.length}
            </span>
          </div>
          {topPosts.length > 0 ? (
            <div className="divide-y divide-border">
              {topPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/posts/${post.id}`}
                  className="block py-3 transition-colors hover:text-primary"
                >
                  <div className="font-mono text-xs text-muted-foreground">
                    {post.score} 分
                  </div>
                  <div className="mt-1 line-clamp-2 text-sm font-medium">
                    {post.title}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              等待帖子数据加载后展示。
            </p>
          )}
        </section>

        <section>
          <h3 className="text-sm font-semibold">社区使用提示</h3>
          <div className="mt-3 divide-y divide-border border-y border-border">
            {guideItems.map((item, index) => (
              <div key={item} className="flex gap-3 py-3 text-sm leading-6">
                <span className="font-mono text-xs text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}

function getUserInitial(username: string) {
  return username.trim().charAt(0).toUpperCase() || "U";
}

type TextActionProps = {
  children: React.ReactNode;
  className?: string;
  href: string;
  tone?: "default" | "primary";
  variant?: "inline" | "bar";
};

function TextAction({
  children,
  className,
  href,
  tone = "default",
  variant = "inline",
}: TextActionProps) {
  const isPrimary = tone === "primary";

  if (variant === "bar") {
    return (
      <Link
        href={href}
        className={cn(
          "group relative flex items-center justify-between overflow-hidden border-b border-border py-3 text-sm font-semibold last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          className,
        )}
      >
        <span
          className={cn(
            "absolute inset-y-0 left-0 w-1 transition-all duration-200 group-hover:w-full",
            isPrimary ? "bg-primary" : "bg-foreground",
          )}
          aria-hidden="true"
        />
        <span
          className={cn(
            "relative z-10 pl-3 transition-colors",
            isPrimary
              ? "text-foreground group-hover:text-primary-foreground"
              : "text-foreground group-hover:text-background",
          )}
        >
          {children}
        </span>
        <ArrowRight
          className={cn(
            "relative z-10 mr-3 size-4 transition-transform group-hover:translate-x-1",
            isPrimary
              ? "text-primary group-hover:text-primary-foreground"
              : "text-muted-foreground group-hover:text-background",
          )}
          aria-hidden="true"
        />
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "group relative inline-flex h-10 items-center gap-2 overflow-hidden border border-border px-3 text-sm font-semibold transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      <span
        className={cn(
          "absolute inset-y-0 left-0 w-1 transition-all duration-200 group-hover:w-full",
          isPrimary ? "bg-primary" : "bg-foreground",
        )}
        aria-hidden="true"
      />
      <span
        className={cn(
          "relative z-10 inline-flex items-center gap-2 transition-colors",
          isPrimary
            ? "text-foreground group-hover:text-primary-foreground"
            : "text-foreground group-hover:text-background",
        )}
      >
        {children}
      </span>
      <span
        className={cn(
          "relative z-10 font-mono transition-colors",
          isPrimary
            ? "text-primary group-hover:text-primary-foreground"
            : "text-muted-foreground group-hover:text-background",
        )}
      >
        +
      </span>
    </Link>
  );
}

function formatShortId(value: string) {
  return value.slice(0, 8);
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
