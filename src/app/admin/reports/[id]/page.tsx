import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { AdminModQueueDetailPage } from "@/features/admin/admin-mod-queue-page";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const metadata: Metadata = {
  title: "队列详情 | CUMT Nexus",
  description: "查看管理队列目标预览、关联举报并执行审核处理。",
};

export default async function AdminReportDetailRoute({ params }: PageProps) {
  const { id } = await params;

  return (
    <AppShell
      backTarget={{
        href: "/admin/reports",
        label: "返回审核队列",
      }}
      contextLabel="队列详情"
    >
      <AdminModQueueDetailPage itemId={id} />
    </AppShell>
  );
}
