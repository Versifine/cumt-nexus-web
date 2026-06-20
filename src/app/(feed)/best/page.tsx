import type { Metadata } from "next";

import { HomeFeedPage } from "../home-feed-page";

export const metadata: Metadata = {
  title: "推荐信息流 | CUMT Nexus",
  description: "按推荐顺序查看 CUMT Nexus 校园社区公开帖子。",
};

export default function BestFeed() {
  return <HomeFeedPage sort="best" />;
}
