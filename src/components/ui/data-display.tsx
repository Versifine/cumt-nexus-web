import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type StatusTokenTone =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger";

type MetricBlockProps = {
  className?: string;
  label: ReactNode;
  labelClassName?: string;
  value: ReactNode;
  valueClassName?: string;
  variant?: "default" | "compact";
};

export function MetricBlock({
  className,
  label,
  labelClassName,
  value,
  valueClassName,
  variant = "default",
}: MetricBlockProps) {
  return (
    <div
      className={cn(
        "nexus-soft-transition",
        variant === "default" && "px-3 py-4",
        variant === "compact" && "px-4 py-4",
        className,
      )}
    >
      <div
        className={cn(
          variant === "default" &&
            "font-mono text-[11px] uppercase text-muted-foreground",
          variant === "compact" && "text-xs text-muted-foreground",
          labelClassName,
        )}
      >
        {label}
      </div>
      <div
        className={cn(
          variant === "default" &&
            "mt-2 text-xl font-semibold leading-none text-foreground",
          variant === "compact" &&
            "mt-2 text-sm font-semibold text-foreground",
          valueClassName,
        )}
      >
        {value}
      </div>
    </div>
  );
}

type InfoRowProps = {
  active?: boolean;
  className?: string;
  icon?: ReactNode;
  label: ReactNode;
  labelClassName?: string;
  value: ReactNode;
  valueClassName?: string;
  wrap?: boolean;
};

export function InfoRow({
  active = false,
  className,
  icon,
  label,
  labelClassName,
  value,
  valueClassName,
  wrap = false,
}: InfoRowProps) {
  return (
    <div
      className={cn(
        "nexus-soft-transition flex min-w-0 items-center justify-between gap-4 py-3 text-sm",
        wrap && "items-start",
        active ? "text-primary" : "text-muted-foreground",
        className,
      )}
    >
      <span className={cn("inline-flex min-w-0 items-center gap-2", labelClassName)}>
        {icon}
        {label}
      </span>
      <span
        className={cn(
          "min-w-0 text-right font-medium text-foreground",
          wrap
            ? "break-words whitespace-normal [overflow-wrap:anywhere]"
            : "truncate",
          valueClassName,
        )}
      >
        {value}
      </span>
    </div>
  );
}

type IndexedInfoRowProps = {
  className?: string;
  index: string;
  text: ReactNode;
  title: ReactNode;
};

export function IndexedInfoRow({
  className,
  index,
  text,
  title,
}: IndexedInfoRowProps) {
  return (
    <div
      className={cn(
        "nexus-soft-transition grid gap-3 rounded-md bg-surface-raised p-4 sm:grid-cols-[56px_minmax(0,1fr)]",
        className,
      )}
    >
      <div className="font-mono text-xs text-primary">{index}</div>
      <div className="min-w-0">
        <div className="break-words text-sm font-semibold text-foreground [overflow-wrap:anywhere]">
          {title}
        </div>
        <p className="mt-1 break-words text-sm leading-6 text-muted-foreground [overflow-wrap:anywhere]">
          {text}
        </p>
      </div>
    </div>
  );
}

type MetaCellProps = {
  className?: string;
  label: ReactNode;
  value: ReactNode;
  wrap?: boolean;
};

export function MetaCell({ className, label, value, wrap = false }: MetaCellProps) {
  return (
    <div className={cn("nexus-soft-transition min-w-0 px-3 py-2", className)}>
      <div className="font-mono text-[11px] text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-xs text-foreground",
          wrap
            ? "break-words [overflow-wrap:anywhere]"
            : "truncate",
        )}
      >
        {value}
      </div>
    </div>
  );
}

type StatusTokenProps = {
  children: ReactNode;
  className?: string;
  tone?: StatusTokenTone;
};

export function StatusToken({
  children,
  className,
  tone = "default",
}: StatusTokenProps) {
  return (
    <span
      className={cn(
        "nexus-soft-transition inline-flex max-w-full items-center rounded-full px-2 py-0.5 text-xs font-medium",
        tone === "default" &&
          "bg-surface-raised text-muted-foreground",
        tone === "primary" && "bg-primary/10 text-primary",
        tone === "success" &&
          "bg-emerald-500/10 text-emerald-300",
        tone === "warning" &&
          "bg-amber-500/10 text-amber-300",
        tone === "danger" && "bg-red-500/10 text-red-300",
        className,
      )}
    >
      {children}
    </span>
  );
}
