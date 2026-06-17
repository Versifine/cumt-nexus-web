import type { Notification, NotificationActor } from "./types";

export type DisplayNotification = Notification & {
  merged_count?: number;
  merged_ids?: string[];
};

export type NotificationActorView = {
  avatarUrl: string;
  displayName: string;
  initial: string;
  isKnown: boolean;
  username: string;
};

export function mergeLikeNotifications(
  notifications: Notification[],
): DisplayNotification[] {
  const merged = new Map<string, DisplayNotification>();
  const result: DisplayNotification[] = [];

  for (const notification of notifications) {
    if (!isLikeNotification(notification) || !notification.source_id.trim()) {
      result.push(notification);
      continue;
    }

    const key = [
      normalize(notification.type),
      normalize(notification.source_type),
      notification.source_id.trim(),
    ].join(":");
    const count = Math.max(1, notification.aggregate_count ?? 1);
    const existing = merged.get(key);

    if (!existing) {
      const item: DisplayNotification = {
        ...notification,
        aggregate_count: count,
        merged_count: count,
        merged_ids: [notification.id],
      };
      merged.set(key, item);
      result.push(item);
      continue;
    }

    existing.aggregate_count = (existing.aggregate_count ?? 1) + count;
    existing.merged_count = (existing.merged_count ?? 1) + count;
    existing.merged_ids = [...(existing.merged_ids ?? [existing.id]), notification.id];
    existing.read_at = existing.read_at && notification.read_at ? existing.read_at : null;

    if (Date.parse(notification.created_at) > Date.parse(existing.created_at)) {
      existing.id = notification.id;
      existing.actor = notification.actor;
      existing.last_actor = notification.last_actor;
      existing.last_actor_id = notification.last_actor_id;
      existing.created_at = notification.created_at;
      existing.updated_at = notification.updated_at;
    }
  }

  return result;
}

export function getNotificationActor(
  notification: Notification,
): NotificationActorView {
  const actor = notification.actor ?? notification.last_actor ?? null;
  const displayName = getActorDisplayName(actor);
  const username = actor?.username?.trim() ?? "";

  return {
    avatarUrl: actor?.avatar_url?.trim() ?? "",
    displayName,
    initial: getInitial(displayName),
    isKnown: Boolean(actor),
    username,
  };
}

export function formatNotificationMessage(notification: DisplayNotification) {
  const count = notification.aggregate_count ?? notification.merged_count ?? 0;

  if (isLikeNotification(notification) && count > 1) {
    const actor = getNotificationActor(notification);

    return `${actor.displayName}等 ${count} 人赞了你的内容`;
  }

  return notification.body || notification.title || "你收到了一条新消息";
}

function isLikeNotification(notification: Notification) {
  const value = [
    notification.type,
    notification.source_type,
    notification.title,
    notification.body,
  ]
    .join(" ")
    .toLowerCase();

  return (
    value.includes("like") ||
    value.includes("upvote") ||
    value.includes("vote") ||
    value.includes("reaction") ||
    value.includes("赞")
  );
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/[-\s]+/g, "_");
}

function getActorDisplayName(actor: NotificationActor | null) {
  return actor?.display_name?.trim() || actor?.username?.trim() || "用户";
}

function getInitial(value: string) {
  return Array.from(value.trim())[0]?.toUpperCase() || "用";
}
