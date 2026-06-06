import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { HomeShell } from "@/components/app-shell/home-shell";
import { listLatestPosts } from "@/features/post/api";
import type { ListPostsResponse } from "@/features/post/types";

export const metadata: Metadata = {
  title: "最新讨论 | CUMT Nexus",
  description: "查看 CUMT Nexus 校园社区中的最新帖子、社区入口和讨论上下文。",
};

export default async function Home() {
  const initialPostsData = await getInitialLatestPosts();

  return (
    <AppShell contextLabel="01 / 首页">
      <HomeShell initialPostsData={initialPostsData} />
    </AppShell>
  );
}

async function getInitialLatestPosts(): Promise<ListPostsResponse | undefined> {
  try {
    return await listLatestPosts(20, 0, "new", {
      cache: "no-store",
      token: null,
    });
  } catch {
    return undefined;
  }
}
