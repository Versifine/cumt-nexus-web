import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { AdminShell } from "@/features/admin/admin-shell";
import { AdminSettingsPage } from "@/features/admin/admin-settings-page";

export const metadata: Metadata = {
  title: "运行开关 | CUMT Nexus",
  description: "管理 CUMT Nexus 注册、发帖和上传开关。",
};

export default function AdminSettingsRoute() {
  return (
    <AppShell contextLabel="运行开关">
      <AdminShell
        allowedRoles={["owner", "admin"]}
        title="运行开关"
        description="控制注册、发帖评论和图片上传。关闭前需要二次确认。"
      >
        <AdminSettingsPage />
      </AdminShell>
    </AppShell>
  );
}
