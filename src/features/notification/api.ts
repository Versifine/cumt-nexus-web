import { apiRequest } from "@/lib/api/client";

import type {
  ListNotificationsInput,
  ListNotificationsResponse,
} from "./types";

export function listNotifications({
  category = "interactions",
  limit = 20,
  offset = 0,
}: ListNotificationsInput = {}) {
  const params = new URLSearchParams({
    category,
    limit: String(limit),
    offset: String(offset),
  });

  return apiRequest<ListNotificationsResponse>(
    `/api/v1/notifications?${params.toString()}`,
  );
}
