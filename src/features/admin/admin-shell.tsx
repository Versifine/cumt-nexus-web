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
  Users,
} from "lucide-react";

import { StatusToken } from "@/components/ui/data-display";
import { useCurrentUserQuery } from "@/features/auth/queries";
import { cn } from "@/lib/utils";

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
  const effectivePlatformRole = useEffectiveAdminPlatformRole(currentUserQuery.data);
  const platformRole = effectivePlatformRole.role;
  const visibleNavGroups = adminNavGroups
    .map((group) => ({
      ...group,
      items: platformRole
        ? group.items.filter((item) => item.roles.includes(platformRole))
        : [],
    }))
    .filter((group) => group.items.length > 0);

  return (
    <AdminPermissionGate allowedRoles={allowedRoles} nextPath={pathname}>
      <div className="min-w-0 py-2">
        <div className="border-b border-border pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusToken tone="primary">{eyebrow}</StatusToken>
            {platformRole ? (
              <StatusToken>
                {effectivePlatformRole.source === "fallback"
                  ? "平台人员（待同步角色）"
                  : resolveAdminRoleLabel(platformRole)}
              </StatusToken>
            ) : null}
          </div>
          <div className="mt-4">
            <h1 className="break-words text-xl font-semibold leading-7 tracking-normal text-foreground sm:text-2xl">
              {title}
            </h1>
            <p className="mt-1 break-words font-mono text-xs text-primary [overflow-wrap:anywhere]">
              {pathname}
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
        </div>

        <nav
          aria-label="平台管理导航"
          className="border-b border-border py-3"
        >
          <div className="flex gap-3 overflow-x-auto pb-1 xl:grid xl:grid-cols-4 xl:overflow-visible xl:pb-0">
            {visibleNavGroups.map((group, groupIndex) => (
              <div
                key={group.label}
                className="min-w-[220px] shrink-0 border-r border-border pr-3 last:border-r-0 xl:min-w-0"
              >
                <div className="pb-2 font-mono text-[11px] text-muted-foreground">
                  {String(groupIndex + 1).padStart(2, "0")} {group.label}
                </div>
                <div className="border-t border-border">
                  {group.items.map((item, itemIndex) => {
                    const active = isActiveAdminPath(pathname, item.href);
                    const index = `${groupIndex + 1}.${itemIndex + 1}`;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "group flex min-h-11 items-center justify-between gap-3 border-b border-border px-1 py-2 text-sm transition-colors",
                          active
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="w-8 shrink-0 font-mono text-[11px] text-muted-foreground">
                            {index}
                          </span>
                          <item.icon
                            className="size-4 shrink-0"
                            aria-hidden="true"
                          />
                          <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                            {item.label}
                          </span>
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
          </div>
        </nav>

        <section className="min-w-0">{children}</section>
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
