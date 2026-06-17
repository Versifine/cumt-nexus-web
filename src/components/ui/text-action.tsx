"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

type TextActionProps = {
  children: ReactNode;
  className?: string;
  direction?: "back" | "forward";
  href: string;
  tone?: "default" | "primary";
  variant?: "inline" | "bar";
};

export function TextAction({
  children,
  className,
  direction = "forward",
  href,
  tone = "default",
  variant = "inline",
}: TextActionProps) {
  const isPrimary = tone === "primary";
  const isBack = direction === "back";

  if (variant === "bar") {
    const Icon = isBack ? ArrowLeft : ArrowRight;

    return (
      <Link
        href={href}
        className={cn(
          "nexus-micro-lift group my-0.5 flex items-center justify-between rounded-md px-3 py-3 text-sm font-semibold first:mt-0 last:mb-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          isPrimary
            ? "bg-primary/10 text-foreground hover:bg-primary/15"
            : "bg-surface-raised text-foreground hover:bg-surface-hover",
          className,
        )}
      >
        <span
          className="inline-flex min-w-0 items-center gap-2 transition-colors duration-150 ease-out"
        >
          {isBack ? (
            <Icon
              className="size-4 shrink-0 transition-transform duration-150 ease-out group-hover:-translate-x-1 motion-reduce:transform-none"
              aria-hidden="true"
            />
          ) : null}
          {children}
        </span>
        {!isBack ? (
          <Icon
            className={cn(
              "size-4 transition-transform duration-150 ease-out group-hover:translate-x-1 motion-reduce:transform-none",
              isPrimary
                ? "text-primary"
                : "text-muted-foreground group-hover:text-foreground",
            )}
            aria-hidden="true"
          />
        ) : null}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "nexus-micro-lift group inline-flex min-h-9 items-center gap-2 border-b border-transparent px-0.5 text-sm font-semibold text-foreground hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      <span
        className={cn(
          "inline-flex items-center gap-2 transition-colors",
          isPrimary ? "text-primary" : "text-foreground",
        )}
      >
        {isBack ? (
          <ArrowLeft
            className="size-4 shrink-0 transition-transform duration-150 ease-out group-hover:-translate-x-1 motion-reduce:transform-none"
            aria-hidden="true"
          />
        ) : null}
        {children}
      </span>
      {!isBack ? (
        <span
          className={cn(
            "font-mono text-xs transition-colors duration-150 ease-out",
            isPrimary ? "text-primary" : "text-muted-foreground group-hover:text-primary",
          )}
        >
          +
        </span>
      ) : null}
    </Link>
  );
}
