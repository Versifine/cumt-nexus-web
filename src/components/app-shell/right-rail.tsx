"use client";

import type { ReactNode } from "react";

import { TextAction } from "@/components/ui/text-action";
import { cn } from "@/lib/utils";

type RightRailProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

type RightRailSectionProps = {
  children?: ReactNode;
  className?: string;
  description?: ReactNode;
  descriptionClassName?: string;
  meta?: ReactNode;
  title: ReactNode;
};

type RightRailActionProps = {
  children: ReactNode;
  className?: string;
  direction?: "back" | "forward";
  href: string;
  tone?: "default" | "primary";
};

type RightRailInfoRowProps = {
  className?: string;
  columnsClassName?: string;
  label: ReactNode;
  labelClassName?: string;
  value: ReactNode;
  valueClassName?: string;
};

export function RightRail({
  children,
  className,
  contentClassName,
}: RightRailProps) {
  return (
    <aside className={cn("px-0 xl:pl-1", className)}>
      <div
        className={cn(
          "sticky top-20 right-rail-scroll space-y-4",
          contentClassName,
        )}
      >
        {children}
      </div>
    </aside>
  );
}

export function RightRailSection({
  children,
  className,
  description,
  descriptionClassName,
  meta,
  title,
}: RightRailSectionProps) {
  return (
    <section className={cn("rounded-lg bg-surface p-4", className)}>
      <div className="flex min-w-0 items-center justify-between gap-3">
        <h2 className="min-w-0 text-sm font-semibold text-foreground">
          {title}
        </h2>
        {meta ? (
          <span className="shrink-0 font-mono text-xs text-muted-foreground">
            {meta}
          </span>
        ) : null}
      </div>
      {description ? (
        <p
          className={cn(
            "mt-2 text-sm leading-6 text-muted-foreground",
            descriptionClassName,
          )}
        >
          {description}
        </p>
      ) : null}
      {children}
    </section>
  );
}

export function RightRailActionList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("mt-4 flex flex-col", className)}>{children}</div>;
}

export function RightRailAction({
  children,
  className,
  direction,
  href,
  tone,
}: RightRailActionProps) {
  return (
    <TextAction
      className={className}
      direction={direction}
      href={href}
      tone={tone}
      variant="bar"
    >
      {children}
    </TextAction>
  );
}

export function RightRailInfoList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <dl className={cn("mt-3 rounded-md bg-surface-raised", className)}>
      {children}
    </dl>
  );
}

export function RightRailInfoRow({
  className,
  columnsClassName,
  label,
  labelClassName,
  value,
  valueClassName,
}: RightRailInfoRowProps) {
  return (
    <div
      className={cn(
        "grid items-start gap-3 px-3 py-2.5 text-sm first:rounded-t-md last:rounded-b-md",
        columnsClassName ?? "grid-cols-[56px_minmax(0,1fr)]",
        className,
      )}
    >
      <dt className={cn("text-muted-foreground", labelClassName)}>{label}</dt>
      <dd
        className={cn(
          "min-w-0 break-words font-semibold text-foreground",
          valueClassName,
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export function RightRailRaisedList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mt-3 rounded-md bg-surface-raised", className)}>
      {children}
    </div>
  );
}
