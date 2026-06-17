import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { AdminShell } from "@/features/admin/admin-shell";
import { AdminOwnerTransferPage } from "@/features/admin/admin-owner-transfer-page";

export const metadata: Metadata = {
  title: "负责人交接 | CUMT Nexus",
  description: "管理 CUMT Nexus 站点负责人交接流程。",
};

export default function AdminOwnerTransferRoute() {
  return (
    <AppShell
      backTarget={{
        href: "/admin",
        label: "返回平台管理",
      }}
      contextLabel="负责人交接"
    >
      <AdminShell
        allowedRoles={["owner", "admin"]}
        title="负责人交接"
        description="站点负责人交接使用独立双确认流程；被盗号或无法恢复账号时只走服务器离线 recovery。"
      >
        <AdminOwnerTransferPage />
      </AdminShell>
    </AppShell>
  );
}
