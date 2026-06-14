"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  CircleDot,
} from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TextAction } from "@/components/ui/text-action";
import { useAuthSession } from "@/features/auth/auth-session";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

import {
  getNotificationCategoryHref,
  notificationCategoryOptions,
} from "./categories";
import {
  emptyUnreadSummary,
  formatNotificationCategory,
  formatNotificationDate,
  formatNotificationType,
  getNotificationCategory,
  getNotificationCategoryCounts,
  renderNotificationCategoryIcon,
} from "./display";
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
  useUnreadSummaryQuery,
} from "./queries";
import type {
  Notification,
  NotificationCategory,
  NotificationStatus,
} from "./types";
import {
  resolveNotificationTarget,
  type NotificationTarget,
} from "./targets";

const statusOptions: Array<{ label: string; value: NotificationStatus }> = [
  { label: "未读", value: "unread" },
  { label: "全部", value: "all" },
  { label: "已读", value: "read" },
];

type NotificationCenterProps = {
  initialCategory?: NotificationCategory;
};

export function NotificationCenter({
  initialCategory = "all",
}: NotificationCenterProps) {
  const router = useRouter();
  const { isReady, token } = useAuthSession();
  const [status, setStatus] = useState<NotificationStatus>("unread");
  const category = initialCategory;
  const canLoadNotifications = isReady && Boolean(token);
  const notificationsQuery = useNotificationsQuery(
    { category, limit: 20, offset: 0, status },
    canLoadNotifications,
  );
  const unreadSummaryQuery = useUnreadSummaryQuery(canLoadNotifications);
  const markReadMutation = useMarkNotificationReadMutation();
  const markAllReadMutation = useMarkAllNotificationsReadMutation();
  const notifications = notificationsQuery.data?.notifications ?? [];
  const unreadSummary = unreadSummaryQuery.data ?? emptyUnreadSummary;
  const unreadCount = unreadSummary.total;
  const categoryCounts = getNotificationCategoryCounts(unreadSummary);
  const currentCategoryHref = getNotificationCategoryHref(category);
  const loginHref = `/login?next=${encodeURIComponent(currentCategoryHref)}`;
  const isFetchingControls =
    notificationsQuery.isFetching || unreadSummaryQuery.isFetching;
  const scopeLabel = `${formatStatus(status)} / ${formatNotificationCategory(category)}`;

  function handleCategoryChange(nextCategory: NotificationCategory) {
    if (nextCategory === category) {
      return;
    }

    router.push(getNotificationCategoryHref(nextCategory));
  }

  return (
    <div className="grid grid-cols-1 gap-0 py-2 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0">
        <section className="bg-background">
          <NotificationHeader
            currentCount={canLoadNotifications ? notifications.length : null}
            scopeLabel={scopeLabel}
            unreadCount={canLoadNotifications ? unreadCount : null}
          />
        </section>

        <section className="bg-background">
          <div className="border-b border-border py-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold">通知列表</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {scopeLabel}
                </p>
              </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <CategoryTabs
                  category={category}
                  disabled={!isReady || isFetchingControls}
                  onCategoryChange={handleCategoryChange}
                />
                <StatusTabs
                  disabled={!isReady || isFetchingControls}
                  onStatusChange={setStatus}
                  status={status}
                />
              </div>
            </div>
          </div>

          {!isReady ? (
            <div className="border-b border-border p-4">
              <LoadingState rows={3} />
            </div>
          ) : null}

          {isReady && !token ? (
            <div className="border-b border-border p-4">
              <EmptyState
                title="登录后查看通知"
                description="通知和当前账号绑定，登录后可以查看未读状态并标记已读。"
                action={
                  <TextAction href={loginHref} tone="primary">
                    登录
                  </TextAction>
                }
              />
            </div>
          ) : null}

          {canLoadNotifications && notificationsQuery.isPending ? (
            <div className="border-b border-border p-4">
              <LoadingState rows={5} />
            </div>
          ) : null}

          {canLoadNotifications && notificationsQuery.isError ? (
            <div className="border-b border-border p-4">
              <ErrorState
                title={getErrorTitle(notificationsQuery.error)}
                description={getErrorDescription(notificationsQuery.error)}
                action={
                  isUnauthenticated(notificationsQuery.error) ? (
                    <TextAction href={loginHref} tone="primary">
                      登录
                    </TextAction>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => notificationsQuery.refetch()}
                    >
                      重试
                    </Button>
                  )
                }
              />
            </div>
          ) : null}

          {canLoadNotifications &&
          notificationsQuery.isSuccess &&
          notifications.length === 0 ? (
            <div className="border-b border-border p-4">
              <EmptyState
                title={formatEmptyTitle(status, category)}
                description={getEmptyDescription(status, category)}
                action={
                  category === "all" ? (
                    <TextAction href="/">回到信息流</TextAction>
                  ) : (
                    <button
                      type="button"
                      className="text-sm font-semibold text-primary transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      onClick={() => handleCategoryChange("all")}
                    >
                      查看全部
                    </button>
                  )
                }
              />
            </div>
          ) : null}

          {canLoadNotifications &&
          notificationsQuery.isSuccess &&
          notifications.length > 0 ? (
            <>
              {status !== "read" && unreadCount > 0 ? (
                <div className="flex flex-col gap-2 border-b border-border py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-5 text-muted-foreground">
                    当前账号还有 {unreadCount} 条未读通知。
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 self-start px-2 text-xs sm:self-auto"
                    disabled={markAllReadMutation.isPending}
                    onClick={() => markAllReadMutation.mutate()}
                  >
                    <Check className="size-4" aria-hidden="true" />
                    {markAllReadMutation.isPending ? "处理中" : "全部标记已读"}
                  </Button>
                </div>
              ) : null}
              {notifications.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  isMarkingRead={
                    markReadMutation.isPending &&
                    markReadMutation.variables === notification.id
                  }
                  notification={notification}
                  onMarkRead={() => markReadMutation.mutate(notification.id)}
                />
              ))}
            </>
          ) : null}
        </section>
      </div>

      <NotificationRail
        category={category}
        categoryCounts={categoryCounts}
        isAuthenticated={Boolean(token)}
        status={status}
        unreadCount={unreadCount}
        unreadSummaryPending={canLoadNotifications && unreadSummaryQuery.isPending}
      />
    </div>
  );
}

