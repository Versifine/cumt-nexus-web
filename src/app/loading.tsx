import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main
      className="min-h-screen bg-background text-foreground"
      aria-busy="true"
      aria-label="正在加载页面"
    >
      <div className="mx-auto grid min-h-screen w-full max-w-[1440px] grid-cols-1 lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="hidden border-r border-border bg-background px-5 py-5 lg:block">
          <div className="border-b border-border pb-5">
            <div className="inline-flex items-center border border-foreground bg-foreground px-2 py-1 text-xl font-black leading-none tracking-normal text-background">
              CN
            </div>
            <div className="mt-4 text-sm font-semibold">CUMT Nexus</div>
            <div className="mt-1 text-xs text-muted-foreground">校园社区索引</div>
          </div>

          <nav className="mt-6 divide-y divide-border border-y border-border">
            {["最新", "社区", "申请"].map((label, index) => (
              <div key={label} className="flex items-center justify-between py-3">
                <span className="flex items-center gap-3 text-sm">
                  <span className="w-6 font-mono text-xs text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <Skeleton className="size-4 rounded-sm" />
                  <span className="text-muted-foreground">{label}</span>
                </span>
                <Skeleton className="size-1.5 rounded-full" />
              </div>
            ))}
          </nav>

          <div className="mt-6 border border-border bg-background-soft p-3">
            <div className="font-mono text-[11px] uppercase text-muted-foreground">
              当前阶段
            </div>
            <div className="mt-3 space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        </aside>

        <section className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-20 border-b border-border bg-background/90 px-4 py-3 backdrop-blur md:px-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 lg:hidden">
                <span className="border border-foreground bg-foreground px-2 py-1 text-sm font-black leading-none text-background">
                  CN
                </span>
                <span className="text-sm font-semibold">CUMT Nexus</span>
              </div>

              <div className="hidden min-w-0 lg:block">
                <div className="font-mono text-xs uppercase text-muted-foreground">
                  01 / 讨论索引
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Skeleton className="hidden h-8 w-20 rounded-none sm:block" />
                <Skeleton className="h-8 w-16 rounded-none" />
                <Skeleton className="h-8 w-16 rounded-none" />
              </div>
            </div>
          </header>

          <div className="grid flex-1 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px]">
            <section className="min-w-0 px-4 py-6 md:px-6">
              <section className="border-b border-border pb-6">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-3xl">
                    <div className="font-mono text-xs uppercase text-primary">
                      CUMT NEXUS / 加载中
                    </div>
                    <div className="mt-4 space-y-3">
                      <Skeleton className="h-12 w-64 rounded-none md:h-14 md:w-80" />
                      <Skeleton className="h-12 w-56 rounded-none md:h-14 md:w-72" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 border border-border text-center sm:min-w-80">
                    {["帖子", "总分", "状态"].map((label) => (
                      <div
                        key={label}
                        className="border-r border-border px-3 py-4 last:border-r-0"
                      >
                        <div className="font-mono text-[11px] uppercase text-muted-foreground">
                          {label}
                        </div>
                        <Skeleton className="mx-auto mt-2 h-6 w-10 rounded-none" />
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="border-b border-border py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-36 rounded-none" />
                    <Skeleton className="h-4 w-72 max-w-full rounded-none" />
                  </div>
                  <span className="w-fit border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-xs text-primary">
                    LIVE FEED
                  </span>
                </div>
              </section>

              <section className="divide-y divide-border border-b border-border">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="grid gap-4 py-5 md:grid-cols-[72px_minmax(0,1fr)_96px]"
                  >
                    <div className="flex items-center gap-3 md:block">
                      <div className="font-mono text-xs text-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </div>
                      <Skeleton className="mt-0 h-4 w-16 rounded-none md:mt-4" />
                    </div>

                    <div className="min-w-0 space-y-3">
                      <Skeleton className="h-4 w-48 max-w-full rounded-none" />
                      <Skeleton className="h-6 w-3/4 rounded-none" />
                      <Skeleton className="h-4 w-full max-w-2xl rounded-none" />
                    </div>

                    <div className="flex items-center gap-3 md:flex-col md:items-end md:justify-center">
                      <Skeleton className="h-8 w-12 rounded-none" />
                      <Skeleton className="h-4 w-14 rounded-none" />
                    </div>
                  </div>
                ))}
              </section>
            </section>

            <aside className="border-t border-border bg-background-soft/45 px-4 py-6 md:px-6 xl:border-l xl:border-t-0">
              <div className="sticky top-20 space-y-8">
                <section className="border-b border-border pb-6">
                  <div className="font-mono text-xs uppercase text-muted-foreground">
                    右侧上下文
                  </div>
                  <div className="mt-3 space-y-3">
                    <Skeleton className="h-7 w-48 rounded-none" />
                    <Skeleton className="h-4 w-full rounded-none" />
                    <Skeleton className="h-4 w-4/5 rounded-none" />
                  </div>
                </section>

                <section className="border-b border-border pb-6">
                  <div className="mb-3 flex items-center justify-between">
                    <Skeleton className="h-4 w-20 rounded-none" />
                    <Skeleton className="h-4 w-12 rounded-none" />
                  </div>
                  <div className="divide-y divide-border">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="py-3">
                        <Skeleton className="h-3 w-12 rounded-none" />
                        <Skeleton className="mt-2 h-4 w-full rounded-none" />
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
