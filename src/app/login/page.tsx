import type { Metadata } from "next";
import Link from "next/link";

import { TextAction } from "@/components/ui/text-action";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = {
  title: "登录",
  description: "登录 CUMT Nexus，继续浏览社区、发布帖子、评论和投票。",
};

export default function LoginPage() {
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
          <TextAction href="/register" tone="primary" className="hidden sm:inline-flex">
            创建账号
          </TextAction>
        </header>

        <div className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:py-12">
          <section className="min-w-0">
            <div className="inline-flex border-y border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
              登录入口 / 01
            </div>
            <h1 className="mt-6 max-w-2xl text-3xl font-semibold leading-tight tracking-normal sm:text-4xl">
              回到校园社区工作区
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
              登录后继续查看社区动态、发布帖子、参与投票和评论。这里是产品入口，不做营销海报，只保留必要的身份验证流程。
            </p>

            <div className="mt-8 hidden border-y border-border sm:grid sm:grid-cols-3">
              <MetricBlock label="身份方式" value="用户名" />
              <MetricBlock label="会话状态" value="本地令牌" />
              <MetricBlock label="成功后" value="进入首页" />
            </div>

            <div className="mt-8 hidden max-w-xl border-y border-border sm:block">
              <InfoRow index="01" title="社区索引" text="浏览已开放的校园社区。" />
              <InfoRow index="02" title="发帖讨论" text="在具体社区内发布新的讨论。" />
              <InfoRow
                index="03"
                title="持续会话"
                text="登录态由统一的 auth session 管理。"
              />
            </div>
          </section>

          <section
            aria-labelledby="login-title"
            className="border-y border-border bg-card/70"
          >
            <div className="border-b border-border px-5 py-5">
              <p className="text-xs font-semibold text-primary">账号验证</p>
              <h2
                id="login-title"
                className="mt-2 text-xl font-semibold tracking-normal"
              >
                登录
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                使用用户名和密码进入 CUMT Nexus。
              </p>
            </div>
            <div className="px-5">
              <LoginForm />
            </div>
            <div className="border-t border-border px-5 py-4">
              <p className="mb-3 text-sm text-muted-foreground">
                还没有账号？
              </p>
              <TextAction href="/register" tone="primary" variant="bar">
                创建账号
              </TextAction>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function MetricBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border px-4 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function InfoRow({
  index,
  text,
  title,
}: {
  index: string;
  text: string;
  title: string;
}) {
  return (
    <div className="grid gap-3 border-b border-border py-4 last:border-b-0 sm:grid-cols-[56px_minmax(0,1fr)]">
      <div className="font-mono text-xs text-primary">{index}</div>
      <div>
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
