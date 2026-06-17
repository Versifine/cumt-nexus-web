import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { ProgressionSettingsPage } from "@/features/profile/progression-settings-page";

export const metadata: Metadata = {
  title: "成长与积分 | CUMT Nexus",
  description: "查看当前账号的积分账户、公开身份和成长资料。",
};

export default function SettingsProgressionRoute() {
  return (
    <AppShell contextLabel="成长与积分">
      <ProgressionSettingsPage />
    </AppShell>
  );
}
