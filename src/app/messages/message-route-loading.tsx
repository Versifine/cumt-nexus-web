import Link from "next/link";

import { NexusBrandMark } from "@/components/brand/nexus-brand-mark";
import { LoadingState } from "@/components/feedback/loading-state";
import { TextAction } from "@/components/ui/text-action";

export function MessageRouteLoading() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between rounded-lg bg-surface px-4 py-3">
          <Link
            href="/"
            className="group flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <NexusBrandMark className="size-7 text-primary transition-colors group-hover:text-foreground" />
            <span>
              <span className="block text-sm font-semibold">CUMT Nexus</span>
              <span className="block text-xs text-muted-foreground">校园社区</span>
            </span>
          </Link>
          <TextAction href="/">信息流首页</TextAction>
        </header>

        <section className="grid flex-1 items-center py-8 lg:py-12">
          <div className="mx-auto w-full max-w-xl rounded-lg bg-surface px-4 py-5 sm:px-5">
            <LoadingState rows={6} />
          </div>
        </section>
      </div>
    </main>
  );
}
