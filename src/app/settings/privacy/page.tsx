import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { MessagePrivacySettingsPage } from "@/features/message/message-privacy-settings-page";

export const metadata: Metadata = {
  title: "隐私与私信 | CUMT Nexus",
  description: "维护 CUMT Nexus 的私信权限和在线状态设置。",
};

export default function SettingsPrivacyRoute() {
  return (
    <AppShell contextLabel="隐私与私信">
      <MessagePrivacySettingsPage />
    </AppShell>
  );
}
