"use client";

import { cn } from "@/lib/utils";

import { getUserDisplayTitle, getUserProgression } from "./identity";
import { usePublicUserQuery } from "./queries";
import type { UserLevelSummary } from "./types";

type LevelTone = {
  barClassName: string;
  label: string;
  textClassName: string;
};

type UserIdentityMarksProps = {
  badges?: string[];
  className?: string;
  displayTitle?: string | null;
  level?: UserLevelSummary | null;
  maxItems?: number;
  roles?: string[];
  size?: "sm" | "md";
};

export function UserIdentityMarks({
  badges = [],
  className,
  displayTitle,
  level,
  maxItems = 6,
  roles = [],
  size = "md",
}: UserIdentityMarksProps) {
  const hasLevel = Boolean(level && typeof level.level === "number");
  const marks = buildIdentityMarks({
    badges,
    displayTitle,
    roles,
  }).slice(0, Math.max(0, maxItems - (hasLevel ? 1 : 0)));

  if (!hasLevel && marks.length === 0) {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1",
        size === "sm" ? "text-[11px]" : "text-xs",
        className,
      )}
    >
      <UserLevelBadge level={level} size={size === "sm" ? "xs" : "sm"} />
      {marks.map((mark) => (
        <span
          key={`${mark.kind}:${mark.label}`}
          className={cn(
            "min-w-0 truncate font-medium leading-5",
            mark.kind === "title" ? "text-primary" : "text-muted-foreground",
          )}
        >
          {mark.label}
        </span>
      ))}
    </span>
  );
}

export function UserLevelBadge({
  className,
  level,
  showName = false,
  size = "sm",
}: {
  className?: string;
  level?: UserLevelSummary | null;
  showName?: boolean;
  size?: "xs" | "sm" | "md";
}) {
  if (!level || typeof level.level !== "number") {
    return null;
  }

  const tone = getUserLevelTone(level.level);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-baseline gap-1 font-mono font-semibold leading-none tracking-normal",
        size === "xs" && "text-[11px]",
        size === "sm" && "text-xs",
        size === "md" && "text-base",
        tone.textClassName,
        className,
      )}
      title={level.level_name ? `Lv.${level.level} ${level.level_name}` : `Lv.${level.level}`}
    >
      <span>Lv.{level.level}</span>
      {showName && level.level_name ? (
        <span className="font-sans text-xs font-semibold text-foreground">
          {level.level_name}
        </span>
      ) : null}
    </span>
  );
}

export function UserInlineIdentity({
  className,
  level,
  size = "sm",
  title,
  username,
}: {
  className?: string;
  level?: UserLevelSummary | null;
  size?: "xs" | "sm" | "md";
  title?: string | null;
  username?: string | null;
}) {
  const cleanUsername = username?.trim() || "";
  const providedTitle = title?.trim() || "";
  const hasProvidedLevel = Boolean(level && typeof level.level === "number");
  const shouldLoadProfile =
    Boolean(cleanUsername) &&
    (!providedTitle || !hasProvidedLevel);
  const profileQuery = usePublicUserQuery(cleanUsername, shouldLoadProfile);
  const profile = profileQuery.data?.user;
  const resolvedLevel = level ?? (profile ? getUserProgression(profile) : null);
  const cleanTitle =
    providedTitle || (profile ? getUserDisplayTitle(profile) ?? "" : "");
  const hasLevel = Boolean(resolvedLevel && typeof resolvedLevel.level === "number");

  if (!hasLevel && !cleanTitle) {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-flex min-w-0 shrink-0 items-baseline gap-1.5 align-baseline leading-none",
        size === "xs" && "text-[11px]",
        size === "sm" && "text-xs",
        size === "md" && "text-sm",
        className,
      )}
    >
      <UserLevelBadge
        level={resolvedLevel}
        className="relative top-px"
        size={size === "xs" ? "xs" : "sm"}
      />
      {hasLevel && cleanTitle ? (
        <span
          className={cn(
            "font-mono text-muted-foreground/45",
            size === "xs" && "text-[10px]",
          )}
          aria-hidden="true"
        >
          |
        </span>
      ) : null}
      {cleanTitle ? (
        <span
          className={cn(
            "min-w-0 truncate font-medium tracking-normal text-muted-foreground/90",
            size === "xs" && "max-w-20",
            size === "sm" && "max-w-28",
            size === "md" && "max-w-36",
          )}
          title={cleanTitle}
        >
          {cleanTitle}
        </span>
      ) : null}
    </span>
  );
}

