import type { Metadata } from "next";

import { HomeFeedPage } from "../home-feed-page";

export const metadata: Metadata = {
  title: "上升信息流 | CUMT Nexus",
  description: "查看 CUMT Nexus 校园社区中正在上升的公开帖子。",
};

export default function RisingFeed() {
  return <HomeFeedPage sort="rising" />;
}
