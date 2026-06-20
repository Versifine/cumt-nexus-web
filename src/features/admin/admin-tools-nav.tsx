"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardCheck,
  FileClock,
  Gauge,
  Hash,
  KeyRound,
  ListChecks,
  Settings2,
  Sparkles,
  Users,
} from "lucide-react";

import { ReviewDeskInspector } from "@/components/app-shell/review-desk";
import { StatusToken } from "@/components/ui/data-display";
import { cn } from "@/lib/utils";

import type { PlatformRole } from "./types";

export const adminToolGroups = [
  {
    label: "工作台",
    items: [
      {
        description: "平台状态、优先队列和真实可用入口。",
        href: "/admin",
        icon: Gauge,
        label: "管理概览",
        roles: ["owner", "admin", "staff"],
      },
      {
        description: "全站举报、垃圾、移除和待审核队列。",
        href: "/admin/reports",
        icon: ListChecks,
        label: "全站队列",
        roles: ["owner", "admin", "staff"],
      },
      {
        description: "新社区申请审核和创建前检查。",
        href: "/admin/community-applications",
        icon: ClipboardCheck,
        label: "社区审批",
        roles: ["owner", "admin", "staff"],
      },
    ],
  },
  {
    label: "治理",
    items: [
      {
        description: "账号状态、平台角色和处罚记录。",
        href: "/admin/users",
        icon: Users,
        label: "用户",
        roles: ["owner", "admin"],
      },
      {
        description: "暂停、恢复、归档和异常接管社区。",
        href: "/admin/communities",
        icon: Hash,
        label: "社区",
        roles: ["owner", "admin"],
      },
      {
        description: "站点负责人交接的独立双确认流程。",
        href: "/admin/owner-transfer",
        icon: KeyRound,
        label: "负责人交接",
        roles: ["owner", "admin"],
      },
    ],
  },
  {
    label: "工具",
    items: [
      {
        description: "注册、发帖和上传等运行开关。",
        href: "/admin/settings",
        icon: Settings2,
        label: "运行开关",
        roles: ["owner", "admin"],
      },
      {
        description: "平台写操作日志和资源回看。",
        href: "/admin/audit-logs",
        icon: FileClock,
        label: "审计",
        roles: ["owner", "admin"],
      },
      {
        description: "评论效果、平台头衔和积分流水。",
        href: "/admin/growth",
        icon: Sparkles,
        label: "成长",
        roles: ["owner", "admin"],
      },
    ],
  },
] satisfies Array<{
  label: string;
  items: Array<{
    description: string;
    href: string;
    icon: typeof Gauge;
    label: string;
    roles: PlatformRole[];
  }>;
}>;

type AdminToolsNavProps = {
  activePath?: string;
  platformRole?: PlatformRole | null;
  variant?: "compact" | "default";
};

export function AdminToolsNav({
  activePath,
  platformRole,
  variant = "default",
}: AdminToolsNavProps) {
  const pathname = usePathname();
  const currentPath = activePath ?? pathname;
  const isCompact = variant === "compact";
  const visibleGroups = adminToolGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        platformRole ? item.roles.includes(platformRole) : item.roles.includes("staff"),
      ),
    }))
    .filter((group) => group.items.length > 0);

  if (isCompact) {
    const compactItems = visibleGroups.flatMap((group) => group.items);

    return (
      <ReviewDeskInspector title="平台工具">
        <nav
          aria-label="平台管理工具"
          className="grid grid-cols-3 gap-1"
        >
          {compactItems.map((item) => {
            const active = isActiveAdminTool(currentPath, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.description}
                className={cn(
                  "group flex min-h-10 min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 py-2 text-center text-[11px] leading-4 transition-colors",
                  active
                    ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                    : "bg-surface-raised text-muted-foreground hover:bg-surface-hover hover:text-foreground",
                )}
              >
                <item.icon className="size-4 shrink-0" aria-hidden="true" />
                <span className="line-clamp-1 max-w-full break-all">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </ReviewDeskInspector>
    );
  }

  return (
    <ReviewDeskInspector
      title="平台工具"
      description="按 Reddit 管理工具的使用顺序组织入口。"
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusToken tone="primary">Admin Tools</StatusToken>
        <StatusToken>平台级</StatusToken>
      </div>
      <nav
        aria-label="平台管理工具"
        className={cn("mt-4", isCompact ? "space-y-3" : "space-y-4")}
      >
        {visibleGroups.map((group, groupIndex) => (
          <div key={group.label} className="min-w-0">
            <div className="font-mono text-[11px] text-muted-foreground">
              {String(groupIndex + 1).padStart(2, "0")} {group.label}
            </div>
            <div
              className={cn(
                "mt-2",
                isCompact ? "grid grid-cols-2 gap-1" : "space-y-1",
              )}
            >
              {group.items.map((item, itemIndex) => {
                const active = isActiveAdminTool(currentPath, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex w-full items-center justify-between gap-2 rounded-md text-left text-sm transition-colors",
                      isCompact ? "min-h-10 px-2 py-2" : "min-h-11 px-3 py-2",
                      active
                        ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                        : "bg-surface-raised text-muted-foreground hover:bg-surface-hover hover:text-foreground",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className={cn(
                          "shrink-0 font-mono text-[11px]",
                          isCompact ? "w-6" : "w-8",
                        )}
                      >
                        {groupIndex + 1}.{itemIndex + 1}
                      </span>
                      <item.icon className="size-4 shrink-0" aria-hidden="true" />
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
      </nav>
    </ReviewDeskInspector>
  );
}

export function getAdminToolMeta(pathname: string) {
  for (const group of adminToolGroups) {
    const item = group.items.find((tool) => isActiveAdminTool(pathname, tool.href));
    if (item) {
      return item;
    }
  }

  return adminToolGroups[0].items[0];
}

function isActiveAdminTool(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
