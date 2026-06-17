import type { Metadata } from "next";

import { AuthPageShell } from "@/features/auth/auth-page-shell";
import { LoginForm } from "@/features/auth/login-form";
import { getSafeAuthSwitchHref } from "@/features/auth/redirect";
import { TextAction } from "@/components/ui/text-action";

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
    <AuthPageShell
      action={
        <TextAction href={registerHref} tone="primary">
          创建账号
        </TextAction>
      }
      description="进入 CUMT Nexus，继续发布、评论和管理个人内容。"
      eyebrow="登录入口"
      footer={
        <TextAction href={registerHref} tone="primary" variant="bar">
          没有账号，去注册
        </TextAction>
      }
      title="登录"
    >
      <LoginForm />
    </AuthPageShell>
  );
}
