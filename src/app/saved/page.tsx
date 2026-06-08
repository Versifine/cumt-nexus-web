import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { SavedPostsPage } from "@/features/post/saved-posts-page";

export const metadata: Metadata = {
  title: "我的收藏 | CUMT Nexus",
  description: "查看你在 CUMT Nexus 保存过的公开帖子。",
};

export default function SavedRoute() {
  return (
    <AppShell contextLabel="我的收藏">
      <SavedPostsPage />
    </AppShell>
  );
}
