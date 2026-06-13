import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main
      className="min-h-screen bg-background text-foreground"
      aria-busy="true"
      aria-label="正在加载页面"
    >
      <div className="mx-auto grid min-h-screen w-full max-w-[1440px] grid-cols-1 lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="hidden border-r border-border px-5 py-5 lg:fixed lg:left-[max(0px,calc((100vw-1440px)/2))] lg:top-0 lg:z-30 lg:block lg:h-dvh lg:w-[248px] lg:overflow-y-auto">
          <div className="border-b border-border pb-5">
            <div className="text-sm font-semibold">CUMT Nexus</div>
            <div className="mt-1 text-xs text-muted-foreground">校园社区</div>
          </div>

          <nav className="mt-6 space-y-4">
            {["首页", "全站", "关注", "社区"].map((label, index) => (
              <div key={label} className="flex items-center gap-3 text-sm">
                <span className="w-6 font-mono text-xs text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <Skeleton className="h-4 w-20 rounded-none" />
              </div>
            ))}
          </nav>

          <section className="mt-8 border-t border-border pt-5">
            <div className="font-mono text-[11px] uppercase text-muted-foreground">
              最近访问
            </div>
            <div className="mt-4 space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center justify-between gap-3">
                  <Skeleton className="h-4 w-24 rounded-none" />
                  <Skeleton className="h-3 w-10 rounded-none" />
                </div>
              ))}
            </div>
          </section>
        </aside>

        <section className="flex min-w-0 flex-col lg:col-start-2">
          <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-3 py-3 backdrop-blur md:px-4 lg:px-6">
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 lg:grid-cols-[minmax(120px,180px)_minmax(260px,1fr)_auto] lg:gap-4">
              <Skeleton className="size-10 rounded-none lg:hidden" />
              <div className="hidden min-w-0 lg:block">
                <div className="text-xs font-medium text-muted-foreground">
                  正在加载
                </div>
              </div>
              <Skeleton className="h-10 min-w-0 rounded-none" />
              <div className="flex items-center gap-1 sm:gap-2">
                <Skeleton className="size-10 rounded-none" />
                <Skeleton className="size-10 rounded-none" />
                <Skeleton className="size-10 rounded-none sm:w-24" />
              </div>
            </div>
          </header>

          <div className="min-w-0 flex-1">
            <div className="mx-auto w-full max-w-[1180px] px-4 py-6 md:px-6">
              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px]">
                <section className="min-w-0">
                  <div className="border-b border-border py-4">
                    <Skeleton className="h-5 w-28 rounded-none" />
                    <Skeleton className="mt-3 h-4 w-56 max-w-full rounded-none" />
                    <div className="mt-4 flex flex-wrap gap-3">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Skeleton
                          key={index}
                          className="h-5 w-12 rounded-none"
                        />
                      ))}
                    </div>
                  </div>

                  <section className="divide-y divide-border">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div
                        key={index}
                        className="grid gap-4 py-5 md:grid-cols-[48px_minmax(0,1fr)_80px]"
                      >
                        <div className="font-mono text-xs text-muted-foreground">
                          {String(index + 1).padStart(2, "0")}
                        </div>

                        <div className="min-w-0 space-y-3">
                          <Skeleton className="h-4 w-40 max-w-full rounded-none" />
                          <Skeleton className="h-6 w-3/4 rounded-none" />
                          <Skeleton className="h-4 w-full max-w-2xl rounded-none" />
                        </div>

                        <div className="flex items-center gap-3 md:flex-col md:items-end md:justify-center">
                          <Skeleton className="h-4 w-12 rounded-none" />
                          <Skeleton className="h-4 w-14 rounded-none" />
                        </div>
                      </div>
                    ))}
                  </section>
                </section>

                <aside className="border-t border-border py-6 xl:border-l xl:border-t-0 xl:pl-5">
                  <div className="sticky top-20 space-y-8">
                    <section className="border-b border-border pb-6">
                      <Skeleton className="h-4 w-24 rounded-none" />
                      <div className="mt-4 space-y-3">
                        <Skeleton className="h-6 w-48 max-w-full rounded-none" />
                        <Skeleton className="h-4 w-full rounded-none" />
                        <Skeleton className="h-4 w-4/5 rounded-none" />
                      </div>
                    </section>

                    <section>
                      <Skeleton className="h-4 w-20 rounded-none" />
                      <div className="mt-4 space-y-4">
                        {Array.from({ length: 3 }).map((_, index) => (
                          <div key={index}>
                            <Skeleton className="h-3 w-12 rounded-none" />
                            <Skeleton className="mt-2 h-4 w-full rounded-none" />
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                </aside>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
