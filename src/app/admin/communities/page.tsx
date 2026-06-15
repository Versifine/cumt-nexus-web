import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { AdminShell } from "@/features/admin/admin-shell";
import { AdminCommunitiesPage } from "@/features/admin/admin-communities-page";

export const metadata: Metadata = {
  title: "平台社区治理 | CUMT Nexus",
  description: "管理 CUMT Nexus 社区状态和平台治理入口。",
};

export default function AdminCommunitiesRoute() {
  return (
    <AppShell contextLabel="平台社区治理">
      <AdminShell
        allowedRoles={["owner", "admin"]}
        title="平台社区治理"
        description="暂停、恢复、归档社区，并在异常场景接管社区版主；日常社区管理员管理在社区内管理完成。"
      >
        <AdminCommunitiesPage />
      </AdminShell>
    </AppShell>
  );
}
