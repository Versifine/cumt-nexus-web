"use client";

import { SortMenu } from "@/components/ui/sort-menu";

import { postSortItems } from "./sort";
import type { PostSort } from "./types";

type PostSortMenuProps = {
  align?: "center" | "end" | "start";
  "aria-label"?: string;
  className?: string;
  disabled?: boolean;
  onSortChange: (sort: PostSort) => void;
  sort: PostSort;
};

export function PostSortMenu({
  align = "start",
  "aria-label": ariaLabel = "选择帖子排序方式",
  className,
  disabled = false,
  onSortChange,
  sort,
}: PostSortMenuProps) {
  return (
    <SortMenu
      align={align}
      aria-label={ariaLabel}
      className={className}
      disabled={disabled}
      items={postSortItems}
      label="帖子排序"
      onValueChange={onSortChange}
      value={sort}
    />
  );
}
