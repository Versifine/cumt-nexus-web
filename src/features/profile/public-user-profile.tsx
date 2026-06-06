"use client";

import { CalendarDays, MessageSquare, User } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { InfoRow, MetricBlock, StatusToken } from "@/components/ui/data-display";
import { TextAction } from "@/components/ui/text-action";
import { useAuthSession } from "@/features/auth/auth-session";
import { ApiError } from "@/lib/api/client";

import { usePublicUserQuery } from "./queries";
import type { PublicUser } from "./types";

type PublicUserProfileProps = {
  username: string;
};

export function PublicUserProfile({ username }: PublicUserProfileProps) {
  const { isReady } = useAuthSession();
  const profileQuery = usePublicUserQuery(username, isReady);
  const user = profileQuery.data?.user;

  return (
    <>
      <section className="border-b border-border pb-6">
        {!isReady || profileQuery.isPending ? (
          <LoadingState rows={3} />
        ) : profileQuery.isError ? (
          isNotFound(profileQuery.error) ? (
            <EmptyState
              title="没有找到这个用户"
              description="这个用户名不存在，或该账号当前不可公开访问。"
              action={
                <TextAction href="/" tone="primary">
                  返回信息流
                </TextAction>
              }
            />
          ) : (
            <ErrorState
              title={getErrorTitle(profileQuery.error)}
              description={getErrorDescription(profileQuery.error)}
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => profileQuery.refetch()}
                >
                  重试
                </Button>
              }
            />
          )
        ) : user ? (
          <ProfileHero user={user} />
        ) : null}
      </section>

      {user ? (
        <section className="grid gap-8 py-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <ProfileSummary user={user} />
          <ProfileRail user={user} />
        </section>
      ) : null}
    </>
  );
}

function ProfileHero({ user }: { user: PublicUser }) {
  const displayName = getDisplayName(user);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
      <div className="min-w-0">
        <div className="font-mono text-xs uppercase text-primary">
          CUMT NEXUS / 用户主页
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <StatusToken tone="primary">@{user.username}</StatusToken>
          <StatusToken tone={user.status === "active" ? "success" : "warning"}>
            {formatUserStatus(user.status)}
          </StatusToken>
          {user.roles.length > 0 ? (
            user.roles.map((role) => <StatusToken key={role}>{role}</StatusToken>)
          ) : (
            <StatusToken>公开资料</StatusToken>
          )}
        </div>

        <div className="mt-5 flex items-end gap-4">
          <ProfileAvatar user={user} size="large" />
          <div className="min-w-0">
            <h1 className="break-words text-5xl font-black leading-[0.95] tracking-normal text-foreground md:text-6xl">
              {displayName}
            </h1>
            <p className="mt-3 break-words font-mono text-sm text-primary">
              @{user.username}
            </p>
          </div>
        </div>

        <p className="mt-5 max-w-3xl text-sm leading-6 text-muted-foreground">
          {user.headline || "这个用户还没有写个人签名。"}
        </p>
      </div>

      <div className="grid grid-cols-3 border border-border text-center">
        <MetricBlock label="帖子" value={String(user.stats.post_count)} />
        <MetricBlock label="评论" value={String(user.stats.comment_count)} />
        <MetricBlock label="加入" value={formatDate(user.created_at)} />
      </div>
    </div>
  );
}

function ProfileSummary({ user }: { user: PublicUser }) {
  return (
    <div className="min-w-0 space-y-8">
      <section>
        <div className="border-b border-border pb-3">
          <div className="font-mono text-xs uppercase text-primary">
            PROFILE / 公开资料
          </div>
          <h2 className="mt-2 text-2xl font-black tracking-normal">个人信息</h2>
        </div>

        <div className="divide-y divide-border border-b border-border">
          <InfoRow label="昵称" value={getDisplayName(user)} />
          <InfoRow label="用户名" value={`@${user.username}`} />
          <InfoRow label="状态" value={formatUserStatus(user.status)} />
          <InfoRow label="加入时间" value={formatDate(user.created_at)} />
        </div>
      </section>

      <section>
        <div className="border-b border-border pb-3">
          <div className="font-mono text-xs uppercase text-primary">
            BIO / 介绍
          </div>
          <h2 className="mt-2 text-2xl font-black tracking-normal">公开简介</h2>
        </div>
        <p className="border-b border-border py-5 text-sm leading-7 text-muted-foreground">
          {user.bio || "这个用户还没有填写公开简介。"}
        </p>
      </section>

      <section>
        <div className="border-b border-border pb-3">
          <div className="font-mono text-xs uppercase text-primary">
            ACTIVITY / 后续入口
          </div>
          <h2 className="mt-2 text-2xl font-black tracking-normal">公开动态</h2>
        </div>
        <div className="divide-y divide-border border-b border-border">
          <ComingSoonRow
            label="公开帖子"
            text="后端已有用户公开帖子接口；本切片先落地资料页，列表页后续单独拆。"
          />
          <ComingSoonRow
            label="公开评论"
            text="评论列表需要单独处理树状上下文和返回来源，后续再接。"
          />
        </div>
      </section>
    </div>
  );
}

