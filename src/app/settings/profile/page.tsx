import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { ProfileSettingsPage } from "@/features/profile/profile-settings-page";

export const metadata: Metadata = {
  title: "编辑主页 | CUMT Nexus",
  description: "查看和维护当前账号的公开个人主页资料。",
};

export default function SettingsProfileRoute() {
  return (
    <AppShell contextLabel="编辑主页">
      <ProfileSettingsPage />
    </AppShell>
  );
}
