import type { Metadata } from "next";

import { CommunityList } from "@/features/community/community-list";

export const metadata: Metadata = {
  title: "社区索引",
  description: "浏览 CUMT Nexus 已开放的校园社区，并进入对应讨论场域。",
};

export default function CommunitiesPage() {
  return <CommunityList />;
}
