import { AppShell } from "@/components/app-shell/app-shell";
import { LoadingState } from "@/components/feedback/loading-state";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <AppShell>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section className="min-w-0">
          <div className="space-y-4">
            <div className="rounded-lg bg-surface px-4 py-4">
              <Skeleton className="h-5 w-28 rounded-sm" />
              <Skeleton className="mt-3 h-4 w-64 max-w-full rounded-sm" />
            </div>
            <div className="rounded-lg bg-surface px-4 py-5">
              <LoadingState rows={5} />
            </div>
          </div>
        </section>

        <aside className="hidden px-0 xl:block xl:pl-1">
          <div className="sticky top-20 space-y-4">
            <section className="rounded-lg bg-surface p-4">
              <Skeleton className="h-4 w-24 rounded-sm" />
              <Skeleton className="mt-3 h-4 w-full rounded-sm" />
              <Skeleton className="mt-2 h-4 w-4/5 rounded-sm" />
            </section>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
