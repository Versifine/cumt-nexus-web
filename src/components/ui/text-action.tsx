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
          "group relative flex items-center justify-between overflow-hidden border-b border-border py-3 text-sm font-semibold last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          className,
        )}
      >
        <span
          className={cn(
            "absolute inset-y-0 left-0 w-1 transition-all duration-200 group-hover:w-full",
            isPrimary ? "bg-primary" : "bg-foreground",
          )}
          aria-hidden="true"
        />
        <span
          className={cn(
            "relative z-10 inline-flex min-w-0 items-center gap-2 pl-3 transition-colors",
            isPrimary
              ? "text-foreground group-hover:text-primary-foreground"
              : "text-foreground group-hover:text-background",
          )}
        >
          {isBack ? (
            <Icon
              className="size-4 shrink-0 transition-transform group-hover:-translate-x-1"
              aria-hidden="true"
            />
          ) : null}
          {children}
        </span>
        {!isBack ? (
          <Icon
            className={cn(
              "relative z-10 mr-3 size-4 transition-transform group-hover:translate-x-1",
              isPrimary
                ? "text-primary group-hover:text-primary-foreground"
                : "text-muted-foreground group-hover:text-background",
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
        "group inline-flex min-h-9 items-center gap-2 border-b border-transparent px-0.5 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
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
            className="size-4 shrink-0 transition-transform group-hover:-translate-x-1"
            aria-hidden="true"
          />
        ) : null}
        {children}
      </span>
      {!isBack ? (
        <span
          className={cn(
            "font-mono text-xs transition-colors",
            isPrimary ? "text-primary" : "text-muted-foreground group-hover:text-primary",
          )}
        >
          +
        </span>
      ) : null}
    </Link>
  );
}
