"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import {
  ReviewDesk,
  ReviewDeskBoard,
  ReviewDeskMasthead,
} from "@/components/app-shell/review-desk";
import { MetricBlock } from "@/components/ui/data-display";
import { useCurrentUserQuery } from "@/features/auth/queries";

import { AdminToolsNav, getAdminToolMeta } from "./admin-tools-nav";
import { AdminPermissionGate } from "./permission-gate";
import type { PlatformRole } from "./types";
import { useEffectiveAdminPlatformRole } from "./use-effective-platform-role";

type AdminShellProps = {
  allowedRoles?: PlatformRole[];
  children: ReactNode;
  description: string;
  eyebrow?: string;
  title: string;
};

export function AdminShell({
  allowedRoles,
  children,
  description,
  eyebrow = "平台管理",
  title,
}: AdminShellProps) {
  const pathname = usePathname();
  const currentUserQuery = useCurrentUserQuery();
  const effectivePlatformRole = useEffectiveAdminPlatformRole(currentUserQuery.data);
  const platformRole = effectivePlatformRole.role;
  const activeTool = getAdminToolMeta(pathname);

  return (
    <ReviewDesk className="max-w-[1320px]">
      <ReviewDeskMasthead
        eyebrow={eyebrow}
        title={title}
        description={description}
        meta={
          <>
            <MetricBlock
              label="当前工具"
              value={activeTool.label}
              variant="compact"
            />
            <MetricBlock
              label="平台身份"
              value={
                platformRole
                  ? effectivePlatformRole.source === "fallback"
                    ? "平台人员待同步"
                    : resolveAdminRoleLabel(platformRole)
                  : "确认中"
              }
              variant="compact"
            />
            <MetricBlock label="路由" value={pathname} variant="compact" />
            <MetricBlock label="权限" value="后端校验" variant="compact" />
          </>
        }
      />

      <ReviewDeskBoard
        inspector={
          <AdminToolsNav activePath={pathname} platformRole={platformRole} />
        }
      >
        <AdminPermissionGate allowedRoles={allowedRoles} nextPath={pathname}>
          <div className="min-w-0">{children}</div>
        </AdminPermissionGate>
      </ReviewDeskBoard>
    </ReviewDesk>
  );
}

function resolveAdminRoleLabel(role: PlatformRole) {
  switch (role) {
    case "owner":
      return "站点负责人";
    case "admin":
      return "平台管理员";
    case "staff":
      return "平台审核员";
  }
}
