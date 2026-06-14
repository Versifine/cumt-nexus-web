"use client";

import type { ReactNode } from "react";

import { AuthSessionProvider } from "@/features/auth/auth-session";
import { QueryProvider } from "@/lib/query/query-provider";
import { ThemeProvider } from "@/lib/theme/theme-provider";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
