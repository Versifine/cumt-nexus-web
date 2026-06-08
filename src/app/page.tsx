import type { Metadata } from "next";

import { HomeFeedPage } from "./home-feed-page";

export const metadata: Metadata = {
  title: "推荐讨论 | CUMT Nexus",
  description: "查看 CUMT Nexus 校园社区中的推荐帖子、社区入口和讨论上下文。",
};

export default async function Home() {
  return <HomeFeedPage contextLabel="首页" sort="best" />;
}
