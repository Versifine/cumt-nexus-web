import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { CommunityDetail } from "@/features/community/community-detail";

type CommunityDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: CommunityDetailPageProps): Promise<Metadata> {
  const { slug } = await params;

  return {
    title: `/${slug}`,
    description: `浏览 /${slug} 社区的帖子、分数和讨论上下文。`,
  };
}

export default async function CommunityDetailPage({
  params,
}: CommunityDetailPageProps) {
  const { slug } = await params;

  return (
    <AppShell contextLabel={`05 / /${slug}`}>
      <CommunityDetail slug={slug} />
    </AppShell>
  );
}