export function UserLevelProgress({
  className,
  level,
  showLabel = false,
}: {
  className?: string;
  level?: UserLevelSummary | null;
  showLabel?: boolean;
}) {
  if (!level) {
    return null;
  }

  const progress = clampPercent(level.level_progress ?? 0);
  const tone = getUserLevelTone(level.level);

  return (
    <span className={cn("block min-w-0", className)}>
      {showLabel ? (
        <span className="mb-1 flex items-center justify-between gap-3 font-mono text-[11px] text-muted-foreground">
          <span>经验</span>
          <span>{formatXpLabel(level)}</span>
        </span>
      ) : null}
      <span className="block h-[3px] overflow-hidden bg-border/70">
        <span
          className={cn("block h-full transition-[width]", tone.barClassName)}
          style={{ width: `${progress}%` }}
          aria-hidden="true"
        />
      </span>
    </span>
  );
}

export function getUserLevelTone(level?: number): LevelTone {
  if (typeof level !== "number" || level < 5) {
    return {
      barClassName: "bg-primary",
      label: "新晋",
      textClassName: "text-primary",
    };
  }

  if (level < 10) {
    return {
      barClassName: "bg-emerald-300",
      label: "活跃",
      textClassName: "text-emerald-300",
    };
  }

  if (level < 20) {
    return {
      barClassName: "bg-sky-300",
      label: "资深",
      textClassName: "text-sky-300",
    };
  }

  return {
    barClassName: "bg-amber-300",
    label: "核心",
    textClassName: "text-amber-300",
  };
}

function buildIdentityMarks({
  badges,
  displayTitle,
  roles,
}: {
  badges: string[];
  displayTitle?: string | null;
  roles: string[];
}) {
  const seen = new Set<string>();
  const marks: Array<{ kind: "badge" | "role" | "title"; label: string }> = [];

  addMark(marks, seen, "title", displayTitle);

  for (const role of roles) {
    addMark(marks, seen, "role", role);
  }

  for (const badge of badges) {
    addMark(marks, seen, "badge", badge);
  }

  return marks;
}

function addMark(
  marks: Array<{ kind: "badge" | "role" | "title"; label: string }>,
  seen: Set<string>,
  kind: "badge" | "role" | "title",
  value?: string | null,
) {
  const label = value?.trim();

  if (!label || seen.has(label)) {
    return;
  }

  seen.add(label);
  marks.push({ kind, label });
}

function formatXpLabel(level: UserLevelSummary) {
  if (
    typeof level.current_level_xp === "number" &&
    typeof level.next_level_xp === "number"
  ) {
    const currentLevelXp = Math.max(0, level.current_level_xp);
    const nextLevelXp = Math.max(currentLevelXp, level.next_level_xp);
    const requiredInLevel = Math.max(0, nextLevelXp - currentLevelXp);
    const earnedInLevel =
      typeof level.xp_total === "number"
        ? Math.max(
            0,
            Math.min(level.xp_total - currentLevelXp, requiredInLevel),
          )
        : Math.round(requiredInLevel * clampRatio(level.level_progress ?? 0));

    return `${formatMetricCount(earnedInLevel)} / ${formatMetricCount(requiredInLevel)} XP`;
  }

  if (level.next_level_xp === null) {
    return "已满级";
  }

  if (typeof level.xp_total === "number") {
    return `${formatMetricCount(level.xp_total)} XP`;
  }

  return "经验同步中";
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(Math.max(0, Math.min(100, value * 100)));
}

function clampRatio(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function formatMetricCount(value?: number) {
  if (typeof value !== "number") {
    return "暂无";
  }

  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 1,
    notation: value >= 10000 ? "compact" : "standard",
  }).format(value);
}
