import { apiRequest } from "@/lib/api/client";

import type {
  GetMyProgressionResponse,
  ListMyTitlesResponse,
  ListMyXPEventsResponse,
  ListPointTransactionsResponse,
  SetActiveTitleInput,
  SetActiveTitleResponse,
} from "./types";

type ListInput = {
  limit?: number;
  offset?: number;
};

export function getMyProgression() {
  return apiRequest<GetMyProgressionResponse>("/api/v1/me/progression");
}

export function listMyXPEvents({ limit = 20, offset = 0 }: ListInput = {}) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  return apiRequest<ListMyXPEventsResponse>(
    `/api/v1/me/xp-events?${params.toString()}`,
  );
}

export function listMyTitles({ limit = 20, offset = 0 }: ListInput = {}) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  return apiRequest<ListMyTitlesResponse>(
    `/api/v1/me/titles?${params.toString()}`,
  );
}

export function setActiveTitle(input: SetActiveTitleInput) {
  return apiRequest<SetActiveTitleResponse>("/api/v1/me/title", {
    method: "PATCH",
    body: input,
  });
}

export function listMyPointTransactions({
  limit = 20,
  offset = 0,
}: ListInput = {}) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  return apiRequest<ListPointTransactionsResponse>(
    `/api/v1/me/point-transactions?${params.toString()}`,
  );
}
