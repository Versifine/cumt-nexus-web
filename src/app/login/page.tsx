import Link from "next/link";

import { LoginForm } from "@/features/auth/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-card text-sm font-semibold text-primary">
            CN
          </div>
          <div>
            <div className="text-sm font-semibold">CUMT Nexus</div>
            <div className="text-xs text-muted-foreground">校园社区</div>
          </div>
        </Link>

        <section className="rounded-xl border border-border bg-card p-5">
          <div className="mb-5">
            <h1 className="text-xl font-semibold tracking-normal">登录</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              使用你的 CUMT Nexus 用户名和密码。
            </p>
          </div>

          <LoginForm />

          <p className="mt-5 text-center text-sm text-muted-foreground">
            还没有账号？{" "}
            <Link href="/register" className="text-primary hover:underline">
              立即注册
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
