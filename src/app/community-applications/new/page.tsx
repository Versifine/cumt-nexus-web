import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { TextAction } from "@/components/ui/text-action";
import { CommunityApplicationForm } from "@/features/community/community-application-form";

export default function NewCommunityApplicationPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-[1180px] px-4 py-6 md:px-6">
        <div className="border-b border-border pb-4">
          <Link
            href="/communities"
            className="group inline-flex h-10 items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ArrowLeft
              className="size-4 transition-transform group-hover:-translate-x-1"
              aria-hidden="true"
            />
            返回社区索引
          </Link>
        </div>

        <header className="border-b border-border py-6">
          <div className="font-mono text-xs uppercase text-primary">
            CUMT NEXUS / 社区申请
          </div>
          <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
            <div className="min-w-0">
              <h1 className="text-5xl font-black leading-[0.95] tracking-normal md:text-6xl">
                申请新社区
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
                提交后会进入平台审核。审核通过后，系统会创建社区，并把申请人设为负责人。
              </p>
            </div>

            <div className="grid grid-cols-2 border border-border text-center">
              <MetricBlock label="流程" value="审核制" />
              <MetricBlock label="状态" value="待提交" />
            </div>
          </div>
        </header>

        <section className="grid gap-8 py-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <CommunityApplicationForm />
          </div>

          <aside className="border-t border-border pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <div className="sticky top-6 space-y-8">
              <section className="border-b border-border pb-6">
                <h2 className="text-sm font-semibold">申请前确认</h2>
                <div className="mt-3 divide-y divide-border border-y border-border">
                  {[
                    "社区主题应能长期承载讨论。",
                    "名称要清楚，不使用临时口号。",
                    "申请理由说明谁会使用、为什么需要。",
                  ].map((item, index) => (
                    <div key={item} className="flex gap-3 py-3 text-sm leading-6">
                      <span className="font-mono text-xs text-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="border-b border-border pb-6">
                <h2 className="text-sm font-semibold">审核后</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  通过审核后，社区才会出现在公开列表里。被拒绝时需要根据反馈重新调整申请内容。
                </p>
              </section>

              <section>
                <h2 className="text-sm font-semibold">其他入口</h2>
                <div className="mt-3 border-y border-border">
                  <TextAction href="/communities" variant="bar">
                    浏览社区索引
                  </TextAction>
                  <TextAction href="/" variant="bar">
                    返回最新讨论
                  </TextAction>
                </div>
              </section>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function MetricBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-border px-3 py-4 last:border-r-0">
      <div className="font-mono text-[11px] uppercase text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 truncate text-lg font-black leading-none text-foreground">
        {value}
      </div>
    </div>
  );
}
