import type { ReactNode } from "react";
import Link from "next/link";
import { CalendarDays, FileText, MessageSquare, User } from "lucide-react";

import { InfoRow, StatusToken } from "@/components/ui/data-display";
import { TextAction } from "@/components/ui/text-action";
import { cn } from "@/lib/utils";

import type { PublicUser } from "./types";

export type PublicUserProfileTab = "comments" | "overview" | "posts";

type PublicUserLayoutProps = {
  activeTab: PublicUserProfileTab;
  children: ReactNode;
  railContent?: ReactNode;
  user: PublicUser;
};

const profileTabs: Array<{
  label: string;
  value: PublicUserProfileTab;
}> = [
  { label: "资料", value: "overview" },
  { label: "帖子", value: "posts" },
  { label: "评论", value: "comments" },
];

export function PublicUserLayout({
  activeTab,
  children,
  railContent,
  user,
}: PublicUserLayoutProps) {
  return (
    <div className="grid grid-cols-1 gap-0 py-4 xl:grid-cols-[minmax(0,1fr)_312px]">
      <div className="min-w-0">
        <TextAction href="/" variant="bar">
          返回信息流
        </TextAction>

        <section className="mt-3 border border-border bg-background">
          <PublicUserHeader activeTab={activeTab} user={user} />
        </section>

        {children}
      </div>

      <PublicUserRail user={user}>{railContent}</PublicUserRail>
    </div>
  );
}

export function PublicUserHeader({
  activeTab,
  user,
}: {
  activeTab: PublicUserProfileTab;
  user: PublicUser;
}) {
  const displayName = getDisplayName(user);

  return (
    <div>
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

      <nav
        className="grid grid-cols-3 border-t border-border text-sm"
        aria-label={`${displayName} 的主页内容`}
      >
        {profileTabs.map((item) => {
          const isActive = item.value === activeTab;

          return (
            <Link
              key={item.value}
              href={getProfileTabHref(user.username, item.value)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "border-r border-border px-3 py-3 text-center font-semibold transition-colors last:border-r-0 hover:bg-background-soft hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                isActive
                  ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                  : "text-muted-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function PublicUserRail({
  children,
  user,
}: {
  children?: ReactNode;
  user: PublicUser;
}) {
  return (
    <aside className="border-t border-border bg-background-soft/45 px-4 py-5 xl:border-l xl:border-t-0">
      <div className="sticky top-20 space-y-5">
        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">关于</h2>
          <div className="mt-3 flex min-w-0 items-center gap-3">
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
          <p className="mt-3 line-clamp-4 text-sm leading-6 text-muted-foreground">
            {user.bio || user.headline || "这个用户还没有填写公开简介。"}
          </p>
        </section>

        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">公开统计</h2>
          <div className="mt-3 divide-y divide-border border-y border-border">
            <InfoRow
              icon={<FileText className="size-4" aria-hidden="true" />}
              label="帖子"
              value={String(user.stats.post_count)}
            />
            <InfoRow
              icon={<MessageSquare className="size-4" aria-hidden="true" />}
              label="评论"
              value={String(user.stats.comment_count)}
            />
            <InfoRow
              icon={<CalendarDays className="size-4" aria-hidden="true" />}
              label="加入"
              value={formatDate(user.created_at)}
            />
          </div>
        </section>

        {children}

        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">徽章和身份</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {[...user.roles, ...user.badges].length > 0 ? (
              [...user.roles, ...user.badges].map((item) => (
                <StatusToken key={item} tone="primary">
                  {item}
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
          <h2 className="text-sm font-semibold">内容入口</h2>
          <div className="mt-3 flex flex-col border-y border-border">
            <TextAction
              href={getProfileTabHref(user.username, "posts")}
              variant="bar"
            >
              公开帖子
            </TextAction>
            <TextAction
              href={getProfileTabHref(user.username, "comments")}
              variant="bar"
            >
              公开评论
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

export function ProfileMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-border p-2 last:border-r-0">
      <div className="font-mono text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}

export function ProfileAvatar({
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

export function getDisplayName(user: PublicUser) {
  return user.display_name || user.username;
}

export function formatUserStatus(status: string) {
  switch (status) {
    case "active":
      return "正常";
    case "disabled":
      return "已停用";
    default:
      return status;
  }
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function getProfileTabHref(
  username: string,
  tab: PublicUserProfileTab,
) {
  const baseHref = `/users/${encodeURIComponent(username)}`;

  switch (tab) {
    case "posts":
      return `${baseHref}/posts`;
    case "comments":
      return `${baseHref}/comments`;
    default:
      return baseHref;
  }
}
