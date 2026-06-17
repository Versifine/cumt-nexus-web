import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { CommunityOwnerTransferInboxPage } from "@/features/community/community-owner-transfer-inbox-page";

export const metadata: Metadata = {
  title: "待接受版主交接 | CUMT Nexus",
  description: "查看并接受 CUMT Nexus 社区版主交接请求。",
};

export default function CommunityOwnerTransfersRoute() {
  return (
    <AppShell contextLabel="版主交接">
      <CommunityOwnerTransferInboxPage />
    </AppShell>
  );
}
