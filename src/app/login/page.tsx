import type { Metadata } from "next";
import Link from "next/link";

import { TextAction } from "@/components/ui/text-action";
import { LoginForm } from "@/features/auth/login-form";
import { getSafeAuthSwitchHref } from "@/features/auth/redirect";

export const metadata: Metadata = {
  title: "登录",
  description: "登录 CUMT Nexus，继续浏览社区、发布帖子、评论和投票。",
};

type LoginPageProps = {
  searchParams?: Promise<{
    next?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const registerHref = getSafeAuthSwitchHref("/register", params?.next);

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
          <TextAction href={registerHref} tone="primary">
            创建账号
          </TextAction>
        </header>

        <div className="grid flex-1 items-center py-8">
          <section className="min-w-0">
            <p className="font-mono text-xs text-primary">登录入口</p>
            <h1 className="mt-3 text-2xl font-semibold leading-8 tracking-normal">
              登录
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              进入 CUMT Nexus，继续发布、评论和管理个人内容。
            </p>

            <div className="mt-6 border-t border-border">
              <LoginForm />
            </div>
            <div className="border-t border-border py-4">
              <TextAction href={registerHref} tone="primary" variant="bar">
                没有账号，去注册
              </TextAction>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