function ProfileRail({ user }: { user: PublicUser }) {
  return (
    <aside className="border-t border-border pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
      <div className="sticky top-6 space-y-8">
        <section className="border-b border-border pb-6">
          <div className="font-mono text-xs uppercase text-muted-foreground">
            用户卡片
          </div>
          <div className="mt-4 flex items-center gap-3">
            <ProfileAvatar user={user} size="small" />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{getDisplayName(user)}</div>
              <div className="mt-1 truncate font-mono text-xs text-primary">
                @{user.username}
              </div>
            </div>
          </div>
          <div className="mt-4 divide-y divide-border border-y border-border">
            <InfoRow
              icon={<CalendarDays className="size-4" aria-hidden="true" />}
              label="加入"
              value={formatDate(user.created_at)}
            />
            <InfoRow
              icon={<MessageSquare className="size-4" aria-hidden="true" />}
              label="公开内容"
              value={`${user.stats.post_count + user.stats.comment_count}`}
            />
          </div>
        </section>

        <section className="border-b border-border pb-6">
          <h2 className="text-sm font-semibold">徽章</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {user.badges.length > 0 ? (
              user.badges.map((badge) => (
                <StatusToken key={badge} tone="primary">
                  {badge}
                </StatusToken>
              ))
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">
                暂无公开徽章。
              </p>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold">继续浏览</h2>
          <div className="mt-3 flex flex-col border-y border-border">
            <TextAction href="/" variant="bar">
              返回信息流
            </TextAction>
            <TextAction href="/communities" variant="bar">
              浏览社区
            </TextAction>
          </div>
        </section>
      </div>
    </aside>
  );
}

function ComingSoonRow({
  label,
  text,
}: {
  label: string;
  text: string;
}) {
  return (
    <div className="grid gap-3 py-4 sm:grid-cols-[160px_minmax(0,1fr)_auto]">
      <div className="font-semibold text-foreground">{label}</div>
      <p className="text-sm leading-6 text-muted-foreground">{text}</p>
      <StatusToken>后续接入</StatusToken>
    </div>
  );
}

function ProfileAvatar({
  size,
  user,
}: {
  size: "large" | "small";
  user: PublicUser;
}) {
  const sizeClass = size === "large" ? "size-20 text-2xl" : "size-12 text-lg";

  if (user.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatar_url}
        alt={`${getDisplayName(user)} 的头像`}
        className={`${sizeClass} shrink-0 rounded-full border border-border object-cover`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full border border-border bg-secondary font-black text-primary`}
      aria-label={`${getDisplayName(user)} 的头像占位`}
    >
      <User className="size-6" aria-hidden="true" />
    </div>
  );
}

function getDisplayName(user: PublicUser) {
  return user.display_name || user.username;
}

function formatUserStatus(status: string) {
  switch (status) {
    case "active":
      return "正常";
    case "disabled":
      return "已停用";
    default:
      return status;
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function isNotFound(error: Error | null) {
  return error instanceof ApiError && error.code === "not_found";
}

function isUnauthenticated(error: Error | null) {
  return error instanceof ApiError && error.code === "unauthenticated";
}

function getErrorTitle(error: Error | null) {
  if (isUnauthenticated(error)) {
    return "公开用户主页暂不可读";
  }

  return "无法加载用户主页";
}

function getErrorDescription(error: Error | null) {
  if (isUnauthenticated(error)) {
    return "前端已按公开读取请求用户主页；如果仍返回认证错误，需要后端保持 optional Bearer 公开读取合同。";
  }

  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}
