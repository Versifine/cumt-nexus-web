"use client";

import { useState } from "react";
import Link from "next/link";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { TextAction } from "@/components/ui/text-action";
import { useAuthSession } from "@/features/auth/auth-session";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

import {
  getNotificationCategoryHref,
  notificationCategoryOptions,
} from "./categories";
import {
  formatNotificationCategory,
  formatNotificationDate,
  formatNotificationType,
  renderNotificationCategoryIcon,
} from "./display";
import {
  formatNotificationMessage,
  getNotificationActor,
  mergeLikeNotifications,
  type DisplayNotification,
  type NotificationActorView,
} from "./grouping";
import { useNotificationsQuery } from "./queries";
import type { NotificationCategory } from "./types";
import { resolveNotificationTarget } from "./targets";

const PAGE_SIZE = 20;

type NotificationCenterProps = {
  initialCategory?: NotificationCategory;
};

export function NotificationCenter({
  initialCategory = "interactions",
}: NotificationCenterProps) {
  const { isReady, token } = useAuthSession();
  const [offset, setOffset] = useState(0);
  const category = initialCategory;
  const canLoadNotifications = isReady && Boolean(token);
  const notificationsQuery = useNotificationsQuery(
    { category, limit: PAGE_SIZE, offset },
    canLoadNotifications,
  );
  const notifications = mergeLikeNotifications(
    notificationsQuery.data?.notifications ?? [],
  );
  const currentCategoryHref = getNotificationCategoryHref(category);
  const loginHref = `/login?next=${encodeURIComponent(currentCategoryHref)}`;
  const isLoadingFirstPage =
    canLoadNotifications && notificationsQuery.isPending && offset === 0;
  const isLoadingPage = canLoadNotifications && notificationsQuery.isFetching;
  const hasMore = notificationsQuery.data?.has_more ?? false;
  const hasPrevious = offset > 0;
  const nextOffset = notificationsQuery.data?.next_offset ?? offset + PAGE_SIZE;
  const previousOffset = Math.max(0, offset - PAGE_SIZE);

  return (
    <section className="mx-auto w-full max-w-3xl bg-background">
      <NotificationHeader category={category} />
      <NotificationCategoryNav category={category} />

      {!isReady ? (
        <div className="border-b border-border p-4">
          <LoadingState rows={3} />
        </div>
      ) : null}

      {isReady && !token ? (
        <div className="border-b border-border p-4">
          <EmptyState
            title="登录后查看消息"
            description="回复、@、赞和系统通知会跟随账号同步。"
            action={
              <TextAction href={loginHref} tone="primary">
                登录
              </TextAction>
            }
          />
        </div>
      ) : null}

      {isLoadingFirstPage ? (
        <div className="border-b border-border p-4">
          <LoadingState rows={6} />
        </div>
      ) : null}

      {canLoadNotifications && notificationsQuery.isError ? (
        <div className="border-b border-border p-4">
          <ErrorState
            title={getErrorTitle(notificationsQuery.error, category)}
            description={getErrorDescription(notificationsQuery.error, category)}
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
            title={`还没有${formatNotificationCategory(category)}`}
            description={getEmptyDescription(category)}
            action={<TextAction href="/">回到信息流</TextAction>}
          />
        </div>
      ) : null}

      {canLoadNotifications && notifications.length > 0 ? (
        <>
          <div className="border-b border-border">
            {notifications.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
              />
            ))}
          </div>

          <NotificationPagination
            hasMore={hasMore}
            hasPrevious={hasPrevious}
            isLoadingPage={isLoadingPage}
            offset={offset}
            pageCount={notifications.length}
            onNext={() => setOffset(nextOffset)}
            onPrevious={() => setOffset(previousOffset)}
          />
        </>
      ) : null}
    </section>
  );
}

function NotificationHeader({ category }: { category: NotificationCategory }) {
  return (
    <header className="border-b border-border py-4">
      <div className="flex min-w-0 items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold leading-8 tracking-normal text-foreground">
            消息
          </h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {formatNotificationCategory(category)}
          </p>
        </div>
        <TextAction href="/" variant="bar">
          返回信息流
        </TextAction>
      </div>
    </header>
  );
}

