import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getUnreadSummary,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "./api";
import type {
  ListNotificationsInput,
  NotificationCategory,
  NotificationStatus,
} from "./types";

export const notificationQueryKeys = {
  all: ["notifications"] as const,
  list: (
    category: NotificationCategory,
    status: NotificationStatus,
    limit: number,
    offset: number,
  ) => ["notifications", "list", { category, limit, offset, status }] as const,
  unreadSummary: () => ["notifications", "unread-summary"] as const,
};

export function useNotificationsQuery({
  category = "all",
  status = "unread",
  limit = 20,
  offset = 0,
}: ListNotificationsInput = {}, enabled = true) {
  return useQuery({
    queryKey: notificationQueryKeys.list(category, status, limit, offset),
    queryFn: () => listNotifications({ category, status, limit, offset }),
    enabled,
  });
}

export function useUnreadSummaryQuery(enabled = true) {
  return useQuery({
    queryKey: notificationQueryKeys.unreadSummary(),
    queryFn: () => getUnreadSummary(),
    enabled,
  });
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: notificationQueryKeys.all,
      });
    },
  });
}

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: notificationQueryKeys.all,
      });
    },
  });
}
