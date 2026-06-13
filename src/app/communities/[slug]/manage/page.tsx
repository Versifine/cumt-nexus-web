import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { CommunityManagePage } from "@/features/community/community-manage-page";

type CommunityManageRouteProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: CommunityManageRouteProps): Promise<Metadata> {
  const { slug } = await params;

  return {
    title: `/${slug} 管理 | CUMT Nexus`,
    description: `查看 /${slug} 社区的管理概览、内容状态和待处理举报。`,
  };
}

export default async function CommunityManageRoute({
  params,
}: CommunityManageRouteProps) {
  const { slug } = await params;

  return (
    <AppShell
      backTarget={{
        href: `/communities/${encodeURIComponent(slug)}`,
        label: "返回社区",
      }}
      contextLabel={`/${slug} 管理`}
    >
      <CommunityManagePage slug={slug} />
    </AppShell>
  );
}
