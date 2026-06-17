import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { OwnerTransferAcceptPage } from "@/features/admin/admin-owner-transfer-page";

export const metadata: Metadata = {
  title: "接受负责人交接 | CUMT Nexus",
  description: "接受 CUMT Nexus 站点负责人交接。",
};

type OwnerTransferRouteProps = {
  params: Promise<{
    transferId: string;
  }>;
};

export default async function OwnerTransferRoute({
  params,
}: OwnerTransferRouteProps) {
  const { transferId } = await params;

  return (
    <AppShell
      backTarget={{
        href: "/",
        label: "返回首页",
      }}
      contextLabel="负责人交接"
    >
      <OwnerTransferAcceptPage transferId={transferId} />
    </AppShell>
  );
}
