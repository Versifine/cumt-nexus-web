"use client";

import type { ReactNode } from "react";

import { QueryProvider } from "@/lib/query/query-provider";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return <QueryProvider>{children}</QueryProvider>;
}
