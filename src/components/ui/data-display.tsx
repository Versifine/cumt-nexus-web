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
        variant === "default" &&
          "border-r border-border px-3 py-4 last:border-r-0",
        variant === "compact" &&
          "border-b border-border px-4 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0",
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
};

export function InfoRow({
  active = false,
  className,
  icon,
  label,
  labelClassName,
  value,
  valueClassName,
}: InfoRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 py-3 text-sm",
        active ? "text-primary" : "text-muted-foreground",
        className,
      )}
    >
      <span className={cn("inline-flex items-center gap-2", labelClassName)}>
        {icon}
        {label}
      </span>
      <span
        className={cn(
          "min-w-0 truncate text-right font-medium text-foreground",
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
        "grid gap-3 border-b border-border py-4 last:border-b-0 sm:grid-cols-[56px_minmax(0,1fr)]",
        className,
      )}
    >
      <div className="font-mono text-xs text-primary">{index}</div>
      <div>
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

type MetaCellProps = {
  className?: string;
  label: ReactNode;
  value: ReactNode;
};

export function MetaCell({ className, label, value }: MetaCellProps) {
  return (
    <div className={cn("px-3 py-2", className)}>
      <div className="font-mono text-[11px] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 truncate text-xs text-foreground">{value}</div>
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
        "border px-2 py-0.5 text-xs font-medium",
        tone === "default" &&
          "border-border bg-background text-muted-foreground",
        tone === "primary" && "border-primary/40 bg-primary/10 text-primary",
        tone === "success" &&
          "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
        tone === "warning" &&
          "border-amber-400/30 bg-amber-500/10 text-amber-300",
        tone === "danger" && "border-red-400/30 bg-red-500/10 text-red-300",
        className,
      )}
    >
      {children}
    </span>
  );
}
