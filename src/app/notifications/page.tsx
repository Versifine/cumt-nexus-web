import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { NotificationCenter } from "@/features/notification/notification-center";

export const metadata: Metadata = {
  title: "消息 | CUMT Nexus",
  description: "查看 CUMT Nexus 的互动消息和系统通知。",
};

export default function NotificationsRoute() {
  return (
    <AppShell contextLabel="消息">
      <NotificationCenter />
    </AppShell>
  );
}
