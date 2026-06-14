import { StatusToken } from "@/components/ui/data-display";
import { cn } from "@/lib/utils";

import type { UserLevelSummary } from "./types";

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
  const marks = buildIdentityMarks({
    badges,
    displayTitle,
    level,
    roles,
  }).slice(0, maxItems);

  if (marks.length === 0) {
    return null;
  }

  return (
    <span className={cn("inline-flex min-w-0 flex-wrap gap-1.5", className)}>
      {marks.map((mark) => (
        <StatusToken
          key={`${mark.kind}:${mark.label}`}
          className={cn(size === "sm" && "px-1.5 py-0 text-[11px]")}
          tone={mark.kind === "level" ? "default" : "primary"}
        >
          {mark.label}
        </StatusToken>
      ))}
    </span>
  );
}

function buildIdentityMarks({
  badges,
  displayTitle,
  level,
  roles,
}: {
  badges: string[];
  displayTitle?: string | null;
  level?: UserLevelSummary | null;
  roles: string[];
}) {
  const seen = new Set<string>();
  const marks: Array<{ kind: "badge" | "level" | "role" | "title"; label: string }> = [];

  addMark(marks, seen, "title", displayTitle);
  addMark(marks, seen, "level", formatLevelMark(level));

  for (const role of roles) {
    addMark(marks, seen, "role", role);
  }

  for (const badge of badges) {
    addMark(marks, seen, "badge", badge);
  }

  return marks;
}

function addMark(
  marks: Array<{ kind: "badge" | "level" | "role" | "title"; label: string }>,
  seen: Set<string>,
  kind: "badge" | "level" | "role" | "title",
  value?: string | null,
) {
  const label = value?.trim();

  if (!label || seen.has(label)) {
    return;
  }

  seen.add(label);
  marks.push({ kind, label });
}

function formatLevelMark(level?: UserLevelSummary | null) {
  if (!level || typeof level.level !== "number") {
    return null;
  }

  return `Lv.${level.level}`;
}
