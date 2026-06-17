import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { SearchPage } from "@/features/search/search-page";

export const metadata: Metadata = {
  title: "搜索 | CUMT Nexus",
  description: "搜索 CUMT Nexus 中可见的社区和帖子。",
};

export default function SearchRoute() {
  return (
    <AppShell
      backTarget={{
        href: "/",
        label: "返回信息流",
      }}
      contextLabel="搜索"
    >
      <SearchPage />
    </AppShell>
  );
}
