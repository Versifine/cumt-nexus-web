import type { Metadata } from "next";
import Link from "next/link";

import { TextAction } from "@/components/ui/text-action";
import { getSafeAuthSwitchHref } from "@/features/auth/redirect";
import { RegisterForm } from "@/features/auth/register-form";

export const metadata: Metadata = {
  title: "注册账号",
  description: "创建 CUMT Nexus 账号，进入校园社区讨论工作区。",
};

type RegisterPageProps = {
  searchParams?: Promise<{
    next?: string | string[];
  }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const loginHref = getSafeAuthSwitchHref("/login", params?.next);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-6 sm:px-6">
        <header className="flex items-center justify-between border-b border-border pb-4">
          <Link
            href="/"
            className="group flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span className="flex size-9 items-center justify-center border border-border text-sm font-semibold text-primary transition-colors group-hover:border-primary/50">
              CN
            </span>
            <span>
              <span className="block text-sm font-semibold">CUMT Nexus</span>
              <span className="block text-xs text-muted-foreground">
                校园社区
              </span>
            </span>
          </Link>
          <TextAction href={loginHref} tone="primary">
            去登录
          </TextAction>
        </header>

        <div className="grid flex-1 items-center py-8">
          <section className="min-w-0">
            <p className="font-mono text-xs text-primary">注册入口</p>
            <h1 className="mt-3 text-2xl font-semibold leading-8 tracking-normal">
              创建账号
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              注册后先完善公开资料，再进入社区参与讨论。
            </p>

            <div className="mt-6 border-t border-border">
              <RegisterForm />
            </div>
            <div className="border-t border-border py-4">
              <TextAction href={loginHref} tone="primary" variant="bar">
                已有账号，去登录
              </TextAction>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
