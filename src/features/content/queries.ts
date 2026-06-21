"use client";

import { useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  readAccessToken,
  subscribeAccessTokenChange,
} from "@/lib/auth/token-storage";

import { resolveContentEmbed } from "./api";

export const contentQueryKeys = {
  all: ["content"] as const,
  embedResolve: (url: string) => [...contentQueryKeys.all, "embed-resolve", url] as const,
};

export function useContentEmbedResolveQuery(url: string, enabled = true) {
  const token = useSyncExternalStore(
    subscribeAccessTokenChange,
    readAccessToken,
    () => null,
  );

  return useQuery({
    queryKey: contentQueryKeys.embedResolve(url),
    queryFn: () => resolveContentEmbed(url, token),
    enabled: enabled && Boolean(url) && Boolean(token),
    retry: false,
    staleTime: 10 * 60 * 1000,
  });
}
