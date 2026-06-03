"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Bell, Check, CircleDot } from "lucide-react";

import { PageNav } from "@/components/app-shell/page-nav";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { MetricBlock, StatusToken } from "@/components/ui/data-display";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TextAction } from "@/components/ui/text-action";
import { useAuthSession } from "@/features/auth/auth-session";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

import {
  useMarkNotificationReadMutation,
  useNotificationsQuery,
} from "./queries";
import type { Notification, NotificationStatus } from "./types";

const statusOptions: Array<{ label: string; value: NotificationStatus }> = [
  { label: "未读", value: "unread" },
  { label: "全部", value: "all" },
  { label: "已读", value: "read" },
];

export function NotificationCenter() {
  const { isReady, token } = useAuthSession();
  const [status, setStatus] = useState<NotificationStatus>("unread");
  const canLoadNotifications = isReady && Boolean(token);
  const notificationsQuery = useNotificationsQuery(
    { limit: 20, offset: 0, status },
    canLoadNotifications,
  );
  const markReadMutation = useMarkNotificationReadMutation();
  const notifications = notificationsQuery.data?.notifications ?? [];
  const unreadCount = notifications.filter((notification) => !notification.read_at).length;
  const loginHref = `/login?next=${encodeURIComponent("/notifications")}`;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-[1180px] px-4 py-6 md:px-6">
        <PageNav backHref="/" backLabel="返回最新讨论" />

        <header className="border-b border-border pb-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div className="min-w-0">
              <div className="font-mono text-xs uppercase text-primary">
                CUMT NEXUS / 通知
              </div>
              <h1 className="mt-4 text-5xl font-black leading-[0.95] tracking-normal text-foreground md:text-6xl">
                通知中心
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
                查看回复、系统和审核相关通知。当前版本使用轮询查询，不伪造实时推送。
              </p>
            </div>

            <div className="grid grid-cols-3 border border-border text-center">
              <MetricBlock
                label="当前"
                value={canLoadNotifications ? String(notifications.length) : "--"}
              />
              <MetricBlock
                label="未读"
                value={canLoadNotifications ? String(unreadCount) : "--"}
              />
              <MetricBlock label="范围" value={formatStatus(status)} />
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 border-y border-border py-4 sm:flex-row sm:items-center sm:justify-between">
            <StatusTabs
              disabled={!isReady || notificationsQuery.isFetching}
              onStatusChange={setStatus}
              status={status}
            />
            <p className="text-sm leading-6 text-muted-foreground">
              标记已读会调用后端接口并刷新列表。
            </p>
          </div>
        </header>

        <section className="py-5">
          {!isReady ? (
            <div className="border-b border-border pb-5">
              <LoadingState rows={3} />
            </div>
          ) : null}

          {isReady && !token ? (
            <EmptyState
              title="登录后查看通知"
              description="通知和当前账号绑定，登录后可以查看未读状态并标记已读。"
              action={
                <TextAction href={loginHref} tone="primary">
                  登录
                </TextAction>
              }
            />
          ) : null}

          {canLoadNotifications && notificationsQuery.isPending ? (
            <div className="border-b border-border pb-5">
              <LoadingState rows={5} />
            </div>
          ) : null}

          {canLoadNotifications && notificationsQuery.isError ? (
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
          ) : null}

          {canLoadNotifications &&
          notificationsQuery.isSuccess &&
          notifications.length === 0 ? (
            <EmptyState
              title={formatEmptyTitle(status)}
              description="有新的回复、系统消息或审核结果时，会出现在这里。"
              action={<TextAction href="/">回到信息流</TextAction>}
            />
          ) : null}

          {canLoadNotifications &&
          notificationsQuery.isSuccess &&
          notifications.length > 0 ? (
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0 divide-y divide-border border-b border-border">
                {notifications.map((notification, index) => (
                  <NotificationRow
                    key={notification.id}
                    index={index}
                    isMarkingRead={
                      markReadMutation.isPending &&
                      markReadMutation.variables === notification.id
                    }
                    notification={notification}
                    onMarkRead={() => markReadMutation.mutate(notification.id)}
                  />
                ))}
              </div>

              <aside className="border-t border-border pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                <div className="sticky top-6 space-y-6">
                  <section className="border-b border-border pb-6">
                    <div className="font-mono text-xs uppercase text-muted-foreground">
                      通知范围
                    </div>
                    <h2 className="mt-3 text-2xl font-black">
                      {formatStatus(status)}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      通知来源由后端 `source_type` 和 `source_id` 决定。未知来源会保留原始来源信息。
                    </p>
                  </section>
                  <section>
                    <h2 className="text-sm font-semibold">稳定出口</h2>
                    <div className="mt-3 flex flex-col border-y border-border">
                      <TextAction href="/" variant="bar">
                        最新讨论
                      </TextAction>
                      <TextAction href="/search" variant="bar">
                        搜索内容
                      </TextAction>
                    </div>
                  </section>
                </div>
              </aside>
            </div>
          ) : null}
        </section>
      </div>
    </main>
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
      <TabsList className="rounded-none border-border bg-background p-0">
        {statusOptions.map((option, index) => (
          <TabsTrigger
            key={option.value}
            value={option.value}
            disabled={disabled}
            className={cn(
              "rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
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
  index,
  isMarkingRead,
  notification,
  onMarkRead,
}: {
  index: number;
  isMarkingRead: boolean;
  notification: Notification;
  onMarkRead: () => void;
}) {
  const isUnread = !notification.read_at;
  const targetHref = getNotificationTargetHref(notification);

  return (
    <article
      className={cn(
        "grid gap-4 py-5 md:grid-cols-[56px_minmax(0,1fr)_160px]",
        isUnread ? "bg-primary/5" : null,
      )}
    >
      <div className="flex items-center gap-3 md:block">
        <div className="font-mono text-xs text-muted-foreground">
          {String(index + 1).padStart(2, "0")}
        </div>
        <div
          className={cn(
            "mt-0 flex size-8 items-center justify-center border md:mt-4",
            isUnread
              ? "border-primary text-primary"
              : "border-border text-muted-foreground",
          )}
        >
          {isUnread ? (
            <CircleDot className="size-4" aria-hidden="true" />
          ) : (
            <Bell className="size-4" aria-hidden="true" />
          )}
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StatusToken tone={isUnread ? "primary" : "default"}>
            {isUnread ? "未读" : "已读"}
          </StatusToken>
          <StatusToken>{formatNotificationType(notification.type)}</StatusToken>
          <span className="text-xs text-muted-foreground">
            {formatDate(notification.created_at)}
          </span>
        </div>
        <h2 className="mt-3 break-words text-xl font-semibold leading-7">
          {notification.title}
        </h2>
        <p className="mt-2 max-w-3xl break-words text-sm leading-6 text-muted-foreground">
          {notification.body || "暂无通知正文。"}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="border border-border px-2 py-0.5 font-mono">
            {notification.source_type || "unknown"}
          </span>
          <span className="font-mono">{notification.source_id || "--"}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-end md:justify-center">
        {targetHref ? (
          <Link
            href={targetHref}
            className="group inline-flex h-9 items-center gap-2 border border-border px-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            查看来源
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
        ) : null}
        {isUnread ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isMarkingRead}
            onClick={onMarkRead}
          >
            <Check className="size-4" aria-hidden="true" />
            {isMarkingRead ? "处理中" : "标记已读"}
          </Button>
        ) : null}
      </div>
    </article>
  );
}

function getNotificationTargetHref(notification: Notification) {
  const sourceType = notification.source_type.toLowerCase();
  const sourceId = notification.source_id.trim();

  if (!sourceId) {
    return null;
  }

  if (sourceType === "post" || sourceType === "posts") {
    return `/posts/${encodeURIComponent(sourceId)}`;
  }

  if (sourceType === "community" || sourceType === "communities") {
    return `/communities/${encodeURIComponent(sourceId)}`;
  }

  if (sourceType === "report" || sourceType === "moderation_report") {
    return `/moderation/reports/${encodeURIComponent(sourceId)}`;
  }

  return null;
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

function formatEmptyTitle(status: NotificationStatus) {
  switch (status) {
    case "read":
      return "还没有已读通知";
    case "all":
      return "还没有通知";
    default:
      return "没有未读通知";
  }
}

function formatNotificationType(type: string) {
  switch (type) {
    case "system":
      return "系统";
    case "reply":
      return "回复";
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
