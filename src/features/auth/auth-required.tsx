"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { TextAction } from "@/components/ui/text-action";
import { useAuthSession } from "@/features/auth/auth-session";
import { useCurrentUserQuery } from "@/features/auth/queries";
import { cn } from "@/lib/utils";

type AuthRequiredProps = {
  authenticatedLabel?: string;
  children: ReactNode;
  className?: string;
  description: string;
  title: string;
};

export function AuthRequired({
  authenticatedLabel = "身份已确认",
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

  return (
    <div className={className}>
      <div className="mb-5 grid gap-3 border-y border-border bg-background-soft/45 py-4 sm:grid-cols-[160px_minmax(0,1fr)]">
        <div className="px-4 sm:px-0">
          <div className="font-mono text-xs text-primary">AUTH / OK</div>
          <div className="mt-2 text-sm font-semibold text-foreground">
            {authenticatedLabel}
          </div>
        </div>
        <div className="min-w-0 px-4 text-sm leading-6 text-muted-foreground sm:px-0">
          当前账号{" "}
          <span className="font-semibold text-foreground">
            {currentUserQuery.data.username}
          </span>
          ，可以继续提交这个操作。
        </div>
      </div>
      {children}
    </div>
  );
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
    <section className={cn("border-y border-border py-5", className)}>
      <div className="border-b border-border pb-5">
        <div className="font-mono text-xs text-primary">{eyebrow}</div>
        <h2 className="mt-3 text-2xl font-black leading-tight tracking-normal">
          {title}
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="grid border-b border-border sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="border-b border-border px-4 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
          >
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="mt-2 text-sm font-semibold text-foreground">
              {value}
            </div>
          </div>
        ))}
      </div>
      <div className="pt-5">{actions}</div>
    </section>
  );
}

function AuthSkeleton() {
  return (
    <div className="space-y-3 border-y border-border py-4" aria-label="正在加载账号">
      <div className="h-4 w-40 animate-pulse bg-muted" />
      <div className="h-4 w-64 max-w-full animate-pulse bg-muted" />
      <div className="h-10 w-28 animate-pulse bg-muted" />
    </div>
  );
}
