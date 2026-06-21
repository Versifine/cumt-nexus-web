import { Pin } from "lucide-react";

import { cn } from "@/lib/utils";

type PostPinnedNoticeProps = {
  className?: string;
  variant?: "detail" | "preview";
};

export function PostPinnedNotice({
  className,
  variant = "preview",
}: PostPinnedNoticeProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2 bg-primary/10 text-primary",
        variant === "preview" && "min-h-8 px-3 py-1.5 text-xs",
        variant === "detail" && "min-h-10 px-3 py-2 text-sm sm:px-4",
        className,
      )}
    >
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15">
        <Pin className="size-3.5" aria-hidden="true" />
      </span>
      <span className="shrink-0 font-semibold">社区置顶</span>
      <span className="hidden min-w-0 truncate text-muted-foreground sm:inline">
        由社区管理团队固定在讨论顶部
      </span>
    </div>
  );
}
