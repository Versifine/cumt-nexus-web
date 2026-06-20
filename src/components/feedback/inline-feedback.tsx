"use client";

import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

import { cn } from "@/lib/utils";

type InlineFeedbackTone = "error" | "info" | "success";

type InlineFeedbackProps = {
  action?: ReactNode;
  className?: string;
  description: ReactNode;
  onDismiss?: () => void;
  title: string;
  tone?: InlineFeedbackTone;
};

const toneClasses: Record<InlineFeedbackTone, string> = {
  error: "border-destructive/25 bg-destructive/10 text-destructive",
  info: "border-border bg-surface-raised text-muted-foreground",
  success: "border-emerald-300/25 bg-emerald-400/10 text-emerald-300",
};

const iconClasses: Record<InlineFeedbackTone, string> = {
  error: "text-destructive",
  info: "text-muted-foreground",
  success: "text-emerald-300",
};

const icons = {
  error: AlertCircle,
  info: Info,
  success: CheckCircle2,
};

export function InlineFeedback({
  action,
  className,
  description,
  onDismiss,
  title,
  tone = "error",
}: InlineFeedbackProps) {
  const Icon = icons[tone];

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "grid grid-cols-[20px_minmax(0,1fr)_auto] gap-3 rounded-lg border py-3 pl-3 pr-1 text-sm",
        toneClasses[tone],
        className,
      )}
    >
      <Icon className={cn("mt-0.5 size-4", iconClasses[tone])} aria-hidden="true" />
      <div className="min-w-0">
        <div className="font-semibold text-foreground">{title}</div>
        <div className="mt-1 text-sm leading-6 text-muted-foreground">
          {description}
        </div>
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          className="inline-flex size-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="关闭提示"
          onClick={onDismiss}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
