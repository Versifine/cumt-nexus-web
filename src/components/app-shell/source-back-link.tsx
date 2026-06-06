"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";

type SourceBackLinkProps = {
  children: ReactNode;
  className?: string;
  href: string;
};

export function SourceBackLink({
  children,
  className,
  href,
}: SourceBackLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex h-10 min-w-0 items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      <ArrowLeft
        className="size-4 shrink-0 transition-transform group-hover:-translate-x-1"
        aria-hidden="true"
      />
      <span className="truncate">{children}</span>
    </Link>
  );
}
