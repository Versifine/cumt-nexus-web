import type { NotificationCategory } from "./types";

export const notificationCategoryOptions: Array<{
  label: string;
  value: NotificationCategory;
}> = [
  { label: "互动消息", value: "interactions" },
  { label: "系统通知", value: "system" },
];

export const notificationCategorySegments = [
  "system",
] as const satisfies ReadonlyArray<Exclude<NotificationCategory, "interactions">>;

export const legacyNotificationCategorySegments = [
  "all",
  "interactions",
  "replies",
  "mentions",
  "likes",
] as const;

export type NotificationCategorySegment =
  (typeof notificationCategorySegments)[number];

export function isNotificationCategorySegment(
  value: string,
): value is NotificationCategorySegment {
  return notificationCategorySegments.includes(
    value as NotificationCategorySegment,
  );
}

export function getNotificationCategoryHref(category: NotificationCategory) {
  return category === "interactions" ? "/notifications" : `/notifications/${category}`;
}
