import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { AdminAuditLogsPage } from "@/features/admin/admin-audit-logs-page";
import { AdminShell } from "@/features/admin/admin-shell";

export const metadata: Metadata = {
  title: "审计日志 | CUMT Nexus",
  description: "查看 CUMT Nexus 平台管理审计日志。",
};

type AdminAuditLogsRouteProps = {
  searchParams?: Promise<{
    q?: string;
    target_id?: string;
    target_type?: string;
  }>;
};

export default async function AdminAuditLogsRoute({
  searchParams,
}: AdminAuditLogsRouteProps) {
  const params = await searchParams;

  return (
    <AppShell contextLabel="审计日志">
      <AdminShell
        allowedRoles={["owner", "admin"]}
        title="审计日志"
        description="查看平台写操作的操作者、目标、变更前后和时间。"
      >
        <AdminAuditLogsPage
          initialQuery={params?.q}
          initialTargetId={params?.target_id}
          initialTargetType={params?.target_type}
        />
      </AdminShell>
    </AppShell>
  );
}
