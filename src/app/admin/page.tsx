import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { AdminDashboard } from "@/features/admin/admin-dashboard";

export const metadata: Metadata = {
  title: "平台管理 | CUMT Nexus",
  description: "CUMT Nexus 平台管理总览。",
};

export default function AdminRoute() {
  return (
    <AppShell contextLabel="平台管理">
      <AdminDashboard />
    </AppShell>
  );
}
