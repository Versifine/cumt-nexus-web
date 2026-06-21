import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ReviewDeskProps = {
  children: ReactNode;
  className?: string;
};

type ReviewDeskMastheadProps = {
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  description?: ReactNode;
  eyebrow?: ReactNode;
  meta?: ReactNode;
  title: ReactNode;
};

type ReviewDeskBoardProps = {
  children: ReactNode;
  className?: string;
  inspector?: ReactNode;
};

type ReviewDeskPanelProps = {
  children?: ReactNode;
  className?: string;
  description?: ReactNode;
  headerAction?: ReactNode;
  title?: ReactNode;
};

type ReviewDeskStateProps = {
  children: ReactNode;
  className?: string;
};

export function ReviewDesk({ children, className }: ReviewDeskProps) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[1280px] flex-col gap-4 py-2 lg:py-4",
        className,
      )}
    >
      {children ? children : null}
    </div>
  );
}

export function ReviewDeskMasthead({
  actions,
  children,
  className,
  description,
  eyebrow,
  meta,
  title,
}: ReviewDeskMastheadProps) {
  return (
    <section
      className={cn(
        "nexus-soft-transition overflow-hidden rounded-lg bg-surface px-4 py-4 sm:px-5",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <div className="font-mono text-[11px] font-medium uppercase tracking-normal text-primary">
              {eyebrow}
            </div>
          ) : null}
          <h1 className="mt-2 break-words text-2xl font-semibold leading-8 tracking-normal text-foreground sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-3xl break-words text-sm leading-6 text-muted-foreground [overflow-wrap:anywhere]">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {meta ? (
        <div className="mt-4 grid overflow-hidden rounded-md bg-surface-raised sm:grid-cols-2 lg:grid-cols-4">
          {meta}
        </div>
      ) : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}

export function ReviewDeskBoard({
  children,
  className,
  inspector,
}: ReviewDeskBoardProps) {
  if (!inspector) {
    return <div className={cn("min-w-0 space-y-4", className)}>{children}</div>;
  }

  return (
    <div
      className={cn(
        "grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]",
        className,
      )}
    >
      <div className="min-w-0 space-y-4">{children}</div>
      <aside className="min-w-0 xl:sticky xl:top-20 xl:self-start">{inspector}</aside>
    </div>
  );
}

export function ReviewDeskPanel({
  children,
  className,
  description,
  headerAction,
  title,
}: ReviewDeskPanelProps) {
  return (
    <section
      className={cn(
        "nexus-soft-transition overflow-hidden rounded-lg bg-surface p-4 sm:p-5",
        className,
      )}
    >
      {title || description || headerAction ? (
        <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {title ? (
              <h2 className="break-words text-base font-semibold leading-6 text-foreground">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-1 break-words text-sm leading-6 text-muted-foreground [overflow-wrap:anywhere]">
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

export function ReviewDeskInspector({
  children,
  className,
  description,
  title,
}: ReviewDeskPanelProps) {
  return (
    <section
      className={cn(
        "nexus-soft-transition overflow-hidden rounded-lg bg-surface p-4 sm:p-5",
        className,
      )}
    >
      {title ? (
        <h2 className="break-words text-base font-semibold leading-6 text-foreground">
          {title}
        </h2>
      ) : null}
      {description ? (
        <p className="mt-1 break-words text-sm leading-6 text-muted-foreground [overflow-wrap:anywhere]">
          {description}
        </p>
      ) : null}
      {children ? (
        <div className={title || description ? "mt-4" : undefined}>
          {children}
        </div>
      ) : null}
    </section>
  );
}

export function ReviewDeskState({ children, className }: ReviewDeskStateProps) {
  return (
    <section
      className={cn(
        "nexus-soft-transition overflow-hidden rounded-lg bg-surface p-6",
        className,
      )}
    >
      {children}
    </section>
  );
}
