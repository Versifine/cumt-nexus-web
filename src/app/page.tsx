import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { HomeShell } from "@/components/app-shell/home-shell";

export const metadata: Metadata = {
  title: "最新讨论 | CUMT Nexus",
  description: "查看 CUMT Nexus 校园社区中的最新帖子、社区入口和讨论上下文。",
};

export default function Home() {
  return (
    <AppShell contextLabel="01 / 首页">
      <HomeShell />
    </AppShell>
  );
}