function NotificationHeader({
  currentCount,
  scopeLabel,
  unreadCount,
}: {
  currentCount: number | null;
  scopeLabel: string;
  unreadCount: number | null;
}) {
  return (
    <div className="border-b border-border py-4">
      <div className="min-w-0">
        <h1 className="break-words text-xl font-semibold leading-7 tracking-normal text-foreground sm:text-2xl">
          通知
        </h1>
        <p className="mt-1 font-mono text-xs text-primary">
          {scopeLabel}
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          当前查看 {scopeLabel}，列表 {currentCount === null ? "--" : currentCount} 条，未读{" "}
          {unreadCount === null ? "--" : unreadCount} 条。
        </p>
      </div>
    </div>
  );
}

function CategoryTabs({
  category,
  disabled,
  onCategoryChange,
}: {
  category: NotificationCategory;
  disabled: boolean;
  onCategoryChange: (category: NotificationCategory) => void;
}) {
  return (
    <Tabs
      value={category}
      onValueChange={(value) => onCategoryChange(value as NotificationCategory)}
    >
      <TabsList className="h-9 rounded-none bg-transparent p-0">
        {notificationCategoryOptions.map((option) => (
          <TabsTrigger
            key={option.value}
            value={option.value}
            disabled={disabled}
            className="h-9 rounded-none border-b border-transparent px-3 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
          >
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

function StatusTabs({
  disabled,
  onStatusChange,
  status,
}: {
  disabled: boolean;
  onStatusChange: (status: NotificationStatus) => void;
  status: NotificationStatus;
}) {
  return (
    <Tabs
      value={status}
      onValueChange={(value) => onStatusChange(value as NotificationStatus)}
    >
      <TabsList className="h-9 rounded-none bg-transparent p-0">
        {statusOptions.map((option) => (
          <TabsTrigger
            key={option.value}
            value={option.value}
            disabled={disabled}
            className="h-9 rounded-none border-b border-transparent px-3 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
          >
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

function NotificationRow({
  isMarkingRead,
  notification,
  onMarkRead,
}: {
  isMarkingRead: boolean;
  notification: Notification;
  onMarkRead: () => void;
}) {
  const isUnread = !notification.read_at;
  const category = getNotificationCategory(notification);
  const target = resolveNotificationTarget(notification);

  return (
    <article
      className={cn(
        "grid grid-cols-[34px_minmax(0,1fr)] border-b border-border bg-background py-3 sm:grid-cols-[38px_minmax(0,1fr)]",
        isUnread ? "bg-primary/5" : null,
      )}
    >
      <div className="px-1 pt-1">
        <div
          className={cn(
            "flex size-7 items-center justify-center",
            isUnread
              ? "text-primary"
              : "text-muted-foreground",
          )}
        >
          {renderNotificationCategoryIcon(category)}
        </div>
      </div>

      <div className="min-w-0 pl-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5 text-muted-foreground">
          <span className="font-semibold text-foreground">
            {formatNotificationCategory(category)}
          </span>
          <span aria-hidden="true">·</span>
          <span>{formatNotificationType(notification.type)}</span>
          {notification.aggregate_count && notification.aggregate_count > 1 ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{notification.aggregate_count} 次</span>
            </>
          ) : null}
          <span aria-hidden="true">·</span>
          <span>{formatNotificationDate(notification.created_at)}</span>
          {isUnread ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 text-primary">
                <CircleDot className="size-3" aria-hidden="true" />
                未读
              </span>
            </>
          ) : null}
        </div>

        <h2 className="mt-1 break-words text-base font-semibold leading-6 tracking-normal text-foreground sm:text-lg">
          {notification.title}
        </h2>
        <p className="mt-2 max-w-3xl break-words text-sm leading-6 text-muted-foreground">
          {notification.body || "暂无通知正文。"}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <NotificationTargetAction target={target} />
          {isUnread ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-1 text-xs hover:bg-transparent hover:text-primary"
              disabled={isMarkingRead}
              onClick={onMarkRead}
            >
              <Check className="size-4" aria-hidden="true" />
              {isMarkingRead ? "处理中" : "标记已读"}
            </Button>
          ) : null}
          <span className="inline-flex min-h-8 items-center gap-1.5 break-words px-2">
            {target.summary}
          </span>
        </div>
      </div>
    </article>
  );
}

function NotificationTargetAction({
  target,
}: {
  target: NotificationTarget;
}) {
  if (!target.href) {
    return (
      <span className="inline-flex h-8 items-center gap-1.5 px-2 font-semibold text-muted-foreground">
        {target.label}
      </span>
    );
  }

  return (
    <Link
      href={target.href}
      className="inline-flex h-8 items-center gap-1.5 px-1 font-semibold transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {target.label}
    </Link>
  );
}

function NotificationRail({
  category,
  categoryCounts,
  isAuthenticated,
  status,
  unreadCount,
  unreadSummaryPending,
}: {
  category: NotificationCategory;
  categoryCounts: Record<NotificationCategory, number>;
  isAuthenticated: boolean;
  status: NotificationStatus;
  unreadCount: number;
  unreadSummaryPending: boolean;
}) {
  return (
    <aside className="border-t border-border py-5 xl:border-l xl:border-t-0 xl:pl-5">
      <div className="sticky top-20 right-rail-scroll space-y-6">
        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">通知范围</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            正在查看 {formatStatus(status)} / {formatNotificationCategory(category)}
            。未读{" "}
            <span className="font-mono text-foreground">
              {formatRailCount(isAuthenticated, unreadSummaryPending, unreadCount)}
            </span>{" "}
            条。
          </p>
        </section>

        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">分类未读</h2>
          <div className="mt-3 border-t border-border">
            {notificationCategoryOptions.map((option) => (
              <div
                key={option.value}
                className={cn(
                  "flex items-center justify-between gap-4 border-b border-border py-3 text-sm last:border-b-0",
                  category === option.value ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span>{option.label}</span>
                <span className="font-mono text-foreground">
                  {formatRailCount(
                    isAuthenticated,
                    unreadSummaryPending,
                    categoryCounts[option.value],
                  )}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold">继续浏览</h2>
          <div className="mt-3 flex flex-col border-t border-border">
            <TextAction href="/" variant="bar">
              回到信息流
            </TextAction>
            <TextAction href="/search" variant="bar">
              搜索内容
            </TextAction>
          </div>
        </section>
      </div>
    </aside>
  );
}

function formatStatus(status: NotificationStatus) {
  switch (status) {
    case "read":
      return "已读";
    case "all":
      return "全部";
    default:
      return "未读";
  }
}

function formatEmptyTitle(
  status: NotificationStatus,
  category: NotificationCategory,
) {
  if (category !== "all") {
    return `没有${formatNotificationCategory(category)}通知`;
  }

  switch (status) {
    case "read":
      return "还没有已读通知";
    case "all":
      return "还没有通知";
    default:
      return "没有未读通知";
  }
}

function getEmptyDescription(
  status: NotificationStatus,
  category: NotificationCategory,
) {
  if (category !== "all") {
    return `后端当前没有返回${formatStatus(status)}范围内的${formatNotificationCategory(category)}通知。`;
  }

  return "有新的回复、@、赞或系统消息时，会出现在这里。";
}

function isUnauthenticated(error: Error | null) {
  return error instanceof ApiError && error.code === "unauthenticated";
}

function getErrorTitle(error: Error | null) {
  if (isUnauthenticated(error)) {
    return "需要登录";
  }

  return "无法加载通知";
}

function getErrorDescription(error: Error | null) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}

function formatRailCount(
  isAuthenticated: boolean,
  isPending: boolean,
  value: number,
) {
  if (!isAuthenticated) {
    return "--";
  }

  return isPending ? "..." : String(value);
}

