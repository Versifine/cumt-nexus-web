"use client";

import {
  StatusToken,
  type StatusTokenTone,
} from "@/components/ui/data-display";
import { cn } from "@/lib/utils";

export type AuthorRoleBadgeSource = {
  community_role?: string | null;
  is_platform_staff?: boolean;
  platform_role?: string | null;
};

type AuthorRoleBadgesProps = {
  className?: string;
  source?: AuthorRoleBadgeSource | null;
  size?: "xs" | "sm";
};

type RoleBadge = {
  key: string;
  label: string;
  tone: StatusTokenTone;
};

export function AuthorRoleBadges({
  className,
  source,
  size = "xs",
}: AuthorRoleBadgesProps) {
  const badges = getAuthorRoleBadges(source);

  if (badges.length === 0) {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-flex min-w-0 shrink-0 flex-wrap items-center gap-1 align-baseline",
        className,
      )}
    >
      {badges.map((badge) => (
        <StatusToken
          key={badge.key}
          tone={badge.tone}
          className={cn(
            "shrink-0 px-1.5 py-0 font-semibold leading-4",
            size === "xs" ? "text-[10px]" : "text-[11px]",
          )}
        >
          {badge.label}
        </StatusToken>
      ))}
    </span>
  );
}

function getAuthorRoleBadges(
  source?: AuthorRoleBadgeSource | null,
): RoleBadge[] {
  if (!source) {
    return [];
  }

  const badges: RoleBadge[] = [];
  const communityRole = normalizeRole(source.community_role);
  const platformRole = normalizeRole(source.platform_role);

  if (communityRole === "owner") {
    badges.push({
      key: "community-owner",
      label: "版主",
      tone: "primary",
    });
  } else if (
    communityRole === "moderator" ||
    communityRole === "admin"
  ) {
    badges.push({
      key: "community-moderator",
      label: "社区管理员",
      tone: "primary",
    });
  }

  if (platformRole === "owner") {
    badges.push({
      key: "platform-owner",
      label: "平台负责人",
      tone: "warning",
    });
  } else if (platformRole === "admin") {
    badges.push({
      key: "platform-admin",
      label: "平台管理员",
      tone: "warning",
    });
  } else if (platformRole === "staff" || source.is_platform_staff === true) {
    badges.push({
      key: "platform-staff",
      label: "平台管理",
      tone: "warning",
    });
  }

  return badges;
}

function normalizeRole(value?: string | null) {
  return value?.trim().toLowerCase() || "";
}
