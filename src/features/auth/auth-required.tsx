"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { InfoRow, StatusToken } from "@/components/ui/data-display";
import { TextAction } from "@/components/ui/text-action";
import { useAuthSession } from "@/features/auth/auth-session";
import { useCurrentUserQuery } from "@/features/auth/queries";
import { cn } from "@/lib/utils";

type AuthRequiredProps = {
  children: ReactNode;
  className?: string;
  description: string;
  title: string;
};

export function AuthRequired({
  children,
  className,
  description,
  title,
}: AuthRequiredProps) {
  const pathname = usePathname();
  const { token } = useAuthSession();
  const currentUserQuery = useCurrentUserQuery();
  const next = pathname || "/";
  const loginHref = `/login?next=${encodeURIComponent(next)}`;
  const registerHref = `/register?next=${encodeURIComponent(next)}`;

  if (!token) {
    return (
      <AuthPanel
        className={className}
        eyebrow="需要登录"
        title={title}
        description={description}
        rows={[
          ["当前状态", "未登录"],
          ["下一步", "登录或注册后继续"],
        ]}
        actions={
          <div className="border-y border-border">
            <TextAction href={loginHref} tone="primary" variant="bar">
              去登录
            </TextAction>
            <TextAction href={registerHref} variant="bar">
              创建账号
            </TextAction>
          </div>
        }
      />
    );
  }

  if (currentUserQuery.isLoading) {
    return (
      <AuthPanel
        className={className}
        eyebrow="正在确认"
        title="正在确认登录状态"
        description="系统正在读取当前账号信息，确认后会显示操作表单。"
        rows={[
          ["当前状态", "验证中"],
          ["下一步", "保留当前页面"],
        ]}
        actions={<AuthSkeleton />}
      />
    );
  }

  if (currentUserQuery.isError || !currentUserQuery.data) {
    return (
      <AuthPanel
        className={className}
        eyebrow="验证失败"
        title="无法确认当前账号"
        description="请重试当前登录状态。如果仍然失败，可以重新登录后继续这个操作。"
        rows={[
          ["当前状态", "不可用"],
          ["下一步", "重试或重新登录"],
        ]}
        actions={
          <div className="flex flex-col gap-3 border-y border-border py-4 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" onClick={() => currentUserQuery.refetch()}>
              重试
            </Button>
            <TextAction href={loginHref}>重新登录</TextAction>
          </div>
        }
      />
    );
  }

  return <div className={className}>{children}</div>;
}

function AuthPanel({
  actions,
  className,
  description,
  eyebrow,
  rows,
  title,
}: {
  actions: ReactNode;
  className?: string;
  description: string;
  eyebrow: string;
  rows: Array<[string, string]>;
  title: string;
}) {
  return (
    <section className={cn("border-y border-border py-4", className)}>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_240px]">
        <div className="min-w-0">
          <StatusToken tone={getAuthPanelTone(eyebrow)}>{eyebrow}</StatusToken>
          <h2 className="mt-3 break-words text-base font-semibold leading-6 tracking-normal">
            {title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
        <div className="divide-y divide-border border-y border-border">
          {rows.map(([label, value]) => (
            <InfoRow
              key={label}
              className="px-0"
              label={label}
              value={value}
            />
          ))}
        </div>
      </div>
      <div className="mt-4">{actions}</div>
    </section>
  );
}

function AuthSkeleton() {
  return (
    <div
      className="space-y-3 border-y border-border py-4"
      aria-label="正在加载账号"
    >
      <div className="h-4 w-40 animate-pulse bg-muted" />
      <div className="h-4 w-64 max-w-full animate-pulse bg-muted" />
      <div className="h-10 w-28 animate-pulse bg-muted" />
    </div>
  );
}

function getAuthPanelTone(eyebrow: string) {
  switch (eyebrow) {
    case "验证失败":
      return "danger";
    case "正在确认":
      return "primary";
    default:
      return "default";
  }
}
