import type { Metadata } from "next";

import { ModerationConsole } from "@/features/moderation/moderation-console";

export const metadata: Metadata = {
  title: "审核台 | CUMT Nexus",
  description: "查看 CUMT Nexus 举报列表、目标预览和审核处理入口。",
};

export default function ModerationRoute() {
  return <ModerationConsole />;
}
