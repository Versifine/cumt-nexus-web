import type { Metadata } from "next";

import { HomeFeedPage } from "../home-feed-page";

export const metadata: Metadata = {
  title: "最高信息流 | CUMT Nexus",
  description: "按最高分查看 CUMT Nexus 校园社区公开帖子。",
};

export default async function TopFeed() {
  return <HomeFeedPage contextLabel="最高" sort="top" />;
}
