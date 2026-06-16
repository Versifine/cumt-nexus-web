import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { MessagePrivacySettingsPage } from "@/features/message/message-privacy-settings-page";

export const metadata: Metadata = {
  title: "隐私与私信 | CUMT Nexus",
  description: "查看 CUMT Nexus 私信隐私设置的待接入边界。",
};

export default function SettingsPrivacyRoute() {
  return (
    <AppShell contextLabel="隐私与私信">
      <MessagePrivacySettingsPage />
    </AppShell>
  );
}
