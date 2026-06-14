"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  clearAccessToken,
  readAccessToken,
  subscribeAccessTokenChange,
  writeAccessToken,
} from "@/lib/auth/token-storage";

type AuthSessionContextValue = {
  token: string | null;
  isReady: boolean;
  setToken: (token: string) => void;
  clearSession: () => void;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

type AuthSessionProviderProps = {
  children: ReactNode;
};

export function AuthSessionProvider({ children }: AuthSessionProviderProps) {
  const queryClient = useQueryClient();
  const token = useSyncExternalStore(
    subscribeAccessTokenChange,
    readAccessToken,
    () => null,
  );
  const previousTokenRef = useRef<string | null>(token);

  const setToken = useCallback((nextToken: string) => {
    const currentToken = readAccessToken();

    if (currentToken !== nextToken) {
      queryClient.clear();
      previousTokenRef.current = nextToken;
      dispatchRecentCommunitiesChanged();
    }

    writeAccessToken(nextToken);
  }, [queryClient]);

  const clearSession = useCallback(() => {
    previousTokenRef.current = null;
    clearAccessToken();
    queryClient.clear();
    dispatchRecentCommunitiesChanged();
  }, [queryClient]);

  useEffect(() => {
    if (previousTokenRef.current !== token) {
      queryClient.clear();
      dispatchRecentCommunitiesChanged();
    }

    previousTokenRef.current = token;
  }, [queryClient, token]);

  const value = useMemo(
    () => ({
      token,
      isReady: true,
      setToken,
      clearSession,
    }),
    [clearSession, setToken, token],
  );

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useAuthSession() {
  const context = useContext(AuthSessionContext);

  if (!context) {
    throw new Error("useAuthSession must be used within AuthSessionProvider.");
  }

  return context;
}

function dispatchRecentCommunitiesChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event("cumt-nexus:recent-communities-changed"));
}
