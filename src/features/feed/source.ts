import { formatPostSortLabel } from "@/features/post/sort";
import type { FeedSource, PostSort } from "@/features/post/types";

export const feedSourceItems: Array<{
  description: string;
  label: string;
  value: FeedSource;
}> = [
  {
    description: "按推荐源展示公开讨论。",
    label: "推荐",
    value: "recommended",
  },
  {
    description: "按全站源展示公开讨论。",
    label: "全站",
    value: "all",
  },
  {
    description: "登录后查看关注社区的信息流。",
    label: "关注",
    value: "following",
  },
];

export function formatFeedSourceLabel(source: FeedSource) {
  return feedSourceItems.find((item) => item.value === source)?.label ?? "推荐";
}

export function formatFeedSourceDescription(source: FeedSource) {
  return (
    feedSourceItems.find((item) => item.value === source)?.description ??
    "按推荐源展示公开讨论。"
  );
}

export function getFeedHref(source: FeedSource, sort: PostSort) {
  const suffix = sort === "best" ? "" : `/${sort}`;

  switch (source) {
    case "all":
      return `/all${suffix}`;
    case "following":
      return `/following${suffix}`;
    default:
      return suffix || "/";
  }
}

export function getFeedContextLabel(source: FeedSource, sort: PostSort) {
  const sourceLabel = formatFeedSourceLabel(source);
  const sortLabel = formatPostSortLabel(sort);

  return sort === "best" ? sourceLabel : `${sourceLabel} · ${sortLabel}`;
}

export function getFeedReturnLabel(source: FeedSource) {
  switch (source) {
    case "all":
      return "返回全站";
    case "following":
      return "返回关注";
    default:
      return "返回首页";
  }
}
