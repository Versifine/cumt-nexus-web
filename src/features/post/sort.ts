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
