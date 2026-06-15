import { useQuery } from "@tanstack/react-query";

import { listNotifications } from "./api";
import type {
  ListNotificationsInput,
  NotificationCategory,
} from "./types";

export const notificationQueryKeys = {
  all: ["notifications"] as const,
  list: (
    category: NotificationCategory,
    limit: number,
    offset: number,
  ) => ["notifications", "list", { category, limit, offset }] as const,
};

export function useNotificationsQuery({
  category = "interactions",
  limit = 20,
  offset = 0,
}: ListNotificationsInput = {}, enabled = true) {
  return useQuery({
    queryKey: notificationQueryKeys.list(category, limit, offset),
    queryFn: () => listNotifications({ category, limit, offset }),
    enabled,
  });
}
