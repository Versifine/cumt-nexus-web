import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { AdminDashboard } from "@/features/admin/admin-dashboard";
import { AdminShell } from "@/features/admin/admin-shell";

export const metadata: Metadata = {
  title: "平台管理 | CUMT Nexus",
  description: "CUMT Nexus 平台管理总览。",
};

export default function AdminRoute() {
  return (
    <AppShell contextLabel="平台管理">
      <AdminShell
        title="平台管理"
        description="集中处理举报、社区审批、用户和社区治理、运行开关和审计。"
      >
        <AdminDashboard />
      </AdminShell>
    </AppShell>
  );
}

