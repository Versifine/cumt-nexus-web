"use client";

import { Bell, MessageCircle, Shield } from "lucide-react";

import type { Notification, NotificationCategory } from "./types";

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

  return value.includes("system") ||
    value.includes("moderation") ||
    value.includes("report") ||
    value.includes("审核") ||
    value.includes("系统")
    ? "system"
    : "interactions";
}

export function renderNotificationCategoryIcon(category: NotificationCategory) {
  switch (category) {
    case "interactions":
      return <MessageCircle className="size-4" aria-hidden="true" />;
    case "system":
      return <Shield className="size-4" aria-hidden="true" />;
    default:
      return <Bell className="size-4" aria-hidden="true" />;
  }
}

export function formatNotificationCategory(category: NotificationCategory) {
  switch (category) {
    case "interactions":
      return "互动消息";
    case "system":
      return "系统通知";
    default:
      return "消息";
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
