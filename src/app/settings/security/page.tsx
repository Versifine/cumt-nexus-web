import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { AccountSecurityPage } from "@/features/auth/account-security-page";

export const metadata: Metadata = {
  title: "账号安全 | CUMT Nexus",
  description: "查看和维护当前账号的邮箱、密码和登录会话安全状态。",
};

export default function SettingsSecurityRoute() {
  return (
    <AppShell contextLabel="账号安全">
      <AccountSecurityPage />
    </AppShell>
  );
}
