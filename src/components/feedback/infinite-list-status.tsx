import { forwardRef } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type InfiniteListStatusProps = {
  className?: string;
  endLabel?: string;
  hasNextPage: boolean;
  isFetching: boolean;
  loadingLabel?: string;
  loadMoreLabel?: string;
  onLoadMore: () => void;
};

export const InfiniteListStatus = forwardRef<
  HTMLDivElement,
  InfiniteListStatusProps
>(function InfiniteListStatus(
  {
    className,
    endLabel = "已经到底了",
    hasNextPage,
    isFetching,
    loadingLabel = "正在加载更多",
    loadMoreLabel = "加载更多",
    onLoadMore,
  },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "flex min-h-16 items-center justify-center rounded-lg bg-surface px-4 py-3 text-xs text-muted-foreground",
        className,
      )}
      aria-live="polite"
    >
      {isFetching ? (
        <span className="inline-flex items-center gap-2 font-medium text-primary">
          <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
          {loadingLabel}
        </span>
      ) : hasNextPage ? (
        <Button type="button" variant="ghost" size="sm" onClick={onLoadMore}>
          {loadMoreLabel}
        </Button>
      ) : (
        <span>{endLabel}</span>
      )}
    </div>
  );
});
