"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ClipboardCheck,
  Hash,
  Home,
  LogOut,
  Menu,
  Search,
  Send,
  ShieldAlert,
  User,
  X,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { TextAction } from "@/components/ui/text-action";
import { useAuthSession } from "@/features/auth/auth-session";
import { useCurrentUserQuery } from "@/features/auth/queries";
import { cn } from "@/lib/utils";

import {
  readRecentCommunities,
  type RecentCommunity,
} from "./recent-communities";

type AppShellProps = {
  children: ReactNode;
  className?: string;
  contextLabel: string;
};

const primaryNavItems = [
  { href: "/", icon: Home, label: "首页" },
  { href: "/communities", icon: Hash, label: "社区" },
];

export function AppShell({ children, className, contextLabel }: AppShellProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [recentCommunities, setRecentCommunities] = useState<RecentCommunity[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    function syncRecentCommunities() {
      setRecentCommunities(readRecentCommunities());
    }

    syncRecentCommunities();
    window.addEventListener(
      "cumt-nexus:recent-communities-changed",
      syncRecentCommunities,
    );
    window.addEventListener("storage", syncRecentCommunities);

    return () => {
      window.removeEventListener(
        "cumt-nexus:recent-communities-changed",
        syncRecentCommunities,
      );
      window.removeEventListener("storage", syncRecentCommunities);
    };
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid min-h-screen w-full max-w-[1440px] grid-cols-1 lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="hidden border-r border-border bg-background px-5 py-5 lg:block">
          <ShellBrand />
          <ShellNav pathname={pathname} recentCommunities={recentCommunities} />
        </aside>

        <section className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-20 border-b border-border bg-background/90 px-3 py-3 backdrop-blur md:px-4 lg:px-6">
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 lg:grid-cols-[minmax(120px,180px)_minmax(260px,1fr)_auto] lg:gap-4">
              <button
                type="button"
                className="inline-flex size-10 items-center justify-center border border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:hidden"
                aria-label={isMobileNavOpen ? "收起导航" : "打开导航"}
                aria-expanded={isMobileNavOpen}
                onClick={() => setIsMobileNavOpen((value) => !value)}
              >
                {isMobileNavOpen ? (
                  <X className="size-4" aria-hidden="true" />
                ) : (
                  <Menu className="size-4" aria-hidden="true" />
                )}
              </button>

              <div className="hidden min-w-0 lg:block">
                <div className="font-mono text-xs uppercase text-muted-foreground">
                  {contextLabel}
                </div>
              </div>

              <TopSearch />
              <TopActions />
            </div>

            {isMobileNavOpen ? (
              <div className="mt-3 border-t border-border pt-3 lg:hidden">
                <ShellNav
                  pathname={pathname}
                  recentCommunities={recentCommunities}
                  variant="mobile"
                />
              </div>
            ) : null}
          </header>

          <div className="min-w-0 flex-1">
            <div className={cn("mx-auto w-full max-w-[1180px] px-4 py-6 md:px-6", className)}>
              {children}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function ShellBrand() {
  return (
    <Link href="/" className="block border-b border-border pb-5">
      <div className="inline-flex items-center border border-foreground bg-foreground px-2 py-1 text-xl font-black leading-none tracking-normal text-background">
        CN
      </div>
      <div className="mt-4 text-sm font-semibold">CUMT Nexus</div>
      <div className="mt-1 text-xs text-muted-foreground">校园社区索引</div>
    </Link>
  );
}

function ShellNav({
  pathname,
  recentCommunities,
  variant = "desktop",
}: {
  pathname: string;
  recentCommunities: RecentCommunity[];
  variant?: "desktop" | "mobile";
}) {
  return (
    <div className={cn(variant === "desktop" ? "mt-6" : "space-y-5")}>
      {variant === "mobile" ? <ShellBrand /> : null}

      <nav
        aria-label="主导航"
        className="divide-y divide-border border-y border-border"
      >
        {primaryNavItems.map((item, index) => {
          const isActive = isActivePath(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center justify-between py-3 text-sm transition-colors",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="w-6 shrink-0 font-mono text-xs text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <item.icon className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </span>
              <span
                className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full transition-colors",
                  isActive
                    ? "bg-primary"
                    : "bg-border group-hover:bg-muted-foreground",
                )}
              />
            </Link>
          );
        })}
      </nav>

      <section className="mt-6">
        <div className="font-mono text-[11px] uppercase text-muted-foreground">
          最近访问
        </div>
        <div className="mt-3 divide-y divide-border border-y border-border">
          {recentCommunities.length > 0 ? (
            recentCommunities.map((community) => (
              <Link
                key={community.slug}
                href={`/communities/${community.slug}`}
                className="flex min-w-0 items-center justify-between gap-3 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <span className="truncate">{community.name}</span>
                <span className="shrink-0 font-mono text-xs text-primary">
                  /{community.slug}
                </span>
              </Link>
            ))
          ) : (
            <div className="py-3 text-sm leading-6 text-muted-foreground">
              还没有最近访问社区。
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function TopSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function goToSearch() {
    const nextQuery = query.trim();

    if (!nextQuery) {
      router.push("/search");
      return;
    }

    router.push(`/search?q=${encodeURIComponent(nextQuery)}&scope=all`);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    goToSearch();
  }

  return (
    <form className="min-w-0" role="search" onSubmit={submitSearch}>
      <label className="sr-only" htmlFor="app-shell-search">
        全站搜索
      </label>
      <div className="relative min-w-0">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id="app-shell-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              goToSearch();
            }
          }}
          placeholder="搜索社区或帖子"
          className="rounded-none pl-9"
        />
      </div>
    </form>
  );
}

