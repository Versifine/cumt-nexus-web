import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { AdminShell } from "@/features/admin/admin-shell";
import { GrowthAdminPage } from "@/features/admin/growth-admin-page";

export const metadata: Metadata = {
  title: "成长系统管理 | CUMT Nexus",
  description: "管理 CUMT Nexus 评论效果、头衔授予和积分流水。",
};

export default function GrowthAdminRoute() {
  return (
    <AppShell
      backTarget={{
        href: "/admin",
        label: "返回平台管理",
      }}
      contextLabel="成长管理"
    >
      <AdminShell
        allowedRoles={["owner", "admin"]}
        title="成长系统管理"
        description="管理评论效果、平台头衔、用户头衔授予和积分流水。"
      >
        <GrowthAdminPage />
      </AdminShell>
    </AppShell>
  );
}
