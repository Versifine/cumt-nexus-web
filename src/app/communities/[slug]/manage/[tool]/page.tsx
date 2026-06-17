import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell/app-shell";
import {
  CommunityManagePage,
  type CommunityManageTool,
} from "@/features/community/community-manage-page";

type CommunityManageToolRouteProps = {
  params: Promise<{
    slug: string;
    tool: string;
  }>;
};

const communityManageToolLabels = {
  automations: "自动化",
  content: "内容",
  insights: "数据摘要",
  log: "Mod Log",
  modmail: "Modmail",
  overview: "总览",
  queues: "队列",
  rules: "规则与原因",
  settings: "设置",
  users: "用户",
} satisfies Record<CommunityManageTool, string>;

const communityManageTools = Object.keys(
  communityManageToolLabels,
) as CommunityManageTool[];

export async function generateMetadata({
  params,
}: CommunityManageToolRouteProps): Promise<Metadata> {
  const { slug, tool } = await params;

  if (!isCommunityManageTool(tool) || tool === "overview") {
    return {
      title: `/${slug} 管理 | CUMT Nexus`,
      description: `查看 /${slug} 社区的管理工作区。`,
    };
  }

  return {
    title: `/${slug} ${communityManageToolLabels[tool]}管理 | CUMT Nexus`,
    description: `查看 /${slug} 社区的${communityManageToolLabels[tool]}管理工作区。`,
  };
}

export default async function CommunityManageToolRoute({
  params,
}: CommunityManageToolRouteProps) {
  const { slug, tool } = await params;

  if (!isCommunityManageTool(tool) || tool === "overview") {
    notFound();
  }

  return (
    <AppShell
      backTarget={{
        href: `/communities/${encodeURIComponent(slug)}`,
        label: "返回社区",
      }}
      contextLabel={`/${slug} 管理 / ${communityManageToolLabels[tool]}`}
    >
      <CommunityManagePage slug={slug} tool={tool} />
    </AppShell>
  );
}

function isCommunityManageTool(value: string): value is CommunityManageTool {
  return communityManageTools.includes(value as CommunityManageTool);
}
