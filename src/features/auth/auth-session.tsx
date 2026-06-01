"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
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

import { authQueryKeys } from "./query-keys";

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

  const setToken = useCallback((nextToken: string) => {
    writeAccessToken(nextToken);
  }, []);

  const clearSession = useCallback(() => {
    clearAccessToken();
    queryClient.removeQueries({ queryKey: authQueryKeys.all });
  }, [queryClient]);

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
