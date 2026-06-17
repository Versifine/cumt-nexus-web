import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { collectComponentInventory } from "@/features/style-guide/component-inventory.server";
import { StyleGuidePage } from "@/features/style-guide/style-guide-page";

export const metadata: Metadata = {
  title: "组件台账",
  description: "集中展示 CUMT Nexus 的全量组件索引、基础组件示例和视觉修复备注。",
};

export const dynamic = "force-dynamic";

export default function StyleGuideRoute() {
  const inventory = collectComponentInventory();

  return (
    <AppShell className="md:max-w-[1240px]" contextLabel="组件台账">
      <StyleGuidePage inventory={inventory} />
    </AppShell>
  );
}
