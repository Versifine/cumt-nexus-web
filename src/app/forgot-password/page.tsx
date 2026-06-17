import type { Metadata } from "next";

import { ForgotPasswordPage } from "@/features/auth/forgot-password-page";

export const metadata: Metadata = {
  title: "找回密码 | CUMT Nexus",
  description: "通过已验证的矿大邮箱找回 CUMT Nexus 登录密码。",
};

export default function ForgotPasswordRoute() {
  return <ForgotPasswordPage />;
}
