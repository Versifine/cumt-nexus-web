import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { MessageUnavailablePage } from "@/features/message/message-unavailable-page";

export const metadata: Metadata = {
  title: "私信 | CUMT Nexus",
  description: "查看 CUMT Nexus 私信系统的待接入边界。",
};

export default function MessagesRoute() {
  return (
    <AppShell contextLabel="私信">
      <MessageUnavailablePage />
    </AppShell>
  );
}
