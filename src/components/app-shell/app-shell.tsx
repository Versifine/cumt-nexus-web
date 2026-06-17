"use client";

import type {
  FormEvent,
  MouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";
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
  ArrowUp,
  Bell,
  Bookmark,
  Coins,
  Globe2,
  Hash,
  Home,
  LogOut,
  Menu,
  MessageCircle,
  Monitor,
  Moon,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Send,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sun,
  User,
  Users,
  X,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { TextAction } from "@/components/ui/text-action";
import {
  AuthDialog,
  type AuthDialogMode,
} from "@/features/auth/auth-dialog";
import { useAuthSession } from "@/features/auth/auth-session";
import { resolvePlatformRole } from "@/features/auth/platform-role";
import { useCurrentUserQuery, useMyPointsQuery } from "@/features/auth/queries";
import { getSafeAuthRedirectPath } from "@/features/auth/redirect";
import { useFollowedCommunitiesQuery } from "@/features/community/queries";
import type { Community } from "@/features/community/types";
import {
  getNotificationCategoryHref,
  notificationCategoryOptions,
} from "@/features/notification/categories";
import {
  formatNotificationDate,
  formatNotificationType,
} from "@/features/notification/display";
import {
  formatNotificationMessage,
  getNotificationActor,
  mergeLikeNotifications,
  type DisplayNotification,
  type NotificationActorView,
} from "@/features/notification/grouping";
import {
  useMessageConversationsQuery,
  useMessageSummaryQuery,
} from "@/features/message/queries";
import { useMessageRealtime } from "@/features/message/realtime";
import type {
  MessageConversation,
  MessageUserSummary,
} from "@/features/message/types";
import { useNotificationsQuery } from "@/features/notification/queries";
import { resolveNotificationTarget } from "@/features/notification/targets";
import { useMyProgressionQuery } from "@/features/progression/queries";
import type { ProgressionSummary } from "@/features/progression/types";
import { usePublicUserQuery } from "@/features/profile/queries";
import {
  UserLevelBadge,
  UserLevelProgress,
} from "@/features/profile/user-identity-marks";
import { useTheme, type ThemePreference } from "@/lib/theme/theme-provider";
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
const APP_LAYOUT_SYNC_EVENT = "cumt-nexus:app-layout-sync";

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

function requestAppLayoutSync() {
  window.dispatchEvent(new Event(APP_LAYOUT_SYNC_EVENT));

  window.requestAnimationFrame(() => {
    window.dispatchEvent(new Event(APP_LAYOUT_SYNC_EVENT));
  });

  window.setTimeout(() => {
    window.dispatchEvent(new Event(APP_LAYOUT_SYNC_EVENT));
  }, 120);

  window.setTimeout(() => {
    window.dispatchEvent(new Event(APP_LAYOUT_SYNC_EVENT));
  }, 240);
}

export function AppShell({
  backTarget = null,
  children,
  className,
  contextLabel,
}: AppShellProps) {
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [authDialog, setAuthDialog] = useState<AuthDialogState | null>(null);
  const [recentCommunities, setRecentCommunities] = useState<RecentCommunity[]>([]);
  const [registeredBackTarget, setRegisteredBackTarget] =
    useState<RegisteredBackTarget | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSearch = searchParams.toString();
  const currentPath = `${pathname}${currentSearch ? `?${currentSearch}` : ""}`;
  const { isReady: isAuthReady, token } = useAuthSession();
  const currentUserQuery = useCurrentUserQuery();
  const platformRole = resolvePlatformRole(currentUserQuery.data);
  const followedCommunitiesQuery = useFollowedCommunitiesQuery(
    { limit: 5, offset: 0 },
    isAuthReady && Boolean(token),
  );
  const followedCommunities = followedCommunitiesQuery.data?.communities ?? [];
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

  useEffect(() => {
    let animationFrame = 0;

    function updateBackToTopVisibility() {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        setShowBackToTop(window.scrollY > 640);
      });
    }

    updateBackToTopVisibility();
    window.addEventListener("scroll", updateBackToTopVisibility, {
      passive: true,
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", updateBackToTopVisibility);
    };
  }, []);

  return (
    <AppShellBackActionContext.Provider value={setScopedBackTarget}>
      <main
        className="min-h-screen bg-background text-foreground"
        onClickCapture={handleAuthLinkClick}
      >
        <div
          className={cn(
            "mx-auto grid min-h-screen w-full max-w-[1440px] grid-cols-1 transition-[grid-template-columns] duration-200 ease-out",
            isDesktopSidebarCollapsed
              ? "lg:grid-cols-[72px_minmax(0,1fr)]"
              : "lg:grid-cols-[248px_minmax(0,1fr)]",
          )}
        >
          <aside
            className={cn(
              "hidden border-r border-border bg-background transition-[width] duration-200 ease-out lg:fixed lg:left-[max(0px,calc((100vw-1440px)/2))] lg:top-0 lg:z-30 lg:block lg:h-dvh lg:overflow-visible",
              isDesktopSidebarCollapsed ? "lg:w-[72px]" : "lg:w-[248px]",
            )}
          >
            <div
              className={cn(
                "app-sidebar-scroll h-full overflow-y-auto py-5 transition-[padding] duration-200 ease-out",
                isDesktopSidebarCollapsed ? "px-3" : "px-5",
              )}
            >
              <div
                className={cn(
                  "border-b border-border pb-4",
                  isDesktopSidebarCollapsed ? "text-center" : "",
                )}
              >
                <ShellBrand
                  collapsed={isDesktopSidebarCollapsed}
                  withBorder={false}
                />
              </div>
              <ShellNav
                collapsed={isDesktopSidebarCollapsed}
                followedCommunities={followedCommunities}
                isAuthenticated={Boolean(token)}
                isFollowedCommunitiesLoading={followedCommunitiesQuery.isPending}
                pathname={pathname}
                platformRole={platformRole}
                recentCommunities={recentCommunities}
              />
            </div>
            <button
              type="button"
              className="absolute right-0 top-[88px] z-40 inline-flex size-7 translate-x-1/2 items-center justify-center rounded-md border border-border bg-background text-muted-foreground shadow-[0_10px_28px_rgb(0_0_0/0.32)] transition-colors hover:border-primary/50 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label={
                isDesktopSidebarCollapsed ? "展开左侧栏" : "收起左侧栏"
              }
              aria-expanded={!isDesktopSidebarCollapsed}
              onClick={() => {
                setIsDesktopSidebarCollapsed((value) => !value);
                requestAppLayoutSync();
              }}
              title={isDesktopSidebarCollapsed ? "展开左侧栏" : "收起左侧栏"}
            >
              {isDesktopSidebarCollapsed ? (
                <PanelLeftOpen className="size-4" aria-hidden="true" />
              ) : (
                <PanelLeftClose className="size-4" aria-hidden="true" />
              )}
            </button>
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
                    followedCommunities={followedCommunities}
                    isAuthenticated={Boolean(token)}
                    isFollowedCommunitiesLoading={followedCommunitiesQuery.isPending}
                    pathname={pathname}
                    platformRole={platformRole}
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
        <button
          type="button"
          className={cn(
            "fixed bottom-5 right-4 z-40 inline-flex size-10 items-center justify-center rounded-md border border-border bg-background/95 text-muted-foreground shadow-[0_12px_36px_rgb(0_0_0/0.35)] backdrop-blur transition duration-150 ease-out hover:border-primary/50 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:right-6",
            showBackToTop
              ? "pointer-events-auto translate-y-0 opacity-100"
              : "pointer-events-none translate-y-2 opacity-0",
          )}
          aria-label="返回顶部"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <ArrowUp className="size-4" aria-hidden="true" />
        </button>
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

function ShellBrand({
  collapsed = false,
  withBorder = true,
}: {
  collapsed?: boolean;
  withBorder?: boolean;
}) {
  return (
    <Link
      href="/"
      className={cn(
        "block",
        withBorder ? "border-b border-border pb-5" : "",
        collapsed ? "text-center" : "",
      )}
      aria-label={collapsed ? "返回首页" : undefined}
      title={collapsed ? "CUMT Nexus" : undefined}
    >
      <div className="inline-flex size-9 items-center justify-center rounded-lg border border-border text-sm font-semibold text-primary transition-colors hover:border-primary/50">
        CN
      </div>
      <div className={cn("mt-4 text-sm font-semibold", collapsed ? "hidden" : "")}>
        CUMT Nexus
      </div>
      <div
        className={cn(
          "mt-1 text-xs text-muted-foreground",
          collapsed ? "hidden" : "",
        )}
      >
        校园社区
      </div>
    </Link>
  );
}

function ShellNav({
  collapsed = false,
  followedCommunities,
  isAuthenticated,
  isFollowedCommunitiesLoading,
  pathname,
  platformRole,
  recentCommunities,
  variant = "desktop",
}: {
  collapsed?: boolean;
  followedCommunities: Community[];
  isAuthenticated: boolean;
  isFollowedCommunitiesLoading: boolean;
  pathname: string;
  platformRole: ReturnType<typeof resolvePlatformRole>;
  recentCommunities: RecentCommunity[];
  variant?: "desktop" | "mobile";
}) {
  const isCollapsedDesktop = variant === "desktop" && collapsed;

  return (
    <div
      className={cn(
        variant === "desktop" ? (isCollapsedDesktop ? "mt-4" : "mt-6") : "space-y-5",
      )}
    >
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
              aria-label={isCollapsedDesktop ? item.label : undefined}
              title={isCollapsedDesktop ? item.label : undefined}
              className={cn(
                "group flex items-center py-3 text-sm transition-colors",
                isCollapsedDesktop ? "justify-center" : "justify-between",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "flex min-w-0 items-center",
                  isCollapsedDesktop ? "justify-center" : "gap-3",
                )}
              >
                <span
                  className={cn(
                    "w-6 shrink-0 font-mono text-xs text-muted-foreground",
                    isCollapsedDesktop ? "hidden" : "",
                  )}
                >
                  {isCollapsedDesktop ? null : String(index + 1).padStart(2, "0")}
                </span>
                <item.icon className="size-4 shrink-0" aria-hidden="true" />
                {isCollapsedDesktop ? null : (
                  <span className="truncate">{item.label}</span>
                )}
              </span>
              {isCollapsedDesktop ? null : (
                <span
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full transition-colors",
                    isActive
                      ? "bg-primary"
                      : "bg-border group-hover:bg-muted-foreground",
                  )}
                />
              )}
            </Link>
          );
        })}
      </nav>

      <section className={cn("mt-6", isCollapsedDesktop ? "hidden" : "")}>
        <div className="font-mono text-[11px] uppercase text-muted-foreground">
          工具
        </div>
        <div className="mt-3 divide-y divide-border border-t border-border">
          <ShellNavLink
            active={isActivePath(pathname, "/style-guide")}
            href="/style-guide"
            icon={Palette}
            label="组件台账"
          />
        </div>
      </section>

      {isAuthenticated && platformRole ? (
        <section className={cn("mt-6", isCollapsedDesktop ? "hidden" : "")}>
          <div className="font-mono text-[11px] uppercase text-muted-foreground">
            管理
          </div>
          <div className="mt-3 divide-y divide-border border-t border-border">
            <ShellNavLink
              active={isActivePath(pathname, "/admin")}
              href="/admin"
              icon={ShieldAlert}
              label="平台管理"
            />
          </div>
        </section>
      ) : null}

      <section className={cn("mt-6", isCollapsedDesktop ? "hidden" : "")}>
        <div className="font-mono text-[11px] uppercase text-muted-foreground">
          关注社区
        </div>
        <div className="mt-3 divide-y divide-border border-t border-border">
          <FollowedCommunitiesNav
            communities={followedCommunities}
            isAuthenticated={isAuthenticated}
            isLoading={isFollowedCommunitiesLoading}
          />
        </div>
      </section>

      <section className={cn("mt-6", isCollapsedDesktop ? "hidden" : "")}>
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

