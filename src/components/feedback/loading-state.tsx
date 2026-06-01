import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type LoadingStateProps = {
  rows?: number;
  className?: string;
};

export function LoadingState({ rows = 3, className }: LoadingStateProps) {
  return (
    <div className={cn("space-y-4", className)} aria-label="Loading content">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-start gap-4">
          <Skeleton className="size-9 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-full max-w-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
