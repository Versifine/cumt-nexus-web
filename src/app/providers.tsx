"use client";

import type { ReactNode } from "react";

import { AuthSessionProvider } from "@/features/auth/auth-session";
import { QueryProvider } from "@/lib/query/query-provider";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      <AuthSessionProvider>{children}</AuthSessionProvider>
    </QueryProvider>
  );
}
