import type { Notification } from "./types";

export type NotificationTarget = {
  href: string | null;
  label: string;
  summary: string;
};

const unresolvedTarget: NotificationTarget = {
  href: null,
  label: "暂不能直达",
  summary: "后端还没有返回这类通知的可打开上下文",
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
      summary: "这条消息没有返回可打开来源",
    };
  }

  switch (sourceType) {
    case "post":
    case "posts":
      return {
        href: `/posts/${encodeURIComponent(sourceId)}`,
        label: "查看帖子",
        summary: "点击查看相关帖子",
      };
    case "community":
    case "communities":
      return {
        href: `/communities/${encodeURIComponent(sourceId)}`,
        label: "查看社区",
        summary: "点击查看相关社区",
      };
    case "report":
    case "reports":
    case "moderation_report":
      return {
        href: `/admin/reports/${encodeURIComponent(sourceId)}`,
        label: "查看举报",
        summary: "点击查看相关举报",
      };
    case "community_owner_transfer":
    case "community_owner_transfers":
      return resolveCommunityOwnerTransferTarget(sourceId);
    case "platform_owner_transfer":
    case "platform_owner_transfers":
    case "admin_owner_transfer":
    case "admin_owner_transfers":
      return {
        href: `/owner-transfer/${encodeURIComponent(sourceId)}`,
        label: "接受负责人交接",
        summary: "打开站点负责人交接请求",
      };
    case "comment":
      return {
        href: null,
        label: "等待评论上下文",
        summary: "后端尚未返回所属帖子，暂不能直达评论",
      };
    default:
      return unresolvedTarget;
  }
}

function normalizeSourceType(value: string) {
  return value.trim().toLowerCase().replace(/[-\s]+/g, "_");
}

function resolveCommunityOwnerTransferTarget(sourceId: string): NotificationTarget {
  const [slug, transferId] = sourceId.split(":");

  if (!slug || !transferId) {
    return {
      href: "/communities/owner-transfers",
      label: "查看版主交接",
      summary: "打开待接受版主交接列表",
    };
  }

  return {
    href: `/communities/${encodeURIComponent(slug)}/owner-transfer/${encodeURIComponent(transferId)}/accept`,
    label: "接受版主交接",
    summary: "打开社区版主交接请求",
  };
}