function TopActions() {
  const { isReady, token } = useAuthSession();
  const notificationHref = token
    ? "/notifications"
    : `/login?next=${encodeURIComponent("/notifications")}`;
  const submitHref = token
    ? "/communities"
    : `/login?next=${encodeURIComponent("/communities")}`;

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <Link
        href={submitHref}
        className="inline-flex size-10 items-center justify-center border border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label="发帖"
      >
        <Send className="size-4" aria-hidden="true" />
      </Link>
      <Link
        href={notificationHref}
        className="inline-flex size-10 items-center justify-center border border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label="通知"
      >
        <Bell className="size-4" aria-hidden="true" />
      </Link>
      {!isReady ? (
        <div
          className="hidden h-10 w-20 animate-pulse border border-border bg-muted sm:block"
          aria-label="正在加载用户"
        />
      ) : (
        <HeaderUserMenu />
      )}
    </div>
  );
}

function HeaderUserMenu() {
  const router = useRouter();
  const { clearSession, token } = useAuthSession();
  const currentUserQuery = useCurrentUserQuery();

  function signOut() {
    clearSession();
    router.push("/login");
  }

  if (token && currentUserQuery.isLoading) {
    return (
      <div
        className="hidden h-10 w-20 animate-pulse border border-border bg-muted sm:block"
        aria-label="正在加载用户"
      />
    );
  }

  if (!token || !currentUserQuery.data) {
    return (
      <>
        <Link
          href="/login"
          className="inline-flex size-10 items-center justify-center border border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:hidden"
          aria-label="登录"
        >
          <User className="size-4" aria-hidden="true" />
        </Link>
        <div className="hidden items-center gap-2 sm:flex">
          <TextAction href="/login">登录</TextAction>
          <TextAction href="/register" tone="primary">
            注册
          </TextAction>
        </div>
      </>
    );
  }

  const user = currentUserQuery.data;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="group inline-flex size-10 items-center justify-center border border-border text-sm font-semibold text-primary transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-auto sm:max-w-44 sm:gap-2 sm:px-2"
          aria-label="打开用户菜单"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-xs font-semibold">
            {getUserInitial(user.username)}
          </span>
          <span className="hidden min-w-0 truncate text-sm text-foreground sm:inline">
            {user.username}
          </span>
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
          <Link href={`/users/${encodeURIComponent(user.username)}`}>
            <User className="size-4" aria-hidden="true" />
            个人主页
          </Link>
        </DropdownMenuItem>
        {user.is_platform_staff ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              平台工作台
            </DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href="/moderation">
                <ShieldAlert className="size-4" aria-hidden="true" />
                举报审核
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/community-applications/review">
                <ClipboardCheck className="size-4" aria-hidden="true" />
                社区审批
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={signOut}>
          <LogOut className="size-4" aria-hidden="true" />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/" || pathname === "/new" || pathname === "/hot";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function getUserInitial(username: string) {
  return username.trim().charAt(0).toUpperCase() || "U";
}
