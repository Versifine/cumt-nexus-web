import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { OwnerTransferAcceptPage } from "@/features/admin/admin-owner-transfer-page";

export const metadata: Metadata = {
  title: "接受负责人交接 | CUMT Nexus",
  description: "接受 CUMT Nexus 站点负责人交接。",
};

export default function OwnerTransferAcceptRoute() {
  return (
    <AppShell
      backTarget={{
        href: "/",
        label: "返回首页",
      }}
      contextLabel="负责人交接"
    >
      <OwnerTransferAcceptPage />
    </AppShell>
  );
}
