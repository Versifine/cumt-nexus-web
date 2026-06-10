import type { ReactNode } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { TextAction } from "@/components/ui/text-action";

type StatusPageProps = {
  actions?: ReactNode;
  code: string;
  description: string;
  eyebrow: string;
  rows: Array<[string, string]>;
  title: string;
};

export function StatusPage({
  actions,
  code,
  description,
  eyebrow,
  rows,
  title,
}: StatusPageProps) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between border-b border-border pb-5">
          <Link
            href="/"
            className="group flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span className="flex size-9 items-center justify-center border border-border bg-card text-sm font-semibold text-primary transition-colors group-hover:border-primary/50">
              CN
            </span>
            <span>
              <span className="block text-sm font-semibold">CUMT Nexus</span>
              <span className="block text-xs text-muted-foreground">
                校园社区
              </span>
            </span>
          </Link>
          <span className="hidden border-y border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary sm:inline-flex">
            {code}
          </span>
        </header>

        <section className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:py-12">
          <div className="min-w-0">
            <div className="inline-flex border-y border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
              {eyebrow}
            </div>
            <h1 className="mt-6 max-w-3xl text-2xl font-semibold leading-8 tracking-normal sm:text-3xl">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
              {description}
            </p>

            <div className="mt-8 grid border-y border-border sm:grid-cols-3">
              {rows.map(([label, value]) => (
                <div
                  key={label}
                  className="border-b border-border px-4 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
                >
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="mt-2 text-sm font-semibold text-foreground">
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="border-y border-border bg-card/70">
            <div className="border-b border-border px-5 py-5">
              <p className="text-xs font-semibold text-primary">下一步</p>
              <h2 className="mt-2 text-xl font-semibold tracking-normal">
                回到可用入口
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                先返回稳定页面，再继续浏览社区内容或重新执行刚才的操作。
              </p>
            </div>
            <div className="border-b border-border px-5 py-4">
              {actions ?? (
                <div className="border-y border-border">
                  <TextAction href="/" tone="primary" variant="bar">
                    返回最新讨论
                  </TextAction>
                  <TextAction href="/communities" variant="bar">
                    浏览社区索引
                  </TextAction>
                </div>
              )}
            </div>
            <div className="px-5 py-4 text-xs leading-6 text-muted-foreground">
              如果这个状态反复出现，说明当前入口或数据状态需要进一步检查。
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

export function RetryAction({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="border-y border-border">
      <div className="border-b border-border py-4">
        <Button type="button" onClick={onRetry}>
          重试
        </Button>
      </div>
      <TextAction href="/" tone="primary" variant="bar">
        返回最新讨论
      </TextAction>
      <TextAction href="/communities" variant="bar">
        浏览社区索引
      </TextAction>
    </div>
  );
}
