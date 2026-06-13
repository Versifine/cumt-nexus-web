"use client";

import type { FormEvent, MouseEvent, ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Bookmark,
  Check,
  ClipboardCheck,
  CircleDot,
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
import {
  AuthDialog,
  type AuthDialogMode,
} from "@/features/auth/auth-dialog";
import { useAuthSession } from "@/features/auth/auth-session";
import { useCurrentUserQuery } from "@/features/auth/queries";
import { getSafeAuthRedirectPath } from "@/features/auth/redirect";
import {
  emptyUnreadSummary,
  formatNotificationCategory,
  formatNotificationDate,
  formatNotificationType,
  getNotificationCategory,
  renderNotificationCategoryIcon,
} from "@/features/notification/display";
import {
  useMarkAllNotificationsReadMutation,
  useNotificationsQuery,
  useUnreadSummaryQuery,
} from "@/features/notification/queries";
import { resolveNotificationTarget } from "@/features/notification/targets";
import type { Notification } from "@/features/notification/types";
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

type AuthDialogState = {
  mode: AuthDialogMode;
  nextPath: string;
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
  const [authDialog, setAuthDialog] = useState<AuthDialogState | null>(null);
  const [recentCommunities, setRecentCommunities] = useState<RecentCommunity[]>([]);
  const [registeredBackTarget, setRegisteredBackTarget] =
    useState<RegisteredBackTarget | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSearch = searchParams.toString();
  const currentPath = `${pathname}${currentSearch ? `?${currentSearch}` : ""}`;
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
  const handleAuthLinkClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.altKey ||
        event.ctrlKey ||
        event.shiftKey
      ) {
        return;
      }

      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a[href]");

      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      if ((anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) {
        return;
      }

      let url: URL;

      try {
        url = new URL(anchor.href);
      } catch {
        return;
      }

      if (
        url.origin !== window.location.origin ||
        (url.pathname !== "/login" && url.pathname !== "/register")
      ) {
        return;
      }

      event.preventDefault();
      setAuthDialog({
        mode: url.pathname === "/register" ? "register" : "login",
        nextPath: url.searchParams.has("next")
          ? getSafeAuthRedirectPath(url.search)
          : currentPath,
      });
    },
    [currentPath],
  );

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
      <main
        className="min-h-screen bg-background text-foreground"
        onClickCapture={handleAuthLinkClick}
      >
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
                  className="inline-flex size-9 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:size-10 lg:hidden"
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
        <AuthDialog
          mode={authDialog?.mode ?? "login"}
          nextPath={authDialog?.nextPath ?? currentPath}
          onModeChange={(mode) =>
            setAuthDialog((state) =>
              state ? { ...state, mode } : { mode, nextPath: currentPath },
            )
          }
          onOpenChange={(open) => {
            if (!open) {
              setAuthDialog(null);
            }
          }}
          open={Boolean(authDialog)}
        />
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
      <div className="inline-flex size-9 items-center justify-center rounded-lg border border-border text-sm font-semibold text-primary transition-colors hover:border-primary/50">
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
        className="divide-y divide-border border-t border-border"
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
        <div className="mt-3 divide-y divide-border border-t border-border">
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
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const urlScope = searchParams.get("scope") ?? "all";
  const inputRef = useRef<HTMLInputElement | null>(null);

  function goToSearch() {
    const nextQuery = inputRef.current?.value.trim() ?? "";
    const scope =
      pathname === "/search" &&
      (urlScope === "communities" || urlScope === "posts")
        ? urlScope
        : "all";

    if (!nextQuery) {
      router.push("/search");
      return;
    }

    router.push(`/search?q=${encodeURIComponent(nextQuery)}&scope=${scope}`);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    goToSearch();
  }

  return (
    <form
      className="min-w-0 flex-1 basis-0 max-w-[calc(100vw-152px)] sm:max-w-none"
      role="search"
      onSubmit={submitSearch}
    >
      <label className="sr-only" htmlFor="app-shell-search">
        全站搜索
      </label>
      <div className="relative min-w-0">
        <Search
          className="pointer-events-none absolute left-0 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id="app-shell-search"
          key={urlQuery}
          ref={inputRef}
          defaultValue={urlQuery}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              goToSearch();
            }
          }}
          placeholder="搜索社区、帖子"
          className="h-9 min-w-0 rounded-none border-x-0 border-t-0 bg-transparent pl-6 pr-0 text-sm focus-visible:ring-0 sm:h-10"
        />
      </div>
    </form>
  );
}

