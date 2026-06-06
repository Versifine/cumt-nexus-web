import type { Metadata } from "next";

import { HomeFeedPage } from "./home-feed-page";

export const metadata: Metadata = {
  title: "最新讨论 | CUMT Nexus",
  description: "查看 CUMT Nexus 校园社区中的最新帖子、社区入口和讨论上下文。",
};

export default async function Home() {
  return <HomeFeedPage contextLabel="01 / 首页" sort="new" />;
}
