import type { Metadata } from "next";

import { AuthPageShell } from "@/features/auth/auth-page-shell";
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
    <AuthPageShell
      action={
        <TextAction href={loginHref} tone="primary">
          去登录
        </TextAction>
      }
      description="通过矿大邮箱验证码创建账号，注册后先完善公开资料，再进入社区参与讨论。"
      eyebrow="注册入口"
      footer={
        <TextAction href={loginHref} tone="primary" variant="bar">
          已有账号，去登录
        </TextAction>
      }
      title="创建账号"
    >
      <RegisterForm />
    </AuthPageShell>
  );
}
