"use client";

import type { ReactNode } from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { TextAction } from "@/components/ui/text-action";
import { useAuthSession } from "@/features/auth/auth-session";
import { useCurrentUserQuery } from "@/features/auth/queries";
import { ApiError } from "@/lib/api/client";

import { formatPlatformRole } from "./display";
import type { PlatformRole } from "./types";
import { useEffectiveAdminPlatformRole } from "./use-effective-platform-role";

export function AdminPermissionGate({
  allowedRoles,
  children,
  nextPath,
}: {
  allowedRoles?: PlatformRole[];
  children: ReactNode;
  nextPath: string;
}) {
  const { isReady, token } = useAuthSession();
  const currentUserQuery = useCurrentUserQuery();
  const effectivePlatformRole = useEffectiveAdminPlatformRole(currentUserQuery.data);
  const loginHref = `/login?next=${encodeURIComponent(nextPath)}`;

  if (
    !isReady ||
    (token && currentUserQuery.isLoading) ||
    (token && effectivePlatformRole.isResolving)
  ) {
    return (
      <div className="border-b border-border py-4">
        <LoadingState rows={5} />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="border-b border-border py-4">
        <EmptyState
          title="登录后进入平台管理"
          description="平台管理需要账号具备平台权限。登录后会自动确认权限。"
          action={
            <TextAction href={loginHref} tone="primary">
              登录
            </TextAction>
          }
        />
      </div>
    );
  }

  if (currentUserQuery.isError) {
    return (
      <div className="border-b border-border py-4">
        <ErrorState
          title="无法确认用户身份"
          description={getErrorDescription(currentUserQuery.error)}
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => currentUserQuery.refetch()}
            >
              重试
            </Button>
          }
        />
      </div>
    );
  }

  const platformRole = effectivePlatformRole.role;

  if (!platformRole) {
    return (
      <div className="border-b border-border py-4">
        <EmptyState
          title="需要平台权限"
          description="当前账号没有平台管理权限，不能查看后台数据或执行平台操作。"
          action={<TextAction href="/">信息流首页</TextAction>}
        />
      </div>
    );
  }

  if (
    allowedRoles &&
    !allowedRoles.includes(platformRole)
  ) {
    return (
      <div className="border-b border-border py-4">
        <EmptyState
          title="当前平台角色不能访问"
          description={`${formatPlatformRole(platformRole)}不能查看这个后台页面。`}
          action={<TextAction href="/admin">返回平台管理</TextAction>}
        />
      </div>
    );
  }

  return <>{children}</>;
}

function getErrorDescription(error: Error | null) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}
