"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AtSign,
  Bell,
  Check,
  CircleDot,
  Heart,
  MessageSquare,
  Shield,
} from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { InfoRow } from "@/components/ui/data-display";
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
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
  useUnreadSummaryQuery,
} from "./queries";
import type {
  Notification,
  NotificationCategory,
  NotificationStatus,
  UnreadSummaryResponse,
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
  const categoryCounts = getCategoryCounts(unreadSummary);
  const currentCategoryHref = getNotificationCategoryHref(category);
  const loginHref = `/login?next=${encodeURIComponent(currentCategoryHref)}`;
  const isFetchingControls =
    notificationsQuery.isFetching || unreadSummaryQuery.isFetching;

  function handleCategoryChange(nextCategory: NotificationCategory) {
    if (nextCategory === category) {
      return;
    }

    router.push(getNotificationCategoryHref(nextCategory));
  }

  return (
    <div className="grid grid-cols-1 gap-0 py-4 xl:grid-cols-[minmax(0,1fr)_312px]">
      <div className="min-w-0">
        <section className="border border-border bg-background">
          <NotificationHeader
            category={category}
            currentCount={canLoadNotifications ? notifications.length : null}
            status={status}
            unreadCount={canLoadNotifications ? unreadCount : null}
          />
        </section>

        <section className="mt-3 border-x border-border bg-background">
          <div className="border-b border-border px-3 py-3 sm:px-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold">通知列表</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatStatus(status)} / {formatCategory(category)}
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
                <div className="flex flex-col gap-2 border-b border-border bg-background-soft/45 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                  <p className="text-xs leading-5 text-muted-foreground">
                    当前账号还有 {unreadCount} 条未读通知。
                  </p>
                  <Button
                    type="button"
                    variant="outline"
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
  category,
  currentCount,
  status,
  unreadCount,
}: {
  category: NotificationCategory;
  currentCount: number | null;
  status: NotificationStatus;
  unreadCount: number | null;
}) {
  return (
    <div className="grid gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex size-12 shrink-0 items-center justify-center border border-border bg-secondary text-primary"
            aria-label="通知图标"
          >
            <Bell className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="break-words text-xl font-semibold leading-7 tracking-normal text-foreground sm:text-2xl">
              通知
            </h1>
            <p className="mt-1 truncate font-mono text-xs text-primary">
              回复 / @ / 赞 / 系统
            </p>
          </div>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          按回复、@、赞和系统通知分类查看账号消息，处理后可以标记已读。
        </p>
      </div>

      <div className="grid grid-cols-3 border border-border text-center">
        <HeaderMetric label="当前" value={currentCount === null ? "--" : String(currentCount)} />
        <HeaderMetric label="未读" value={unreadCount === null ? "--" : String(unreadCount)} />
        <HeaderMetric label="范围" value={`${formatStatus(status)} / ${formatCategory(category)}`} />
      </div>
    </div>
  );
}

function HeaderMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-border p-2 last:border-r-0">
      <div className="font-mono text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold">{value}</div>
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
      <TabsList className="h-9 rounded-none border border-border bg-background p-0">
        {notificationCategoryOptions.map((option, index) => (
          <TabsTrigger
            key={option.value}
            value={option.value}
            disabled={disabled}
            className={cn(
              "h-9 rounded-none px-3 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
              index < notificationCategoryOptions.length - 1 ? "border-r border-border" : null,
            )}
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
      <TabsList className="h-9 rounded-none border border-border bg-background p-0">
        {statusOptions.map((option, index) => (
          <TabsTrigger
            key={option.value}
            value={option.value}
            disabled={disabled}
            className={cn(
              "h-9 rounded-none px-3 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
              index < statusOptions.length - 1 ? "border-r border-border" : null,
            )}
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
        "grid grid-cols-[42px_minmax(0,1fr)] border-b border-border bg-background transition-colors hover:bg-background-soft/60 sm:grid-cols-[48px_minmax(0,1fr)]",
        isUnread ? "bg-primary/5" : null,
      )}
    >
      <div className="border-r border-border bg-background-soft/45 px-2 py-3">
        <div
          className={cn(
            "flex size-8 items-center justify-center border",
            isUnread
              ? "border-primary text-primary"
              : "border-border text-muted-foreground",
          )}
        >
          {renderCategoryIcon(category)}
        </div>
      </div>

      <div className="min-w-0 px-3 py-3 sm:px-4">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5 text-muted-foreground">
          <span className="font-semibold text-foreground">
            {formatCategory(category)}
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
          <span>{formatDate(notification.created_at)}</span>
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
              className="h-8 px-2 text-xs"
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
      className="inline-flex h-8 items-center gap-1.5 px-2 font-semibold transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
    <aside className="border-t border-border bg-background-soft/45 px-4 py-5 xl:border-l xl:border-t-0">
      <div className="sticky top-20 space-y-5">
        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">通知范围</h2>
          <div className="mt-3 divide-y divide-border border-y border-border">
            <InfoRow label="状态" value={formatStatus(status)} />
            <InfoRow label="分类" value={formatCategory(category)} />
            <InfoRow
              label="未读"
              value={formatRailCount(isAuthenticated, unreadSummaryPending, unreadCount)}
            />
          </div>
        </section>

        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">分类未读</h2>
          <div className="mt-3 divide-y divide-border border-y border-border">
            {notificationCategoryOptions.map((option) => (
              <InfoRow
                key={option.value}
                active={category === option.value}
                label={option.label}
                value={formatRailCount(
                  isAuthenticated,
                  unreadSummaryPending,
                  categoryCounts[option.value],
                )}
              />
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold">继续浏览</h2>
          <div className="mt-3 flex flex-col border-y border-border">
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

function getNotificationCategory(notification: Notification): NotificationCategory {
  const value = [
    notification.type,
    notification.source_type,
    notification.title,
  ]
    .join(" ")
    .toLowerCase();

  if (value.includes("mention") || value.includes("at_") || value.includes("@")) {
    return "mentions";
  }

  if (
    value.includes("like") ||
    value.includes("upvote") ||
    value.includes("vote") ||
    value.includes("reaction") ||
    value.includes("赞")
  ) {
    return "likes";
  }

  if (
    value.includes("reply") ||
    value.includes("comment") ||
    value.includes("评论") ||
    value.includes("回复")
  ) {
    return "replies";
  }

  return "system";
}

function renderCategoryIcon(category: NotificationCategory) {
  switch (category) {
    case "replies":
      return <MessageSquare className="size-4" aria-hidden="true" />;
    case "mentions":
      return <AtSign className="size-4" aria-hidden="true" />;
    case "likes":
      return <Heart className="size-4" aria-hidden="true" />;
    case "system":
      return <Shield className="size-4" aria-hidden="true" />;
    default:
      return <Bell className="size-4" aria-hidden="true" />;
  }
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

function formatCategory(category: NotificationCategory) {
  switch (category) {
    case "replies":
      return "回复";
    case "mentions":
      return "@";
    case "likes":
      return "赞";
    case "system":
      return "系统";
    default:
      return "全部";
  }
}

function formatEmptyTitle(
  status: NotificationStatus,
  category: NotificationCategory,
) {
  if (category !== "all") {
    return `没有${formatCategory(category)}通知`;
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
    return `后端当前没有返回${formatStatus(status)}范围内的${formatCategory(category)}通知。`;
  }

  return "有新的回复、@、赞或系统消息时，会出现在这里。";
}

function formatNotificationType(type: string) {
  switch (type) {
    case "post_reply":
      return "帖子回复";
    case "comment_reply":
      return "评论回复";
    case "post_like":
      return "帖子点赞";
    case "comment_like":
      return "评论点赞";
    case "system":
      return "系统";
    case "reply":
      return "回复";
    case "mention":
      return "@";
    case "like":
    case "reaction":
      return "赞";
    case "moderation":
      return "审核";
    case "community_application":
      return "社区申请";
    default:
      return type || "通知";
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
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

const emptyUnreadSummary: UnreadSummaryResponse = {
  likes: 0,
  mentions: 0,
  replies: 0,
  system: 0,
  total: 0,
};

function getCategoryCounts(summary: UnreadSummaryResponse) {
  return {
    all: summary.total,
    likes: summary.likes,
    mentions: summary.mentions,
    replies: summary.replies,
    system: summary.system,
  } satisfies Record<NotificationCategory, number>;
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
