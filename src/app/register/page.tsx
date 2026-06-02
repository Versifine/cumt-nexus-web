import Link from "next/link";

import { TextAction } from "@/components/ui/text-action";
import { RegisterForm } from "@/features/auth/register-form";

export default function RegisterPage() {
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
          <TextAction href="/login" tone="primary" className="hidden sm:inline-flex">
            去登录
          </TextAction>
        </header>

        <div className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:py-12">
          <section className="min-w-0">
            <div className="inline-flex border-y border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
              注册入口 / 02
            </div>
            <h1 className="mt-6 max-w-2xl text-3xl font-semibold leading-tight tracking-normal sm:text-4xl">
              创建校园社区账号
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
              先设置稳定的用户名和密码。注册成功后会直接进入首页，后续资料、权限和社区申请能力按后端能力逐步开放。
            </p>

            <div className="mt-8 hidden border-y border-border sm:grid sm:grid-cols-3">
              <MetricBlock label="账号资料" value="用户名" />
              <MetricBlock label="默认权限" value="普通用户" />
              <MetricBlock label="成功后" value="进入首页" />
            </div>

            <div className="mt-8 hidden max-w-xl border-y border-border sm:block">
              <InfoRow
                index="01"
                title="真实产品入口"
                text="只展示当前后端已经支持的注册流程。"
              />
              <InfoRow
                index="02"
                title="统一会话"
                text="注册成功后写入同一套 auth session。"
              />
              <InfoRow
                index="03"
                title="后续能力"
                text="资料完善和社区权限不在本页伪造。"
              />
            </div>
          </section>

          <section
            aria-labelledby="register-title"
            className="border-y border-border bg-card/70"
          >
            <div className="border-b border-border px-5 py-5">
              <p className="text-xs font-semibold text-primary">账号创建</p>
              <h2
                id="register-title"
                className="mt-2 text-xl font-semibold tracking-normal"
              >
                注册账号
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                设置用户名和密码，创建 CUMT Nexus 账号。
              </p>
            </div>
            <div className="px-5">
              <RegisterForm />
            </div>
            <div className="border-t border-border px-5 py-4">
              <p className="mb-3 text-sm text-muted-foreground">
                已经有账号？
              </p>
              <TextAction href="/login" tone="primary" variant="bar">
                去登录
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
