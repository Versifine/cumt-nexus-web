"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardCheck,
  Coins,
  FileClock,
  Gauge,
  KeyRound,
  Settings2,
  ShieldAlert,
  SlidersHorizontal,
  Users,
} from "lucide-react";

import { InfoRow, StatusToken } from "@/components/ui/data-display";
import { hasLegacyPlatformStaffOnly } from "@/features/auth/platform-role";
import { useCurrentUserQuery } from "@/features/auth/queries";
import { cn } from "@/lib/utils";

import { resolvePlatformRole } from "./display";
import { AdminPermissionGate } from "./permission-gate";
import type { PlatformRole } from "./types";

type AdminShellProps = {
  allowedRoles?: PlatformRole[];
  children: ReactNode;
  description: string;
  eyebrow?: string;
  title: string;
};

const adminNavGroups = [
  {
    label: "工作台",
    items: [
      {
        href: "/admin",
        icon: Gauge,
        label: "总览",
        roles: ["owner", "admin", "staff"],
      },
    ],
  },
  {
    label: "队列",
    items: [
      {
        href: "/admin/reports",
        icon: ShieldAlert,
        label: "全站队列",
        roles: ["owner", "admin", "staff"],
      },
      {
        href: "/admin/community-applications",
        icon: ClipboardCheck,
        label: "社区审批",
        roles: ["owner", "admin", "staff"],
      },
    ],
  },
  {
    label: "用户与社区",
    items: [
      { href: "/admin/users", icon: Users, label: "用户", roles: ["owner", "admin"] },
      {
        href: "/admin/communities",
        icon: SlidersHorizontal,
        label: "平台社区治理",
        roles: ["owner", "admin"],
      },
      {
        href: "/admin/owner-transfer",
        icon: KeyRound,
        label: "负责人交接",
        roles: ["owner", "admin"],
      },
    ],
  },
  {
    label: "配置与审计",
    items: [
      {
        href: "/admin/settings",
        icon: Settings2,
        label: "运行开关",
        roles: ["owner", "admin"],
      },
      {
        href: "/admin/audit-logs",
        icon: FileClock,
        label: "审计",
        roles: ["owner", "admin"],
      },
      { href: "/admin/growth", icon: Coins, label: "成长", roles: ["owner", "admin"] },
    ],
  },
] satisfies Array<{
  label: string;
  items: Array<{
  href: string;
  icon: typeof Gauge;
  label: string;
  roles: PlatformRole[];
  }>;
}>;

export function AdminShell({
  allowedRoles,
  children,
  description,
  eyebrow = "平台管理",
  title,
}: AdminShellProps) {
  const pathname = usePathname();
  const currentUserQuery = useCurrentUserQuery();
  const platformRole = resolvePlatformRole(currentUserQuery.data);
  const hasOnlyLegacyStaffFlag = hasLegacyPlatformStaffOnly(
    currentUserQuery.data,
  );
  const visibleNavGroups = adminNavGroups
    .map((group) => ({
      ...group,
      items: platformRole && !hasOnlyLegacyStaffFlag
        ? group.items.filter((item) => item.roles.includes(platformRole))
        : group.items,
    }))
    .filter((group) => group.items.length > 0);

  return (
    <AdminPermissionGate allowedRoles={allowedRoles} nextPath={pathname}>
      <div className="grid grid-cols-1 gap-0 py-2 xl:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="border-b border-border pb-4 xl:border-b-0 xl:border-r xl:pb-0 xl:pr-5">
          <div className="sticky top-20">
            <div className="flex flex-wrap items-center gap-2">
              <StatusToken tone="primary">{eyebrow}</StatusToken>
              {platformRole ? (
                <StatusToken>
                  {hasOnlyLegacyStaffFlag
                    ? "平台人员（待同步角色）"
                    : resolveAdminRoleLabel(platformRole)}
                </StatusToken>
              ) : null}
            </div>
            <nav
              aria-label="平台管理导航"
              className="mt-4 flex gap-3 overflow-x-auto border-t border-border pb-1 xl:block xl:overflow-visible xl:pb-0"
            >
              {visibleNavGroups.map((group, groupIndex) => (
                <div
                  key={group.label}
                  className="min-w-[180px] shrink-0 border-r border-border pr-3 last:border-r-0 xl:min-w-0 xl:border-r-0 xl:pr-0"
                >
                  <div className="hidden pb-2 pt-4 font-mono text-[11px] text-muted-foreground xl:block">
                    {String(groupIndex + 1).padStart(2, "0")} {group.label}
                  </div>
                  <div className="xl:border-t xl:border-border">
                    {group.items.map((item, itemIndex) => {
                      const active = isActiveAdminPath(pathname, item.href);
                      const index = `${groupIndex + 1}.${itemIndex + 1}`;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "group flex min-h-11 items-center justify-between gap-3 border-b border-border px-1 py-2 text-sm transition-colors xl:px-0",
                            active
                              ? "text-foreground"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="hidden w-8 shrink-0 font-mono text-[11px] text-muted-foreground xl:inline">
                              {index}
                            </span>
                            <item.icon
                              className="size-4 shrink-0"
                              aria-hidden="true"
                            />
                            <span className="truncate">{item.label}</span>
                          </span>
                          <span
                            className={cn(
                              "size-1.5 shrink-0 rounded-full",
                              active
                                ? "bg-primary"
                                : "bg-border group-hover:bg-muted-foreground",
                            )}
                          />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
            <div className="mt-5 hidden border-t border-border xl:block">
              <InfoRow
                label="队列模型"
                value="列表 + 上下文"
                valueClassName="text-xs"
              />
              <InfoRow
                label="权限来源"
                value="后端 401/403"
                valueClassName="text-xs"
              />
            </div>
          </div>
        </aside>

        <section className="min-w-0 xl:pl-5">
          <div className="border-b border-border py-4">
            <h1 className="break-words text-xl font-semibold leading-7 tracking-normal text-foreground sm:text-2xl">
              {title}
            </h1>
            <p className="mt-1 truncate font-mono text-xs text-primary">
              {pathname}
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
          {children}
        </section>
      </div>
    </AdminPermissionGate>
  );
}

function isActiveAdminPath(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
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
