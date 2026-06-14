import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { GrowthAdminPage } from "@/features/admin/growth-admin-page";

export const metadata: Metadata = {
  title: "成长系统管理 | CUMT Nexus",
  description: "管理 CUMT Nexus 评论效果、头衔授予和积分流水。",
};

export default function GrowthAdminRoute() {
  return (
    <AppShell
      backTarget={{
        href: "/settings/progression",
        label: "返回成长与积分",
      }}
      contextLabel="成长管理"
    >
      <GrowthAdminPage />
    </AppShell>
  );
}
