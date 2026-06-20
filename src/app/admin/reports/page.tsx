import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { AdminModQueuePage } from "@/features/admin/admin-mod-queue-page";

export const metadata: Metadata = {
  title: "全站队列 | CUMT Nexus",
  description: "查看 CUMT Nexus 全站举报、垃圾、已移除、已编辑和待审核队列。",
};

export default function AdminReportsRoute() {
  return (
    <AppShell
      backTarget={{
        href: "/admin",
        label: "返回平台管理",
      }}
      contextLabel="全站队列"
    >
      <AdminModQueuePage />
    </AppShell>
  );
}
