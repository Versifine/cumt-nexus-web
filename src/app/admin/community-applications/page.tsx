import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { AdminShell } from "@/features/admin/admin-shell";
import { CommunityApplicationReview } from "@/features/community/community-application-review";

export const metadata: Metadata = {
  title: "社区审批 | CUMT Nexus",
  description: "查看并审核 CUMT Nexus 社区申请列表。",
};

export default function AdminCommunityApplicationsRoute() {
  return (
    <AppShell
      backTarget={{
        href: "/admin",
        label: "返回平台管理",
      }}
      contextLabel="社区审批"
    >
      <AdminShell
        title="社区审批"
        description="审核社区申请，通过后创建社区并设置唯一社区版主。"
      >
        <CommunityApplicationReview />
      </AdminShell>
    </AppShell>
  );
}
