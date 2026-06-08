import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { NotificationCenter } from "@/features/notification/notification-center";

export const metadata: Metadata = {
  title: "通知 | CUMT Nexus",
  description: "查看 CUMT Nexus 的账号通知、未读状态并标记已读。",
};

export default function NotificationsRoute() {
  return (
    <AppShell contextLabel="通知">
      <NotificationCenter />
    </AppShell>
  );
}
