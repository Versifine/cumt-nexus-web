"use client";

import Link from "next/link";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { InfoRow } from "@/components/ui/data-display";
import { TextAction } from "@/components/ui/text-action";
import { useAuthSession } from "@/features/auth/auth-session";
import { ApiError } from "@/lib/api/client";

import {
  PublicUserLayout,
  formatDate,
  formatUserStatus,
  getDisplayName,
} from "./public-user-layout";
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
    <PublicUserLayout activeTab="overview" user={user}>
      <section className="mt-3 border-x border-border bg-background">
        <div className="border-b border-border px-3 py-3 sm:px-4">
          <h2 className="text-sm font-semibold">公开资料</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            用户身份、简介和公开内容入口都保留在同一个主页语境里。
          </p>
        </div>
        <ProfileDetails user={user} />
      </section>
    </PublicUserLayout>
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
        <h3 className="text-sm font-semibold">内容时间线</h3>
        <div className="mt-3 grid gap-0 border-y border-border sm:grid-cols-2">
          <ProfileTimelineLink
            href={`/users/${encodeURIComponent(user.username)}/posts`}
            label="公开帖子"
            meta={`${user.stats.post_count} 条`}
            text="按统一帖子卡片展示这个用户发布过的公开内容。"
          />
          <ProfileTimelineLink
            href={`/users/${encodeURIComponent(user.username)}/comments`}
            label="公开评论"
            meta={`${user.stats.comment_count} 条`}
            text="按时间线展示这个用户留下的公开评论。"
          />
        </div>
      </section>
    </div>
  );
}

function ProfileTimelineLink({
  href,
  label,
  meta,
  text,
}: {
  href: string;
  label: string;
  meta: string;
  text: string;
}) {
  return (
    <Link
      href={href}
      className="border-b border-border px-3 py-3 transition-colors hover:bg-background-soft/70 sm:border-b-0 sm:border-r sm:last:border-r-0"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className="font-mono text-xs text-muted-foreground">{meta}</span>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </Link>
  );
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
