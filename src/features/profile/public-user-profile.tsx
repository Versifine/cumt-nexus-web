"use client";

import Link from "next/link";
import { CalendarDays, MessageSquare, User } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { InfoRow, StatusToken } from "@/components/ui/data-display";
import { TextAction } from "@/components/ui/text-action";
import { useAuthSession } from "@/features/auth/auth-session";
import { ApiError } from "@/lib/api/client";

import { usePublicUserQuery } from "./queries";
import type { GetPublicUserResponse, PublicUser } from "./types";

type PublicUserProfileProps = {
  initialData?: GetPublicUserResponse;
  username: string;
};

export function PublicUserProfile({
  initialData,
  username,
}: PublicUserProfileProps) {
  const { isReady } = useAuthSession();
  const profileQuery = usePublicUserQuery(username, isReady, initialData);
  const user = profileQuery.data?.user;

  if (!isReady || profileQuery.isPending) {
    return (
      <div className="py-4">
        <section className="border border-border bg-background p-4">
          <LoadingState rows={4} />
        </section>
      </div>
    );
  }

  if (profileQuery.isError) {
    return (
      <div className="py-4">
        <section className="border border-border bg-background p-4">
          {isNotFound(profileQuery.error) ? (
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
          )}
        </section>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-0 py-4 xl:grid-cols-[minmax(0,1fr)_312px]">
      <div className="min-w-0">
        <TextAction href="/" variant="bar">
          返回信息流
        </TextAction>

        <section className="mt-3 border border-border bg-background">
          <ProfileHeader user={user} />
        </section>

        <section className="mt-3 border-x border-border bg-background">
          <div className="border-b border-border px-3 py-3 sm:px-4">
            <h2 className="text-sm font-semibold">公开资料</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              昵称、签名、简介和公开内容入口。
            </p>
          </div>
          <ProfileDetails user={user} />
        </section>
      </div>

      <ProfileRail user={user} />
    </div>
  );
}

function ProfileHeader({ user }: { user: PublicUser }) {
  const displayName = getDisplayName(user);

  return (
    <div className="grid gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-3">
          <ProfileAvatar user={user} size="large" />
          <div className="min-w-0">
            <h1 className="break-words text-xl font-semibold leading-7 tracking-normal text-foreground sm:text-2xl">
              {displayName}
            </h1>
            <p className="mt-1 truncate font-mono text-xs text-primary">
              @{user.username}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusToken tone={user.status === "active" ? "success" : "warning"}>
            {formatUserStatus(user.status)}
          </StatusToken>
          {user.roles.length > 0 ? (
            user.roles.map((role) => <StatusToken key={role}>{role}</StatusToken>)
          ) : (
            <StatusToken>公开资料</StatusToken>
          )}
        </div>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          {user.headline || "这个用户还没有写个人签名。"}
        </p>
      </div>

      <div className="grid grid-cols-3 border border-border text-center">
        <ProfileMetric label="帖子" value={String(user.stats.post_count)} />
        <ProfileMetric label="评论" value={String(user.stats.comment_count)} />
        <ProfileMetric label="加入" value={formatDate(user.created_at)} />
      </div>
    </div>
  );
}

function ProfileMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-border p-2 last:border-r-0">
      <div className="font-mono text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}

function ProfileDetails({ user }: { user: PublicUser }) {
  return (
    <div className="divide-y divide-border border-b border-border">
      <section className="px-3 py-4 sm:px-4">
        <h3 className="text-sm font-semibold">个人信息</h3>
        <div className="mt-3 divide-y divide-border border-y border-border">
          <InfoRow label="昵称" value={getDisplayName(user)} />
          <InfoRow label="用户名" value={`@${user.username}`} />
          <InfoRow label="状态" value={formatUserStatus(user.status)} />
          <InfoRow label="加入时间" value={formatDate(user.created_at)} />
        </div>
      </section>

      <section className="px-3 py-4 sm:px-4">
        <h3 className="text-sm font-semibold">公开简介</h3>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          {user.bio || "这个用户还没有填写公开简介。"}
        </p>
      </section>

      <section className="px-3 py-4 sm:px-4">
        <h3 className="text-sm font-semibold">公开动态</h3>
        <div className="mt-3 divide-y divide-border border-y border-border">
          <ProfileLinkRow
            href={`/users/${encodeURIComponent(user.username)}/posts`}
            label="公开帖子"
            text="查看这个用户在公开社区发布过的可见帖子。"
          />
          <ProfileLinkRow
            href={`/users/${encodeURIComponent(user.username)}/comments`}
            label="公开评论"
            text="查看这个用户在公开帖子下留下的可见评论。"
          />
        </div>
      </section>
    </div>
  );
}

function ProfileRail({ user }: { user: PublicUser }) {
  return (
    <aside className="border-t border-border bg-background-soft/45 px-4 py-5 xl:border-l xl:border-t-0">
      <div className="sticky top-20 space-y-5">
        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">用户卡片</h2>
          <div className="mt-3 flex items-center gap-3">
            <ProfileAvatar user={user} size="small" />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">
                {getDisplayName(user)}
              </div>
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

        <section className="border-b border-border pb-5">
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
            <TextAction
              href={`/users/${encodeURIComponent(user.username)}/posts`}
              variant="bar"
            >
              查看帖子
            </TextAction>
            <TextAction
              href={`/users/${encodeURIComponent(user.username)}/comments`}
              variant="bar"
            >
              查看评论
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

function ProfileLinkRow({
  href,
  label,
  text,
}: {
  href: string;
  label: string;
  text: string;
}) {
  return (
    <Link
      href={href}
      className="block py-3 transition-colors hover:bg-background-soft/70"
    >
      <div className="text-sm font-semibold text-foreground">{label}</div>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
    </Link>
  );
}

function ProfileAvatar({
  size,
  user,
}: {
  size: "large" | "small";
  user: PublicUser;
}) {
  const sizeClass = size === "large" ? "size-14" : "size-10";

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
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-primary`}
      aria-label={`${getDisplayName(user)} 的头像占位`}
    >
      <User className="size-5" aria-hidden="true" />
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
    return "这个用户主页暂时无法公开读取。可以先登录，或稍后再试。";
  }

  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}
