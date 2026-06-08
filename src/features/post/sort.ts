import type { PostSort } from "./types";

export const postSortItems: Array<{ label: string; value: PostSort }> = [
  { label: "推荐", value: "best" },
  { label: "热门", value: "hot" },
  { label: "最新", value: "new" },
  { label: "最高", value: "top" },
  { label: "上升", value: "rising" },
];

export function formatPostSortLabel(sort: PostSort) {
  return postSortItems.find((item) => item.value === sort)?.label ?? "推荐";
}

export function isPostSort(value: string): value is PostSort {
  return postSortItems.some((item) => item.value === value);
}

export function formatPostSortFallbackNotice(
  requestedSort?: PostSort,
  effectiveSort?: PostSort,
) {
  if (!requestedSort || !effectiveSort || requestedSort === effectiveSort) {
    return null;
  }

  return `后端暂未提供${formatPostSortLabel(requestedSort)}排序，当前展示${formatPostSortLabel(effectiveSort)}公开帖子。`;
}
