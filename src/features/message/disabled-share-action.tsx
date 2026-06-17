"use client";

import { Send } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

import { getMessageShareHref } from "./share";
import type { MessageShareSnapshot } from "./types";

type DisabledMessageShareActionProps = {
  className?: string;
  iconClassName?: string;
  label?: string;
  share?: MessageShareSnapshot | null;
};

export function DisabledMessageShareAction({
  className,
  iconClassName,
  label = "发送私信",
  share,
}: DisabledMessageShareActionProps) {
  if (share) {
    return (
      <Link
        href={getMessageShareHref(share)}
        className={cn(
          "inline-flex h-7 items-center gap-1.5 px-1 text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          className,
        )}
        title="发送给好友"
      >
        <Send className={cn("size-3.5", iconClassName)} aria-hidden="true" />
        {label}
      </Link>
    );
  }

  return (
    <span
      aria-disabled="true"
      className={cn(
        "inline-flex h-7 cursor-not-allowed items-center gap-1.5 px-1 text-muted-foreground/70",
        className,
      )}
      title="缺少可发送的分享内容。"
    >
      <Send className={cn("size-3.5", iconClassName)} aria-hidden="true" />
      {label}
    </span>
  );
}
