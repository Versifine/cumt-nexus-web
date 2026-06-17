import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { AdminShell } from "@/features/admin/admin-shell";
import { AdminUsersPage } from "@/features/admin/admin-users-page";

export const metadata: Metadata = {
  title: "用户管理 | CUMT Nexus",
  description: "管理 CUMT Nexus 用户状态和用户治理入口。",
};

export default function AdminUsersRoute() {
  return (
    <AppShell contextLabel="用户管理">
      <AdminShell
        allowedRoles={["owner", "admin"]}
        title="用户管理"
        description="查看用户状态，执行禁用和恢复。只有站点负责人可以调整平台管理员和平台审核员。"
      >
        <AdminUsersPage />
      </AdminShell>
    </AppShell>
  );
}
