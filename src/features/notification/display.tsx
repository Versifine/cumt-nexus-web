"use client";

import { AtSign, Bell, Heart, MessageSquare, Shield } from "lucide-react";

import type {
  Notification,
  NotificationCategory,
  UnreadSummaryResponse,
} from "./types";

export const emptyUnreadSummary: UnreadSummaryResponse = {
  likes: 0,
  mentions: 0,
  replies: 0,
  system: 0,
  total: 0,
};

export function getNotificationCategory(
  notification: Notification,
): NotificationCategory {
  const value = [
    notification.type,
    notification.source_type,
    notification.title,
  ]
    .join(" ")
    .toLowerCase();

  if (value.includes("mention") || value.includes("at_") || value.includes("@")) {
    return "mentions";
  }

  if (
    value.includes("like") ||
    value.includes("upvote") ||
    value.includes("vote") ||
    value.includes("reaction") ||
    value.includes("赞")
  ) {
    return "likes";
  }

  if (
    value.includes("reply") ||
    value.includes("comment") ||
    value.includes("评论") ||
    value.includes("回复")
  ) {
    return "replies";
  }

  return "system";
}

export function renderNotificationCategoryIcon(category: NotificationCategory) {
  switch (category) {
    case "replies":
      return <MessageSquare className="size-4" aria-hidden="true" />;
    case "mentions":
      return <AtSign className="size-4" aria-hidden="true" />;
    case "likes":
      return <Heart className="size-4" aria-hidden="true" />;
    case "system":
      return <Shield className="size-4" aria-hidden="true" />;
    default:
      return <Bell className="size-4" aria-hidden="true" />;
  }
}

export function formatNotificationCategory(category: NotificationCategory) {
  switch (category) {
    case "replies":
      return "回复";
    case "mentions":
      return "@";
    case "likes":
      return "赞";
    case "system":
      return "系统";
    default:
      return "全部";
  }
}

export function formatNotificationType(type: string) {
  switch (type) {
    case "post_reply":
      return "帖子回复";
    case "comment_reply":
      return "评论回复";
    case "post_like":
      return "帖子点赞";
    case "comment_like":
      return "评论点赞";
    case "system":
      return "系统";
    case "reply":
      return "回复";
    case "mention":
      return "@";
    case "like":
    case "reaction":
      return "赞";
    case "moderation":
      return "审核";
    case "community_application":
      return "社区申请";
    default:
      return type || "通知";
  }
}

export function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function getNotificationCategoryCounts(summary: UnreadSummaryResponse) {
  return {
    all: summary.total,
    likes: summary.likes,
    mentions: summary.mentions,
    replies: summary.replies,
    system: summary.system,
  } satisfies Record<NotificationCategory, number>;
}
