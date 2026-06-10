import { apiRequest } from "@/lib/api/client";

import type {
  ListNotificationsInput,
  ListNotificationsResponse,
  MarkAllNotificationsReadResponse,
  MarkNotificationReadResponse,
  UnreadSummaryResponse,
} from "./types";

export function listNotifications({
  category = "all",
  status = "unread",
  limit = 20,
  offset = 0,
}: ListNotificationsInput = {}) {
  const params = new URLSearchParams({
    category,
    status,
    limit: String(limit),
    offset: String(offset),
  });

  return apiRequest<ListNotificationsResponse>(
    `/api/v1/notifications?${params.toString()}`,
  );
}

export function getUnreadSummary() {
  return apiRequest<UnreadSummaryResponse>("/api/v1/notifications/unread-summary");
}

export function markNotificationRead(id: string) {
  return apiRequest<MarkNotificationReadResponse>(
    `/api/v1/notifications/${encodeURIComponent(id)}/read`,
    {
      method: "POST",
    },
  );
}

export function markAllNotificationsRead() {
  return apiRequest<MarkAllNotificationsReadResponse>(
    "/api/v1/notifications/read-all",
    {
      method: "POST",
    },
  );
}