function ShellNavLink({
  active = false,
  href,
  icon: Icon,
  label,
}: {
  active?: boolean;
  href: string;
  icon: typeof Home;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-w-0 items-center justify-between gap-3 py-3 text-sm transition-colors hover:text-foreground",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <span className="inline-flex min-w-0 items-center gap-3">
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </span>
      <span className="shrink-0 font-mono text-xs text-primary">
        {active ? "当前" : "进入"}
      </span>
    </Link>
  );
}

function FollowedCommunitiesNav({
  communities,
  isAuthenticated,
  isLoading,
}: {
  communities: Community[];
  isAuthenticated: boolean;
  isLoading: boolean;
}) {
  if (!isAuthenticated) {
    return (
      <div className="py-3 text-sm leading-6 text-muted-foreground">
        登录后同步关注社区。
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="py-3 text-sm leading-6 text-muted-foreground">
        正在同步关注社区。
      </div>
    );
  }

  if (communities.length === 0) {
    return (
      <div className="py-3 text-sm leading-6 text-muted-foreground">
        还没有关注社区。
      </div>
    );
  }

  return communities.map((community) => (
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
  ));
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
      (urlScope === "communities" || urlScope === "posts" || urlScope === "users")
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
      className="min-w-0 flex-1 basis-0 max-w-[calc(100vw-188px)] sm:max-w-none"
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
          placeholder="搜索用户、社区、帖子"
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
      <HeaderThemeMenu />
      <HeaderMessageEntry isReady={isReady} token={token} />
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

function HeaderMessageEntry({
  isReady,
  token,
}: {
  isReady: boolean;
  token: string | null;
}) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const canLoadMessages = isReady && Boolean(token);
  const messageHref = "/messages";
  const summaryQuery = useMessageSummaryQuery(canLoadMessages);
  const conversationsQuery = useMessageConversationsQuery(
    { box: "all", limit: 3, offset: 0 },
    canLoadMessages && isMenuOpen,
  );
  const unreadTotal = summaryQuery.data?.unread_total ?? 0;

  useMessageRealtime({ enabled: canLoadMessages });

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

  if (!canLoadMessages) {
    return (
      <Link
        href={messageHref}
        className="relative inline-flex size-9 items-center justify-center text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:size-10"
        aria-label="私信"
        title="私信"
      >
        <MessageCircle className="size-4" aria-hidden="true" />
      </Link>
    );
  }

  return (
    <>
      <Link
        href={messageHref}
        className="relative inline-flex size-9 items-center justify-center text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:hidden"
        aria-label="私信"
        title="私信"
      >
        <MessageCircle className="size-4" aria-hidden="true" />
        {unreadTotal > 0 ? (
          <span className="absolute right-0 top-0 min-w-4 bg-primary px-1 font-mono text-[9px] font-semibold leading-4 text-primary-foreground">
            {unreadTotal > 99 ? "99+" : unreadTotal}
          </span>
        ) : null}
      </Link>
    <div
      ref={menuRef}
      className="relative hidden sm:block"
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsMenuOpen(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setIsMenuOpen(false);
        }
      }}
    >
      <button
        type="button"
        className="relative inline-flex size-10 items-center justify-center text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-expanded={isMenuOpen}
        aria-haspopup="menu"
        aria-label="私信"
        onClick={() => setIsMenuOpen((value) => !value)}
      >
        <MessageCircle className="size-4" aria-hidden="true" />
        {unreadTotal > 0 ? (
          <span className="absolute right-0 top-0 min-w-4 bg-primary px-1 font-mono text-[9px] font-semibold leading-4 text-primary-foreground">
            {unreadTotal > 99 ? "99+" : unreadTotal}
          </span>
        ) : null}
      </button>
      <div
        className={cn(
          "absolute right-0 top-full z-50 mt-2 w-80 origin-top-right overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-[0_18px_48px_rgb(0_0_0/0.38)] transition duration-150 ease-out",
          isMenuOpen
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-1 scale-[0.98] opacity-0",
        )}
      >
        <div className="border-b border-border bg-background p-3">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <MessageCircle className="size-4 text-primary" aria-hidden="true" />
                <h2 className="truncate text-sm font-semibold text-foreground">
                  私信
                </h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {summaryQuery.data?.request_count
                  ? `${summaryQuery.data.request_count} 条陌生人请求`
                  : "会话和陌生人请求"}
              </p>
            </div>
            <Link
              href={messageHref}
              className="shrink-0 text-xs font-semibold text-primary transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setIsMenuOpen(false)}
            >
              查看全部
            </Link>
          </div>
        </div>
        <div className="divide-y divide-border">
          {conversationsQuery.isPending ? (
            <div className="space-y-2 p-3" aria-label="正在加载私信">
              <div className="h-12 animate-pulse bg-muted" />
              <div className="h-12 animate-pulse bg-muted" />
            </div>
          ) : conversationsQuery.data?.conversations.length ? (
            conversationsQuery.data.conversations.map((conversation) => (
              <HeaderMessageMenuItem
                key={conversation.id}
                conversation={conversation}
                onClose={() => setIsMenuOpen(false)}
              />
            ))
          ) : (
            <div className="p-3 text-sm leading-6 text-muted-foreground">
              暂无私信会话。
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

function HeaderMessageMenuItem({
  conversation,
  onClose,
}: {
  conversation: MessageConversation;
  onClose: () => void;
}) {
  const displayName = getMessageParticipantName(conversation.participant);
  const preview = formatHeaderMessagePreview(conversation);
  const updatedAt = formatHeaderMessageTime(conversation.updated_at);

  return (
    <Link
      href={`/messages/${encodeURIComponent(conversation.id)}`}
      className="grid grid-cols-[36px_minmax(0,1fr)_auto] gap-3 px-3 py-3 text-sm transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={onClose}
    >
      <HeaderMessageAvatar
        online={conversation.peer_online}
        onlineVisible={conversation.peer_online_status_visible}
        user={conversation.participant}
      />
      <span className="min-w-0 self-center">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate font-semibold text-foreground">
            {displayName}
          </span>
          {conversation.request_status === "pending" ? (
            <span className="shrink-0 text-[11px] font-semibold text-primary">
              等待
            </span>
          ) : null}
        </span>
        <span className="mt-1 block truncate text-xs leading-5 text-muted-foreground">
          {preview}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-2 pt-0.5">
        {updatedAt ? (
          <span className="font-mono text-[10px] leading-none text-muted-foreground">
            {updatedAt}
          </span>
        ) : null}
        {conversation.unread_count > 0 ? (
          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-mono text-[9px] font-semibold leading-4 text-primary-foreground">
            {conversation.unread_count > 99
              ? "99+"
              : conversation.unread_count}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

function HeaderMessageAvatar({
  online,
  onlineVisible,
  user,
}: {
  online: boolean;
  onlineVisible: boolean;
  user: MessageUserSummary;
}) {
  const name = getMessageParticipantName(user);

  return (
    <span className="relative inline-flex size-9 shrink-0 self-center">
      {user.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.avatar_url}
          alt={`${name} 的头像`}
          className="size-full rounded-full object-cover"
        />
      ) : (
        <span className="flex size-full items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
          {name.slice(0, 1).toUpperCase()}
        </span>
      )}
      {onlineVisible ? (
        <span
          className={cn(
            "absolute bottom-0 right-0 size-2.5 rounded-full border border-card",
            online ? "bg-success" : "bg-muted-foreground",
          )}
        />
      ) : null}
    </span>
  );
}

function getMessageParticipantName(user: MessageUserSummary) {
  return user.display_name?.trim() || user.username;
}

function formatHeaderMessagePreview(conversation: MessageConversation) {
  if (conversation.blocked) {
    return "无法继续发送消息";
  }

  if (conversation.request_status === "pending") {
    if (conversation.request_direction === "incoming" || conversation.box === "requests") {
      return "发来一条陌生人消息";
    }

    return "等待对方通过";
  }

  const message = conversation.last_message;

  if (!message) {
    return "暂无消息";
  }

  if (message.status === "recalled") {
    return "撤回了一条消息";
  }

  if (message.status === "image_rejected") {
    return "图片审核失败";
  }

  if (message.type === "image") {
    return "[图片]";
  }

  if (message.type.startsWith("share_")) {
    return message.text || formatHeaderShareMessageText(message.type);
  }

  return message.text || "消息";
}

function formatHeaderShareMessageText(type: string) {
  switch (type) {
    case "share_comment":
      return "分享[评论]";
    case "share_user":
      return "分享[用户]";
    case "share_community":
      return "分享[社区]";
    case "share_post":
    default:
      return "分享[帖子]";
  }
}

function formatHeaderMessageTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();

  if (sameDay) {
    return new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

const themeOptions: Array<{
  description: string;
  icon: typeof Monitor;
  label: string;
  value: ThemePreference;
}> = [
  {
    description: "按设备偏好自动切换",
    icon: Monitor,
    label: "跟随系统",
    value: "system",
  },
  {
    description: "适合白天和高亮环境",
    icon: Sun,
    label: "浅色",
    value: "light",
  },
  {
    description: "保持默认编辑感暗色界面",
    icon: Moon,
    label: "深色",
    value: "dark",
  },
];

function HeaderThemeMenu() {
  const { resolvedTheme, setTheme, theme } = useTheme();
  const TriggerIcon = resolvedTheme === "dark" ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex size-9 items-center justify-center text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:size-10"
          aria-label="切换主题"
          title="切换主题"
        >
          <TriggerIcon className="size-4" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>界面主题</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(value) => setTheme(value as ThemePreference)}
        >
          {themeOptions.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              <option.icon className="size-4 text-muted-foreground" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-sm">{option.label}</span>
                <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                  {option.description}
                </span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
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
    { category: "interactions", limit: 5, offset: 0 },
    canLoadNotifications,
  );
  const notifications = mergeLikeNotifications(
    notificationsQuery.data?.notifications ?? [],
  );

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
      className="relative hidden sm:block"
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsMenuOpen(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setIsMenuOpen(false);
        }
      }}
    >
      <button
        type="button"
        className="relative inline-flex size-10 items-center justify-center text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-expanded={isMenuOpen}
        aria-haspopup="menu"
        aria-label="消息中心"
        onClick={() => setIsMenuOpen((value) => !value)}
      >
        <Bell className="size-4" aria-hidden="true" />
      </button>
      <div
        className={cn(
          "absolute right-0 top-full z-50 mt-2 w-80 origin-top-right overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-[0_18px_48px_rgb(0_0_0/0.38)] transition duration-150 ease-out",
          isMenuOpen
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-1 scale-[0.98] opacity-0",
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
                互动消息和系统通知
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
          notifications={notifications}
          notificationsError={notificationsQuery.isError}
          notificationsPending={notificationsQuery.isPending}
          notificationHref={notificationHref}
          onClose={() => setIsMenuOpen(false)}
        />

      </div>
    </div>
  );
}

function NotificationMenuBody({
  canLoadNotifications,
  isReady,
  notifications,
  notificationsError,
  notificationsPending,
  notificationHref,
  onClose,
}: {
  canLoadNotifications: boolean;
  isReady: boolean;
  notifications: DisplayNotification[];
  notificationsError: boolean;
  notificationsPending: boolean;
  notificationHref: string;
  onClose: () => void;
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
        <NotificationCategorySummary onClose={onClose} />
        <div className="border-l border-border px-3 py-2">
          <h3 className="text-sm font-semibold text-foreground">暂时没有消息</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            有新的回复、@、赞或系统消息时，会显示在这里。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="p-3">
        <NotificationCategorySummary onClose={onClose} />
      </div>
      <div className="border-b border-border px-3 py-2">
        <p className="text-xs font-semibold text-foreground">最新消息</p>
      </div>
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

function NotificationCategorySummary({
  onClose,
}: {
  onClose: () => void;
}) {
  return (
    <div className="grid grid-cols-2 border border-border">
      {notificationCategoryOptions.map((option) => {
        return (
          <Link
            key={option.value}
            href={getNotificationCategoryHref(option.value)}
            className="min-w-0 border-b border-r border-border px-3 py-2 text-left transition-colors odd:border-r even:border-r-0 last:border-b-0 hover:bg-muted/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={onClose}
          >
            <span className="block truncate text-xs text-muted-foreground">
              {option.label}
            </span>
            <span className="mt-1 block text-sm font-semibold text-foreground">
              查看
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function NotificationMenuItem({
  notification,
  onClose,
}: {
  notification: DisplayNotification;
  onClose: () => void;
}) {
  const target = resolveNotificationTarget(notification);
  const actor = getNotificationActor(notification);
  const message = formatNotificationMessage(notification);
  const content = (
    <>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="truncate font-semibold text-foreground">
            {actor.displayName}
          </span>
          <span aria-hidden="true">·</span>
          <span className="shrink-0">
            {formatNotificationDate(notification.created_at)}
          </span>
        </div>
        <h3 className="mt-1 line-clamp-1 text-sm font-semibold text-foreground">
          {message}
        </h3>
        <p className="mt-1 line-clamp-1 text-xs leading-5 text-muted-foreground">
          {formatNotificationType(notification.type)}
        </p>
      </div>
      <NotificationMenuAvatar actor={actor} />
    </>
  );

  if (!target.href) {
    return (
      <div className="grid grid-cols-[minmax(0,1fr)_32px] gap-3 border-b border-border px-3 py-3 last:border-b-0">
        {content}
      </div>
    );
  }

  return (
    <Link
      href={target.href}
      className="grid grid-cols-[minmax(0,1fr)_32px] gap-3 border-b border-border px-3 py-3 transition-colors last:border-b-0 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={onClose}
    >
      {content}
    </Link>
  );
}

function NotificationMenuAvatar({ actor }: { actor: NotificationActorView }) {
  if (actor.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={actor.avatarUrl}
        alt={`${actor.displayName}头像`}
        className="size-8 shrink-0 rounded-full border border-primary/40 object-cover"
      />
    );
  }

  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-[11px] font-semibold text-primary">
      {actor.initial}
    </div>
  );
}

function HeaderUserMenu() {
  const router = useRouter();
  const { clearSession, token } = useAuthSession();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const currentUserQuery = useCurrentUserQuery();
  const username = currentUserQuery.data?.username ?? "";
  const profileQuery = usePublicUserQuery(username, Boolean(token && username));
  const pointsQuery = useMyPointsQuery(Boolean(token && currentUserQuery.data));
  const progressionQuery = useMyProgressionQuery(Boolean(token && currentUserQuery.data));
  const avatarUrl = profileQuery.data?.user.avatar_url?.trim() ?? "";
  const displayName = profileQuery.data?.user.display_name?.trim() || username;
  const platformRole = resolvePlatformRole(currentUserQuery.data);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const closeMenu = useCallback(() => {
    clearCloseTimer();
    setIsMenuOpen(false);
  }, [clearCloseTimer]);

  const openMenuOnHover = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType !== "mouse") {
        return;
      }

      clearCloseTimer();
      setIsMenuOpen(true);
    },
    [clearCloseTimer],
  );

  const scheduleCloseOnHoverLeave = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType !== "mouse") {
        return;
      }

      clearCloseTimer();
      closeTimerRef.current = setTimeout(() => {
        setIsMenuOpen(false);
      }, 220);
    },
    [clearCloseTimer],
  );

  function signOut() {
    closeMenu();
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

      closeMenu();
    }

    document.addEventListener("pointerdown", closeOnPointerDown);

    return () => document.removeEventListener("pointerdown", closeOnPointerDown);
  }, [closeMenu, isMenuOpen]);

  useEffect(() => clearCloseTimer, [clearCloseTimer]);

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
      className="relative"
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          closeMenu();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          closeMenu();
        }
      }}
      onPointerEnter={openMenuOnHover}
      onPointerLeave={scheduleCloseOnHoverLeave}
    >
      <Link
        href={profileHref}
        className={cn(
          "group relative z-[60] inline-flex size-9 origin-top items-center justify-center text-sm font-semibold text-primary transition duration-150 ease-out hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:size-10",
          isMenuOpen ? "-translate-y-0.5 scale-125 text-foreground" : "",
        )}
        aria-expanded={isMenuOpen}
        aria-haspopup="menu"
        aria-label="进入个人主页"
        onClick={closeMenu}
      >
        <HeaderAvatar
          avatarUrl={avatarUrl}
          size="trigger"
          username={user.username}
        />
      </Link>
      <div
        className={cn(
          "absolute right-0 top-full z-50 hidden h-2 w-72 sm:block",
          isMenuOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden="true"
      />
      <div
        className={cn(
          "absolute right-0 top-full z-50 mt-2 w-72 origin-top-right overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-[0_18px_48px_rgb(0_0_0/0.38)] transition duration-150 ease-out",
          isMenuOpen
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-1 scale-[0.98] opacity-0",
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
          <AccountProgressionSummary
            isError={progressionQuery.isError}
            isLoading={progressionQuery.isPending}
            progression={progressionQuery.data?.progression}
          />
          <AccountPointsSummary
            balance={pointsQuery.data?.points.balance}
            isError={pointsQuery.isError}
            isLoading={pointsQuery.isPending}
            lifetimeEarned={pointsQuery.data?.points.lifetime_earned}
            lifetimeSpent={pointsQuery.data?.points.lifetime_spent}
          />
        </div>
        <nav className="p-1" aria-label="账号菜单">
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            个人
          </div>
          <Link
            href={profileHref}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground"
            onClick={closeMenu}
          >
            <User className="size-4" aria-hidden="true" />
            个人主页
          </Link>
          <Link
            href="/saved"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground"
            onClick={closeMenu}
          >
            <Bookmark className="size-4" aria-hidden="true" />
            我的收藏
          </Link>
          <Link
            href="/settings/progression"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground"
            onClick={closeMenu}
          >
            <Coins className="size-4" aria-hidden="true" />
            成长与积分
          </Link>
          <div className="-mx-1 my-1 h-px bg-border" />
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            设置
          </div>
          <Link
            href="/settings/profile"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground"
            onClick={closeMenu}
          >
            <Settings className="size-4" aria-hidden="true" />
            资料设置
          </Link>
          <Link
            href="/settings/privacy"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground"
            onClick={closeMenu}
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            隐私与私信
          </Link>
          <Link
            href="/settings/security"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground"
            onClick={closeMenu}
          >
            <ShieldCheck className="size-4" aria-hidden="true" />
            账号安全
          </Link>
          {platformRole ? (
            <>
              <div className="-mx-1 my-1 h-px bg-border" />
              <div className="px-2 py-1.5 text-xs font-normal text-muted-foreground">
                管理入口
              </div>
              <Link
                href="/admin"
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground"
                onClick={closeMenu}
              >
                <ShieldAlert className="size-4" aria-hidden="true" />
                平台管理
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

function AccountProgressionSummary({
  isError,
  isLoading,
  progression,
}: {
  isError: boolean;
  isLoading: boolean;
  progression?: ProgressionSummary;
}) {
  if (isError) {
    return (
      <div className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
        等级暂时无法同步。
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mt-3 border-t border-border pt-3">
        <div className="h-4 w-28 animate-pulse bg-muted" />
        <div className="mt-2 h-[3px] animate-pulse bg-muted" />
      </div>
    );
  }

  if (!progression) {
    return null;
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="flex min-w-0 items-center gap-2">
        <UserLevelBadge level={progression} size="sm" />
        <span className="min-w-0 truncate text-xs font-semibold text-foreground">
          {progression.level_name || "全站等级"}
        </span>
      </div>
      <UserLevelProgress className="mt-2" level={progression} showLabel />
    </div>
  );
}

function AccountPointsSummary({
  balance,
  isError,
  isLoading,
  lifetimeEarned,
  lifetimeSpent,
}: {
  balance?: number;
  isError: boolean;
  isLoading: boolean;
  lifetimeEarned?: number;
  lifetimeSpent?: number;
}) {
  if (isError) {
    return (
      <div className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
        积分暂时无法同步。
      </div>
    );
  }

  return (
    <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3">
      <AccountPointsMetric
        icon={<Coins className="size-3.5" aria-hidden="true" />}
        label="积分"
        value={isLoading ? "同步中" : formatPointAmount(balance)}
      />
      <AccountPointsMetric
        label="累计"
        value={isLoading ? "同步中" : formatPointAmount(lifetimeEarned)}
      />
      <AccountPointsMetric
        label="已用"
        value={isLoading ? "同步中" : formatPointAmount(lifetimeSpent)}
      />
    </div>
  );
}

function AccountPointsMetric({
  icon,
  label,
  value,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 truncate text-xs font-semibold text-foreground">
        {value}
      </div>
    </div>
  );
}

function formatPointAmount(value?: number) {
  if (typeof value !== "number") {
    return "暂无";
  }

  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 1,
    notation: value >= 10000 ? "compact" : "standard",
  }).format(value);
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
          "shrink-0 rounded-full bg-secondary object-cover",
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        sizeClass,
        textClass,
        "flex shrink-0 items-center justify-center rounded-full bg-secondary font-semibold text-primary",
      )}
    >
      {getUserInitial(username)}
    </span>
  );
}

