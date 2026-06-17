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
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between rounded-lg bg-surface px-4 py-3">
          <Link
            href="/"
            className="group flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span className="flex size-9 items-center justify-center rounded-md bg-surface-raised text-sm font-semibold text-primary transition-colors group-hover:bg-surface-hover">
              CN
            </span>
            <span>
              <span className="block text-sm font-semibold">CUMT Nexus</span>
              <span className="block text-xs text-muted-foreground">
                校园社区
              </span>
            </span>
          </Link>
          <span className="hidden font-mono text-xs text-primary sm:inline-flex">
            {code}
          </span>
        </header>

        <section className="grid flex-1 items-center py-8 lg:py-12">
          <div className="min-w-0">
            <div className="font-mono text-xs text-primary">
              {eyebrow}
            </div>
            <h1 className="mt-3 max-w-3xl text-2xl font-semibold leading-8 tracking-normal sm:text-3xl">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
              {description}
            </p>

            <div className="mt-8 grid gap-2 sm:grid-cols-3">
              {rows.map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-md bg-surface-raised px-4 py-4"
                >
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="mt-2 text-sm font-semibold text-foreground">
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="mt-8 rounded-lg bg-surface p-4">
            <div>
              <p className="text-xs font-semibold text-primary">下一步</p>
              <h2 className="mt-2 text-xl font-semibold tracking-normal">
                回到可用入口
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                先打开稳定页面，再继续浏览社区内容或重新执行刚才的操作。
              </p>
            </div>
            <div className="py-4">
              {actions ?? (
                <div>
                  <TextAction href="/" tone="primary" variant="bar">
                    最新讨论
                  </TextAction>
                  <TextAction href="/communities" variant="bar">
                    浏览社区索引
                  </TextAction>
                </div>
              )}
            </div>
            <div className="rounded-md bg-surface-raised px-3 py-3 text-xs leading-6 text-muted-foreground">
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
    <div>
      <div className="py-4">
        <Button type="button" onClick={onRetry}>
          重试
        </Button>
      </div>
      <TextAction href="/" tone="primary" variant="bar">
        最新讨论
      </TextAction>
      <TextAction href="/communities" variant="bar">
        浏览社区索引
      </TextAction>
    </div>
  );
}
