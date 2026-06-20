import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ManagementWorkspaceProps = {
  children: ReactNode;
  className?: string;
  rail?: ReactNode;
};

type ManagementHeaderProps = {
  actions?: ReactNode;
  children?: ReactNode;
  description: ReactNode;
  eyebrow: ReactNode;
  meta?: ReactNode;
  title: ReactNode;
};

type ManagementSectionProps = {
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  headerAction?: ReactNode;
  title?: ReactNode;
};

export function ManagementWorkspace({
  children,
  className,
  rail,
}: ManagementWorkspaceProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 py-2",
        rail && "xl:grid-cols-[minmax(0,1fr)_280px]",
        className,
      )}
    >
      <main className="min-w-0 space-y-4">{children}</main>
      {rail}
    </div>
  );
}

export function ManagementHeader({
  actions,
  children,
  description,
  eyebrow,
  meta,
  title,
}: ManagementHeaderProps) {
  return (
    <section className="rounded-lg bg-surface p-4">
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="font-mono text-xs text-primary">{eyebrow}</div>
          <h1 className="mt-2 break-words text-2xl font-semibold leading-8 tracking-normal text-foreground">
            {title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>

      {meta ? (
        <div className="mt-4 rounded-md bg-surface-raised">{meta}</div>
      ) : null}

      {children}
    </section>
  );
}

export function ManagementSection({
  children,
  className,
  description,
  headerAction,
  title,
}: ManagementSectionProps) {
  return (
    <section className={cn("rounded-lg bg-surface p-4", className)}>
      {title || description || headerAction ? (
        <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {title ? (
              <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function ManagementSplit({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 xl:grid-cols-[minmax(300px,420px)_minmax(0,1fr)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ManagementStatePanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <ManagementSection className={cn("min-h-48", className)}>
      {children}
    </ManagementSection>
  );
}
