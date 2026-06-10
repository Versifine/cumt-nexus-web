import type { NotificationCategory } from "./types";

export const notificationCategoryOptions: Array<{
  label: string;
  value: NotificationCategory;
}> = [
  { label: "全部", value: "all" },
  { label: "回复", value: "replies" },
  { label: "@", value: "mentions" },
  { label: "赞", value: "likes" },
  { label: "系统", value: "system" },
];

export const notificationCategorySegments = [
  "replies",
  "mentions",
  "likes",
  "system",
] as const satisfies ReadonlyArray<Exclude<NotificationCategory, "all">>;

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
  return category === "all" ? "/notifications" : `/notifications/${category}`;
}
