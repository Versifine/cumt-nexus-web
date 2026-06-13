"use client";

import type { FormEvent, ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Bookmark,
  ClipboardCheck,
  Globe2,
  Hash,
  Home,
  LogOut,
  Menu,
  Pencil,
  Search,
  Send,
  ShieldAlert,
  User,
  Users,
  X,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { TextAction } from "@/components/ui/text-action";
import { useAuthSession } from "@/features/auth/auth-session";
import { useCurrentUserQuery } from "@/features/auth/queries";
import { usePublicUserQuery } from "@/features/profile/queries";
import { cn } from "@/lib/utils";

import {
  readRecentCommunities,
  type RecentCommunity,
} from "./recent-communities";

type AppShellProps = {
  backTarget?: AppShellBackTarget | null;
  children: ReactNode;
  className?: string;
  contextLabel: string;
};

export type AppShellBackTarget = {
  href: string;
  label: string;
};

type RegisteredBackTarget = {
  pathname: string;
  target: AppShellBackTarget | null;
};

const AppShellBackActionContext = createContext<
  ((target: AppShellBackTarget | null) => void) | null
>(null);

const primaryNavItems = [
  { href: "/", icon: Home, label: "首页" },
  { href: "/all", icon: Globe2, label: "全站" },
  { href: "/following", icon: Users, label: "关注" },
  { href: "/communities", icon: Hash, label: "社区" },
];

export function useAppShellBackAction(target: AppShellBackTarget | null) {
  const setBackTarget = useContext(AppShellBackActionContext);
  const href = target?.href ?? null;
  const label = target?.label ?? null;

  useEffect(() => {
    if (!setBackTarget) {
      return;
    }

    if (href && label) {
      setBackTarget({ href, label });
    } else {
      setBackTarget(null);
    }

    return () => setBackTarget(null);
  }, [href, label, setBackTarget]);
}

export function AppShell({
  backTarget = null,
  children,
  className,
  contextLabel,
}: AppShellProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [recentCommunities, setRecentCommunities] = useState<RecentCommunity[]>([]);
  const [registeredBackTarget, setRegisteredBackTarget] =
    useState<RegisteredBackTarget | null>(null);
  const pathname = usePathname();
  const setScopedBackTarget = useCallback(
    (target: AppShellBackTarget | null) => {
      setRegisteredBackTarget({ pathname, target });
    },
    [pathname],
  );
  const hasRegisteredBackTarget = registeredBackTarget?.pathname === pathname;
  const activeBackTarget = hasRegisteredBackTarget
    ? registeredBackTarget.target
    : backTarget;

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
    <AppShellBackActionContext.Provider value={setScopedBackTarget}>
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto grid min-h-screen w-full max-w-[1440px] grid-cols-1 lg:grid-cols-[248px_minmax(0,1fr)]">
          <aside className="hidden border-r border-border bg-background px-5 py-5 lg:fixed lg:left-[max(0px,calc((100vw-1440px)/2))] lg:top-0 lg:z-30 lg:block lg:h-dvh lg:w-[248px] lg:overflow-y-auto">
            <ShellBrand />
            <ShellNav pathname={pathname} recentCommunities={recentCommunities} />
          </aside>

          <section className="flex min-w-0 flex-col lg:col-start-2">
            <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-2 py-3 backdrop-blur sm:px-3 md:px-4 lg:px-6">
              <div className="flex min-w-0 items-center gap-1 sm:gap-2 lg:gap-4">
                <button
                  type="button"
                  className="inline-flex size-9 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:size-10 lg:hidden"
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

                <TopBackAction contextLabel={contextLabel} target={activeBackTarget} />
                <TopSearch />
                <TopActions />
              </div>

              {isMobileNavOpen ? (
                <div className="mt-3 max-h-[calc(100vh-72px)] overflow-y-auto border-t border-border pt-3 lg:hidden">
                  <ShellNav
                    pathname={pathname}
                    recentCommunities={recentCommunities}
                    variant="mobile"
                  />
                </div>
              ) : null}
            </header>

            <div className="min-w-0 flex-1">
              <div className={cn("mx-auto box-border w-full min-w-0 max-w-full px-4 py-6 md:max-w-[1180px] md:px-6", className)}>
                {children}
              </div>
            </div>
          </section>
        </div>
      </main>
    </AppShellBackActionContext.Provider>
  );
}

