import type { CommentSort } from "./types";

export const DEFAULT_COMMENT_SORT: CommentSort = "new";

export const commentSortItems: Array<{
  description: string;
  label: string;
  value: CommentSort;
}> = [
  {
    description: "优先展示后端判断最相关的评论。",
    label: "最佳",
    value: "best",
  },
  {
    description: "优先展示分数最高的评论。",
    label: "最高",
    value: "top",
  },
  {
    description: "优先展示最新发布的评论。",
    label: "最新",
    value: "new",
  },
  {
    description: "优先展示最早发布的评论。",
    label: "最早",
    value: "old",
  },
  {
    description: "优先展示争议较高的评论。",
    label: "争议",
    value: "controversial",
  },
];

export function formatCommentSortLabel(sort: CommentSort) {
  return commentSortItems.find((item) => item.value === sort)?.label ?? "最新";
}

export function formatCommentSortDescription(sort: CommentSort) {
  return (
    commentSortItems.find((item) => item.value === sort)?.description ??
    "优先展示最新发布的评论。"
  );
}

export function formatCommentSortFallbackNotice(
  requestedSort?: CommentSort,
  effectiveSort?: CommentSort,
) {
  if (!requestedSort || !effectiveSort || requestedSort === effectiveSort) {
    return null;
  }

  return `后端暂未提供${formatCommentSortLabel(requestedSort)}评论排序，当前展示${formatCommentSortLabel(effectiveSort)}评论。`;
}

export function isCommentSort(value: string): value is CommentSort {
  return commentSortItems.some((item) => item.value === value);
}

export function resolveCommentSort(value: string | null | undefined) {
  return value && isCommentSort(value) ? value : DEFAULT_COMMENT_SORT;
}
