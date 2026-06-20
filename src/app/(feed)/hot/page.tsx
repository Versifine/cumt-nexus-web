import type { Metadata } from "next";

import { HomeFeedPage } from "../home-feed-page";

export const metadata: Metadata = {
  title: "热门信息流 | CUMT Nexus",
  description: "按热度查看 CUMT Nexus 校园社区公开帖子。",
};

export default function HotFeed() {
  return <HomeFeedPage sort="hot" />;
}