function TopBackAction({
  contextLabel,
  target,
}: {
  contextLabel: string;
  target: AppShellBackTarget | null;
}) {
  if (!target) {
    return (
      <div className="hidden min-w-0 shrink-0 lg:block lg:w-[180px]">
        <div className="truncate text-xs font-medium text-muted-foreground">
          {contextLabel}
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 shrink-0 lg:w-[180px]">
      <Link
        href={target.href}
        className="inline-flex h-10 max-w-[42vw] items-center gap-2 border-b border-transparent px-1 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:max-w-[220px] lg:max-w-full"
        aria-label={target.label}
        title={target.label}
      >
        <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
        <span className="hidden min-w-0 truncate sm:inline">{target.label}</span>
      </Link>
    </div>
  );
}

function ShellBrand() {
  return (
    <Link href="/" className="block border-b border-border pb-5">
      <div className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-card text-sm font-semibold text-primary transition-colors hover:border-primary/50">
        CN
      </div>
      <div className="mt-4 text-sm font-semibold">CUMT Nexus</div>
      <div className="mt-1 text-xs text-muted-foreground">校园社区</div>
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
    <form
      className="min-w-0 flex-1 basis-0 max-w-[calc(100vw-176px)] sm:max-w-none"
      role="search"
      onSubmit={submitSearch}
    >
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
          className="h-9 min-w-0 rounded-none pl-9 sm:h-10"
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
    ? "/posts/new"
    : `/login?next=${encodeURIComponent("/posts/new")}`;

  return (
    <div className="flex shrink-0 items-center gap-1 sm:gap-2">
      <Link
        href={submitHref}
        className="inline-flex h-9 w-9 items-center justify-center gap-2 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:h-10 sm:w-auto sm:px-2"
        aria-label="发帖"
      >
        <Send className="size-4" aria-hidden="true" />
        <span className="hidden text-sm font-medium sm:inline">发帖</span>
      </Link>
      <Link
        href={notificationHref}
        className="hidden size-9 items-center justify-center text-muted-foreground transition-colors hover:bg-surface-hover hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:inline-flex sm:size-10"
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
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const currentUserQuery = useCurrentUserQuery();
  const username = currentUserQuery.data?.username ?? "";
  const profileQuery = usePublicUserQuery(username, Boolean(token && username));
  const avatarUrl = profileQuery.data?.user.avatar_url?.trim() ?? "";
  const displayName = profileQuery.data?.user.display_name?.trim() || username;

  function signOut() {
    setIsMenuOpen(false);
    clearSession();
    router.push("/login");
  }

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    function closeOnPointerDown(event: PointerEvent) {
      const target = event.target;

      if (target instanceof Node && menuRef.current?.contains(target)) {
        return;
      }

      setIsMenuOpen(false);
    }

    document.addEventListener("pointerdown", closeOnPointerDown);

    return () => document.removeEventListener("pointerdown", closeOnPointerDown);
  }, [isMenuOpen]);

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
          className="inline-flex size-9 items-center justify-center text-muted-foreground transition-colors hover:bg-surface-hover hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:hidden"
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
  const profileHref = `/users/${encodeURIComponent(user.username)}`;

  return (
    <div
      ref={menuRef}
      className="group/user-menu relative"
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsMenuOpen(false);
        }
      }}
      onFocusCapture={() => setIsMenuOpen(true)}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setIsMenuOpen(false);
        }
      }}
      onMouseEnter={() => setIsMenuOpen(true)}
      onMouseLeave={() => setIsMenuOpen(false)}
    >
      <Link
        href={profileHref}
        className="group relative inline-flex size-9 items-center justify-center text-sm font-semibold text-primary transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:size-10"
        aria-label="进入个人主页"
        onClick={() => setIsMenuOpen(false)}
      >
        <HeaderAvatar
          avatarUrl={avatarUrl}
          size="trigger"
          username={user.username}
        />
        <span
          className="absolute bottom-1.5 right-1.5 size-2 rounded-full border border-background bg-primary"
          aria-hidden="true"
        />
      </Link>
      <div
        className={cn(
          "pointer-events-none absolute right-0 top-full z-50 mt-2 w-72 origin-top-right -translate-y-1 scale-[0.98] overflow-hidden rounded-lg border border-border bg-card text-card-foreground opacity-0 shadow-[0_18px_48px_rgb(0_0_0/0.38)] transition duration-150 ease-out",
          "group-hover/user-menu:pointer-events-auto group-hover/user-menu:translate-y-0 group-hover/user-menu:scale-100 group-hover/user-menu:opacity-100",
          "group-focus-within/user-menu:pointer-events-auto group-focus-within/user-menu:translate-y-0 group-focus-within/user-menu:scale-100 group-focus-within/user-menu:opacity-100",
          isMenuOpen
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "",
        )}
      >
        <div className="border-b border-border bg-background-soft/80 p-3">
          <div className="flex min-w-0 items-center gap-3">
            <HeaderAvatar
              avatarUrl={avatarUrl}
              size="menu"
              username={user.username}
            />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-foreground">
                {displayName}
              </div>
              <div className="mt-1 truncate font-mono text-xs text-muted-foreground">
                @{user.username}
              </div>
            </div>
          </div>
        </div>
        <nav className="p-1" aria-label="账号操作">
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            账号
          </div>
          <Link
            href="/settings/profile"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground"
            onClick={() => setIsMenuOpen(false)}
          >
            <Pencil className="size-4" aria-hidden="true" />
            编辑主页
          </Link>
          <Link
            href="/saved"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground"
            onClick={() => setIsMenuOpen(false)}
          >
            <Bookmark className="size-4" aria-hidden="true" />
            我的收藏
          </Link>
          {user.is_platform_staff ? (
            <>
              <div className="-mx-1 my-1 h-px bg-border" />
              <div className="px-2 py-1.5 text-xs font-normal text-muted-foreground">
                平台工作台
              </div>
              <Link
                href="/moderation"
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground"
                onClick={() => setIsMenuOpen(false)}
              >
                <ShieldAlert className="size-4" aria-hidden="true" />
                举报审核
              </Link>
              <Link
                href="/community-applications/review"
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground"
                onClick={() => setIsMenuOpen(false)}
              >
                <ClipboardCheck className="size-4" aria-hidden="true" />
                社区审批
              </Link>
            </>
          ) : null}
          <div className="-mx-1 my-1 h-px bg-border" />
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground outline-none transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:bg-destructive/10 focus-visible:text-destructive"
            onClick={signOut}
          >
            <LogOut className="size-4" aria-hidden="true" />
            退出登录
          </button>
        </nav>
      </div>
    </div>
  );
}

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return (
      pathname === "/" ||
      pathname === "/best" ||
      pathname === "/hot" ||
      pathname === "/new" ||
      pathname === "/top" ||
      pathname === "/rising"
    );
  }

  if (href === "/all" || href === "/following") {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function getUserInitial(username: string) {
  return username.trim().charAt(0).toUpperCase() || "U";
}

function HeaderAvatar({
  avatarUrl,
  size,
  username,
}: {
  avatarUrl: string;
  size: "menu" | "trigger";
  username: string;
}) {
  const sizeClass = size === "menu" ? "size-10" : "size-6 sm:size-7";
  const textClass = size === "menu" ? "text-sm" : "text-xs";

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={`${username} 的头像`}
        className={cn(
          sizeClass,
          "shrink-0 rounded-full border border-border bg-secondary object-cover",
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        sizeClass,
        textClass,
        "flex shrink-0 items-center justify-center rounded-full border border-border bg-secondary font-semibold text-primary",
      )}
    >
      {getUserInitial(username)}
    </span>
  );
}
