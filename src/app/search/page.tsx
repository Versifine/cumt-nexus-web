import type { Metadata } from "next";

import { SearchPage } from "@/features/search/search-page";

export const metadata: Metadata = {
  title: "搜索 | CUMT Nexus",
  description: "搜索 CUMT Nexus 中可见的社区和帖子。",
};

export default function SearchRoute() {
  return <SearchPage />;
}
