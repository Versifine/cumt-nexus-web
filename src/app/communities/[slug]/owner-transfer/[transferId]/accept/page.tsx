import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { CommunityOwnerTransferAcceptPage } from "@/features/community/community-owner-transfer-accept-page";

type CommunityOwnerTransferAcceptRouteProps = {
  params: Promise<{
    slug: string;
    transferId: string;
  }>;
};

export const metadata: Metadata = {
  title: "接受社区版主交接 | CUMT Nexus",
  description: "接受 CUMT Nexus 社区版主交接。",
};

export default async function CommunityOwnerTransferAcceptRoute({
  params,
}: CommunityOwnerTransferAcceptRouteProps) {
  const { slug, transferId } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const decodedTransferId = decodeURIComponent(transferId);

  return (
    <AppShell contextLabel="版主交接">
      <CommunityOwnerTransferAcceptPage
        slug={decodedSlug}
        transferId={decodedTransferId}
      />
    </AppShell>
  );
}
