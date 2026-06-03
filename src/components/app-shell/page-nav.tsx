"use client";

import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  Bell,
  ClipboardCheck,
  FilePlus2,
  Hash,
  Home,
  Search,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type PageNavProps = {
  backHref?: string;
  backLabel?: string;
  className?: string;
};

const navItems: Array<{
  href: string;
  icon: LucideIcon;
  label: string;
}> = [
  { href: "/", icon: Home, label: "最新讨论" },
  { href: "/communities", icon: Hash, label: "社区索引" },
  { href: "/search", icon: Search, label: "搜索" },
  { href: "/notifications", icon: Bell, label: "通知" },
  { href: "/moderation", icon: ShieldAlert, label: "审核" },
  { href: "/community-applications/new", icon: FilePlus2, label: "申请社区" },
  { href: "/community-applications/review", icon: ClipboardCheck, label: "审批申请" },
];

export function PageNav({ backHref, backLabel, className }: PageNavProps) {
  return (
    <nav
      aria-label="页面导航"
      className={cn(
        "flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <Link
          href="/"
          className="inline-flex h-10 items-center gap-3 text-sm font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span className="border border-foreground bg-foreground px-2 py-1 text-sm font-black leading-none text-background">
            CN
          </span>
          <span>CUMT Nexus</span>
        </Link>

        {backHref && backLabel ? (
          <Link
            href={backHref}
            className="group inline-flex h-10 min-w-0 items-center gap-2 border-l border-border pl-3 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ArrowLeft
              className="size-4 shrink-0 transition-transform group-hover:-translate-x-1"
              aria-hidden="true"
            />
            <span className="truncate">{backLabel}</span>
          </Link>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group inline-flex h-9 items-center gap-2 border border-border px-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:text-sm"
          >
            <item.icon
              className="size-4 shrink-0 text-primary transition-transform group-hover:-translate-y-0.5"
              aria-hidden="true"
            />
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
