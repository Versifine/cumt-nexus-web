"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { StatusToken } from "@/components/ui/data-display";
import { TextAction } from "@/components/ui/text-action";
import { useAuthSession } from "@/features/auth/auth-session";
import { useCurrentUserQuery } from "@/features/auth/queries";
import { cn } from "@/lib/utils";

type AuthRequiredProps = {
  children: ReactNode;
  className?: string;
  description: string;
  nextPath?: string;
  title: string;
};

export function AuthRequired({
  children,
  className,
  description,
  nextPath,
  title,
}: AuthRequiredProps) {
  const pathname = usePathname();
  const { token } = useAuthSession();
  const currentUserQuery = useCurrentUserQuery();
  const next = nextPath ?? pathname ?? "/";
  const loginHref = `/login?next=${encodeURIComponent(next)}`;
  const registerHref = `/register?next=${encodeURIComponent(next)}`;

  if (!token) {
    return (
      <AuthPanel
        className={className}
        eyebrow="需要登录"
        title={title}
        description={description}
        detail="当前状态：未登录。登录或注册后会回到这里继续。"
        actions={
          <div className="flex flex-wrap gap-4 border-t border-border pt-4">
            <TextAction href={loginHref} tone="primary">
              去登录
            </TextAction>
            <TextAction href={registerHref}>
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
        detail="当前状态：验证中。确认后会保留当前页面。"
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
        detail="当前状态：不可用。可以重试当前会话，或重新登录。"
        actions={
          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center">
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
  detail,
  eyebrow,
  title,
}: {
  actions: ReactNode;
  className?: string;
  description: string;
  detail: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className={cn("rounded-md bg-surface px-4 py-5 ring-1 ring-border/60", className)}>
      <div className="min-w-0">
        <StatusToken tone={getAuthPanelTone(eyebrow)}>{eyebrow}</StatusToken>
        <h2 className="mt-3 break-words text-base font-semibold leading-6 tracking-normal">
          {title}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
        <p className="mt-3 max-w-2xl text-xs leading-5 text-muted-foreground">
          {detail}
        </p>
      </div>
      <div className="mt-4">{actions}</div>
    </section>
  );
}

function AuthSkeleton() {
  return (
    <div
      className="space-y-3 border-t border-border pt-4"
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
