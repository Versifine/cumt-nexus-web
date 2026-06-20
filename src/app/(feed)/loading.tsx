import { Skeleton } from "@/components/ui/skeleton";

export default function FeedLoading() {
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
      <section className="min-w-0">
        <div className="space-y-4">
          <div className="rounded-lg bg-surface px-4 py-4">
            <Skeleton className="h-5 w-24 rounded-sm" />
            <Skeleton className="mt-3 h-4 w-64 max-w-full rounded-sm" />
          </div>

          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="grid min-h-32 grid-cols-[44px_minmax(0,1fr)] overflow-hidden rounded-lg bg-surface"
              >
                <div className="bg-background-soft px-2 py-3">
                  <Skeleton className="mx-auto size-8 rounded-md" />
                  <Skeleton className="mx-auto mt-2 h-3 w-5 rounded-sm" />
                </div>
                <div className="min-w-0 px-4 py-4">
                  <Skeleton className="h-4 w-44 max-w-full rounded-sm" />
                  <Skeleton className="mt-3 h-6 w-3/4 rounded-sm" />
                  <Skeleton className="mt-3 h-4 w-full max-w-2xl rounded-sm" />
                  <div className="mt-4 flex gap-3">
                    <Skeleton className="h-4 w-12 rounded-sm" />
                    <Skeleton className="h-4 w-14 rounded-sm" />
                    <Skeleton className="h-4 w-16 rounded-sm" />
                  </div>
                </div>
              </div>
            ))}
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
          <section className="rounded-lg bg-surface p-4">
            <Skeleton className="h-4 w-28 rounded-sm" />
            <div className="mt-4 space-y-3">
              <Skeleton className="h-4 w-full rounded-sm" />
              <Skeleton className="h-4 w-5/6 rounded-sm" />
              <Skeleton className="h-4 w-3/4 rounded-sm" />
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
