import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { listNotifications, markNotificationRead } from "./api";
import type { ListNotificationsInput, NotificationStatus } from "./types";

export const notificationQueryKeys = {
  all: ["notifications"] as const,
  list: (status: NotificationStatus, limit: number, offset: number) =>
    ["notifications", { limit, offset, status }] as const,
};

export function useNotificationsQuery({
  status = "unread",
  limit = 20,
  offset = 0,
}: ListNotificationsInput = {}, enabled = true) {
  return useQuery({
    queryKey: notificationQueryKeys.list(status, limit, offset),
    queryFn: () => listNotifications({ status, limit, offset }),
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