function TopActions() {
  const { isReady, token } = useAuthSession();
  const submitHref = token
    ? "/posts/new"
    : `/login?next=${encodeURIComponent("/posts/new")}`;

  return (
    <div className="flex shrink-0 items-center gap-1 sm:gap-2">
      <Link
        href={submitHref}
        className="inline-flex h-9 w-9 items-center justify-center gap-2 text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:h-10 sm:w-auto sm:px-2"
        aria-label="发帖"
      >
        <Send className="size-4" aria-hidden="true" />
        <span className="hidden text-sm font-medium sm:inline">发帖</span>
      </Link>
      <HeaderNotificationMenu isReady={isReady} token={token} />
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

function HeaderNotificationMenu({
  isReady,
  token,
}: {
  isReady: boolean;
  token: string | null;
}) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const canLoadNotifications = isReady && Boolean(token);
  const notificationHref = token
    ? "/notifications"
    : `/login?next=${encodeURIComponent("/notifications")}`;
  const notificationsQuery = useNotificationsQuery(
    { category: "all", limit: 5, offset: 0, status: "unread" },
    canLoadNotifications,
  );
  const unreadSummaryQuery = useUnreadSummaryQuery(canLoadNotifications);
  const markAllReadMutation = useMarkAllNotificationsReadMutation();
  const unreadSummary = unreadSummaryQuery.data ?? emptyUnreadSummary;
  const notifications = notificationsQuery.data?.notifications ?? [];
  const unreadCount = unreadSummary.total;

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

  return (
    <div
      ref={menuRef}
      className="group/notification-menu relative hidden sm:block"
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
        href={notificationHref}
        className="relative inline-flex size-10 items-center justify-center text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label="消息中心"
        onClick={() => setIsMenuOpen(false)}
      >
        <Bell className="size-4" aria-hidden="true" />
        {token && unreadCount > 0 ? (
          <span
            className="absolute right-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 font-mono text-[10px] font-semibold leading-4 text-primary-foreground"
            aria-label={`${unreadCount} 条未读消息`}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </Link>

      <div
        className={cn(
          "pointer-events-none absolute right-0 top-full z-50 mt-2 w-[360px] origin-top-right -translate-y-1 scale-[0.98] overflow-hidden rounded-lg border border-border bg-card text-card-foreground opacity-0 shadow-[0_18px_48px_rgb(0_0_0/0.38)] transition duration-150 ease-out",
          "group-hover/notification-menu:pointer-events-auto group-hover/notification-menu:translate-y-0 group-hover/notification-menu:scale-100 group-hover/notification-menu:opacity-100",
          "group-focus-within/notification-menu:pointer-events-auto group-focus-within/notification-menu:translate-y-0 group-focus-within/notification-menu:scale-100 group-focus-within/notification-menu:opacity-100",
          isMenuOpen
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "",
        )}
      >
        <div className="border-b border-border bg-background p-3">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Bell className="size-4 text-primary" aria-hidden="true" />
                <h2 className="truncate text-sm font-semibold text-foreground">
                  消息中心
                </h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatNotificationPanelSummary(
                  canLoadNotifications,
                  unreadSummaryQuery.isPending,
                  unreadCount,
                )}
              </p>
            </div>
            <Link
              href={notificationHref}
              className="shrink-0 text-xs font-semibold text-primary transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setIsMenuOpen(false)}
            >
              查看全部
            </Link>
          </div>
        </div>

        <NotificationMenuBody
          canLoadNotifications={canLoadNotifications}
          isReady={isReady}
          isMarkingAllRead={markAllReadMutation.isPending}
          notifications={notifications}
          notificationsError={notificationsQuery.isError}
          notificationsPending={notificationsQuery.isPending}
          notificationHref={notificationHref}
          onClose={() => setIsMenuOpen(false)}
          onMarkAllRead={() => markAllReadMutation.mutate()}
          unreadCount={unreadCount}
        />

      </div>
    </div>
  );
}

function NotificationMenuBody({
  canLoadNotifications,
  isMarkingAllRead,
  isReady,
  notifications,
  notificationsError,
  notificationsPending,
  notificationHref,
  onClose,
  onMarkAllRead,
  unreadCount,
}: {
  canLoadNotifications: boolean;
  isMarkingAllRead: boolean;
  isReady: boolean;
  notifications: Notification[];
  notificationsError: boolean;
  notificationsPending: boolean;
  notificationHref: string;
  onClose: () => void;
  onMarkAllRead: () => void;
  unreadCount: number;
}) {
  if (!isReady) {
    return (
      <div className="space-y-2 p-3" aria-label="正在加载消息">
        <div className="h-12 animate-pulse bg-muted" />
        <div className="h-12 animate-pulse bg-muted" />
        <div className="h-12 animate-pulse bg-muted" />
      </div>
    );
  }

  if (!canLoadNotifications) {
    return (
      <div className="p-3">
        <div className="border-l border-border px-3 py-2">
          <h3 className="text-sm font-semibold text-foreground">登录即可同步消息</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            回复、@、赞和系统消息会跟随账号同步。
          </p>
          <TextAction className="mt-3" href={notificationHref} tone="primary">
            去登录
          </TextAction>
        </div>
      </div>
    );
  }

  if (notificationsPending) {
    return (
      <div className="space-y-2 p-3" aria-label="正在加载消息">
        <div className="h-14 animate-pulse bg-muted" />
        <div className="h-14 animate-pulse bg-muted" />
        <div className="h-14 animate-pulse bg-muted" />
      </div>
    );
  }

  if (notificationsError) {
    return (
      <div className="p-3">
        <div className="border-l border-border px-3 py-2">
          <h3 className="text-sm font-semibold text-foreground">暂时无法加载消息</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            可以进入完整消息中心重新加载。
          </p>
          <TextAction className="mt-3" href={notificationHref} tone="primary">
            打开消息中心
          </TextAction>
        </div>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="p-3">
        <div className="border-l border-border px-3 py-2">
          <h3 className="text-sm font-semibold text-foreground">没有未读消息</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            有新的回复、@、赞或系统消息时，会显示在这里。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {unreadCount > 0 ? (
        <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
          <p className="text-xs text-muted-foreground">
            还有 {unreadCount} 条未读消息
          </p>
          <button
            type="button"
            className="inline-flex h-8 shrink-0 items-center gap-1.5 px-1 text-xs font-semibold text-primary transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isMarkingAllRead}
            onClick={onMarkAllRead}
          >
            <Check className="size-3.5" aria-hidden="true" />
            {isMarkingAllRead ? "处理中" : "全部已读"}
          </button>
        </div>
      ) : null}
      <div className="max-h-[360px] overflow-y-auto">
        {notifications.map((notification) => (
          <NotificationMenuItem
            key={notification.id}
            notification={notification}
            onClose={onClose}
          />
        ))}
      </div>
    </div>
  );
}

function NotificationMenuItem({
  notification,
  onClose,
}: {
  notification: Notification;
  onClose: () => void;
}) {
  const category = getNotificationCategory(notification);
  const target = resolveNotificationTarget(notification);
  const content = (
    <>
      <div className="flex size-8 shrink-0 items-center justify-center border border-primary/40 bg-primary/10 text-primary">
        {renderNotificationCategoryIcon(category)}
      </div>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground">
            {formatNotificationCategory(category)}
          </span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{formatNotificationType(notification.type)}</span>
          <span aria-hidden="true">·</span>
          <span className="shrink-0">
            {formatNotificationDate(notification.created_at)}
          </span>
          <CircleDot className="size-3 shrink-0 text-primary" aria-hidden="true" />
        </div>
        <h3 className="mt-1 line-clamp-1 text-sm font-semibold text-foreground">
          {notification.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
          {notification.body || target.summary}
        </p>
      </div>
    </>
  );

  if (!target.href) {
    return (
      <div className="grid grid-cols-[32px_minmax(0,1fr)] gap-3 border-b border-border px-3 py-3 last:border-b-0">
        {content}
      </div>
    );
  }

  return (
    <Link
      href={target.href}
      className="grid grid-cols-[32px_minmax(0,1fr)] gap-3 border-b border-border px-3 py-3 transition-colors last:border-b-0 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={onClose}
    >
      {content}
    </Link>
  );
}

function formatNotificationPanelSummary(
  canLoadNotifications: boolean,
  isPending: boolean,
  unreadCount: number,
) {
  if (!canLoadNotifications) {
    return "登录后同步账号消息";
  }

  if (isPending) {
    return "正在同步未读状态";
  }

  return unreadCount > 0 ? `${unreadCount} 条未读消息` : "没有未读消息";
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
    router.refresh();
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
          className="inline-flex size-9 items-center justify-center text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:hidden"
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
        className="group relative inline-flex size-9 items-center justify-center text-sm font-semibold text-primary transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:size-10"
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
