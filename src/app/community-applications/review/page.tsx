import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { CommunityApplicationReview } from "@/features/community/community-application-review";

export const metadata: Metadata = {
  title: "社区申请审核 | CUMT Nexus",
  description: "查看并审核 CUMT Nexus 社区申请列表。",
};

export default function CommunityApplicationReviewRoute() {
  return (
    <AppShell contextLabel="11 / 社区审批">
      <CommunityApplicationReview />
    </AppShell>
  );
}
