import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { AdminShell } from "@/features/admin/admin-shell";
import { ModerationReportDetail } from "@/features/moderation/moderation-console";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const metadata: Metadata = {
  title: "举报详情 | CUMT Nexus",
  description: "查看举报详情、目标预览并执行审核处理。",
};

export default async function AdminReportDetailRoute({ params }: PageProps) {
  const { id } = await params;

  return (
    <AppShell
      backTarget={{
        href: "/admin/reports",
        label: "返回举报审核",
      }}
      contextLabel="举报详情"
    >
      <AdminShell
        title="举报详情"
        description="查看举报理由、目标预览和处理动作。"
      >
        <ModerationReportDetail id={id} />
      </AdminShell>
    </AppShell>
  );
}

