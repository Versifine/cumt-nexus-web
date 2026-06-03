import type { Metadata } from "next";

import { CommunityApplicationReview } from "@/features/community/community-application-review";

export const metadata: Metadata = {
  title: "社区申请审核 | CUMT Nexus",
  description: "查看并审核 CUMT Nexus 社区申请列表。",
};

export default function CommunityApplicationReviewRoute() {
  return <CommunityApplicationReview />;
}
