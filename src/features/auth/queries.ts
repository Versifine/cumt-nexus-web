"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { ApiError } from "@/lib/api/client";

import { getCurrentUser } from "./api";
import { useAuthSession } from "./auth-session";
import { authQueryKeys } from "./query-keys";

export function useCurrentUserQuery() {
  const { clearSession, isReady, token } = useAuthSession();
  const query = useQuery({
    queryKey: authQueryKeys.me(),
    queryFn: getCurrentUser,
    enabled: isReady && Boolean(token),
    retry: false,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (query.error instanceof ApiError && query.error.code === "unauthenticated") {
      clearSession();
    }
  }, [clearSession, query.error]);

  return query;
}
