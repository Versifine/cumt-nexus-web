import type { Notification } from "./types";

export type NotificationTarget = {
  href: string | null;
  label: string;
  summary: string;
};

const unresolvedTarget: NotificationTarget = {
  href: null,
  label: "暂不能直达",
  summary: "后端还没有返回这类通知的可打开上下文。",
};

export function resolveNotificationTarget(
  notification: Notification,
): NotificationTarget {
  const sourceType = normalizeSourceType(notification.source_type);
  const sourceId = notification.source_id.trim();

  if (!sourceId) {
    return {
      href: null,
      label: "暂无来源",
      summary: "这条通知没有返回来源编号。",
    };
  }

  switch (sourceType) {
    case "post":
    case "posts":
      return {
        href: `/posts/${encodeURIComponent(sourceId)}`,
        label: "查看帖子",
        summary: `帖子 ${formatShortSourceId(sourceId)}`,
      };
    case "community":
    case "communities":
      return {
        href: `/communities/${encodeURIComponent(sourceId)}`,
        label: "查看社区",
        summary: `社区 /${sourceId}`,
      };
    case "report":
    case "reports":
    case "moderation_report":
      return {
        href: `/moderation/reports/${encodeURIComponent(sourceId)}`,
        label: "查看举报",
        summary: `举报 ${formatShortSourceId(sourceId)}`,
      };
    case "comment":
      return {
        href: null,
        label: "等待评论上下文",
        summary: `评论 ${formatShortSourceId(sourceId)}；后端尚未返回所属帖子 ID`,
      };
    default:
      return unresolvedTarget;
  }
}

function normalizeSourceType(value: string) {
  return value.trim().toLowerCase().replace(/[-\s]+/g, "_");
}

function formatShortSourceId(value: string) {
  return value.length > 8 ? value.slice(0, 8) : value;
}
