import type { Metadata } from "next";

import { HomeFeedPage } from "../home-feed-page";

export const metadata: Metadata = {
  title: "最新信息流 | CUMT Nexus",
  description: "按最新发布时间查看 CUMT Nexus 校园社区公开帖子。",
};

export default async function NewFeed() {
  return <HomeFeedPage contextLabel="最新" sort="new" />;
}
