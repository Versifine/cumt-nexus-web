"use client";

import { Send } from "lucide-react";

import { cn } from "@/lib/utils";

type DisabledMessageShareActionProps = {
  className?: string;
  iconClassName?: string;
  label?: string;
};

export function DisabledMessageShareAction({
  className,
  iconClassName,
  label = "发送私信",
}: DisabledMessageShareActionProps) {
  return (
    <span
      aria-disabled="true"
      className={cn(
        "inline-flex h-7 cursor-not-allowed items-center gap-1.5 px-1 text-muted-foreground/70",
        className,
      )}
      title="私信后端未接入，当前不能发送给好友。"
    >
      <Send className={cn("size-3.5", iconClassName)} aria-hidden="true" />
      {label}
    </span>
  );
}
