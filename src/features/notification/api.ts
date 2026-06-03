import { apiRequest } from "@/lib/api/client";

import type {
  ListNotificationsInput,
  ListNotificationsResponse,
  MarkNotificationReadResponse,
} from "./types";

export function listNotifications({
  status = "unread",
  limit = 20,
  offset = 0,
}: ListNotificationsInput = {}) {
  const params = new URLSearchParams({
    status,
    limit: String(limit),
    offset: String(offset),
  });

  return apiRequest<ListNotificationsResponse>(
    `/api/v1/notifications?${params.toString()}`,
  );
}

export function markNotificationRead(id: string) {
  return apiRequest<MarkNotificationReadResponse>(
    `/api/v1/notifications/${encodeURIComponent(id)}/read`,
    {
      method: "POST",
    },
  );
}
