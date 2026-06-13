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
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between border-b border-border pb-5">
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
          <TextAction
            href={registerHref}
            tone="primary"
            className="hidden sm:inline-flex"
          >
            创建账号
          </TextAction>
        </header>

        <div className="grid flex-1 items-center py-8 lg:py-12">
          <section className="min-w-0">
            <p className="font-mono text-xs text-primary">登录入口 / 01</p>
            <h1 className="mt-3 max-w-2xl text-2xl font-semibold leading-8 tracking-normal sm:text-3xl">
              登录 CUMT Nexus
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
              使用用户名和密码进入社区。登录成功后会回到原页面或进入首页。
            </p>
          </section>

          <section
            aria-labelledby="login-title"
            className="mt-8 border-t border-border"
          >
            <div className="border-b border-border px-5 py-5">
              <p className="font-mono text-xs text-primary">账号验证</p>
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
              <TextAction href={registerHref} tone="primary" variant="bar">
                创建账号
              </TextAction>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