function NotificationCategoryNav({
  category,
}: {
  category: NotificationCategory;
}) {
  return (
    <nav
      aria-label="消息类型"
      className="flex min-w-0 items-center gap-2 overflow-x-auto border-b border-border py-3"
    >
      {notificationCategoryOptions.map((option) => {
        const isActive = option.value === category;

        return (
          <Link
            key={option.value}
            href={getNotificationCategoryHref(option.value)}
            className={cn(
              "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
            )}
          >
            {renderNotificationCategoryIcon(option.value)}
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}

function NotificationRow({
  notification,
}: {
  notification: DisplayNotification;
}) {
  const target = resolveNotificationTarget(notification);
  const actor = getNotificationActor(notification);
  const message = formatNotificationMessage(notification);
  const content = (
    <>
      <NotificationAvatar actor={actor} />
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 truncate text-sm font-semibold text-foreground">
            {actor.displayName}
          </span>
        </div>
        <h2 className="mt-1 break-words text-sm leading-6 text-foreground">
          {message}
        </h2>
        <p className="mt-1 flex min-w-0 items-center gap-2 text-xs leading-5 text-muted-foreground">
          <span className="truncate">
            {formatNotificationType(notification.type)}
          </span>
          <span aria-hidden="true">·</span>
          <span className="shrink-0">
            {formatNotificationDate(notification.created_at)}
          </span>
        </p>
      </div>
    </>
  );

  if (!target.href) {
    return (
      <article className="grid grid-cols-[48px_minmax(0,1fr)] gap-3 border-b border-border px-1 py-4 last:border-b-0">
        {content}
      </article>
    );
  }

  return (
    <Link
      href={target.href}
      className="grid grid-cols-[48px_minmax(0,1fr)] gap-3 border-b border-border px-1 py-4 transition-colors last:border-b-0 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {content}
    </Link>
  );
}

function NotificationAvatar({ actor }: { actor: NotificationActorView }) {
  if (actor.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={actor.avatarUrl}
        alt={`${actor.displayName}头像`}
        className="size-12 shrink-0 rounded-full border border-border object-cover"
      />
    );
  }

  return (
    <div className="flex size-12 shrink-0 items-center justify-center rounded-full border border-border bg-muted/40 text-sm font-semibold text-primary">
      {actor.initial}
    </div>
  );
}

function NotificationPagination({
  hasMore,
  hasPrevious,
  isLoadingPage,
  offset,
  onNext,
  onPrevious,
  pageCount,
}: {
  hasMore: boolean;
  hasPrevious: boolean;
  isLoadingPage: boolean;
  offset: number;
  onNext: () => void;
  onPrevious: () => void;
  pageCount: number;
}) {
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs leading-5 text-muted-foreground">
        第 {Math.floor(offset / PAGE_SIZE) + 1} 页，显示 {pageCount} 条消息
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!hasPrevious || isLoadingPage}
          onClick={onPrevious}
        >
          上一页
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!hasMore || isLoadingPage}
          onClick={onNext}
        >
          {isLoadingPage && hasMore ? "加载中" : "下一页"}
        </Button>
      </div>
    </div>
  );
}

function getEmptyDescription(category: NotificationCategory) {
  if (category === "system") {
    return "系统通知会出现在这里。";
  }

  return "有人回复、@ 或赞你时，会出现在这里。";
}

function isUnauthenticated(error: Error | null) {
  return error instanceof ApiError && error.code === "unauthenticated";
}

function getErrorTitle(error: Error | null, category: NotificationCategory) {
  if (isUnauthenticated(error)) {
    return "需要登录";
  }

  if (category === "interactions") {
    return "互动消息接口未就绪";
  }

  return "无法加载消息";
}

function getErrorDescription(error: Error | null, category: NotificationCategory) {
  if (category === "interactions") {
    return "需要后端提供 category=interactions 的通知分类，前端不会用 all 或细分类假合并。";
  }

  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}
