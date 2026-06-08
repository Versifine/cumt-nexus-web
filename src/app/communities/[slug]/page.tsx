import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { getCommunity } from "@/features/community/api";
import { CommunityDetail } from "@/features/community/community-detail";
import type { GetCommunityResponse } from "@/features/community/types";
import { listCommunityPosts } from "@/features/post/api";
import type { ListPostsResponse } from "@/features/post/types";

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
  const initialCommunityData = await getInitialCommunity(slug);
  const initialPostsData = initialCommunityData
    ? await getInitialCommunityPosts(slug)
    : undefined;

  return (
    <AppShell contextLabel={`/${slug}`}>
      <CommunityDetail
        initialCommunityData={initialCommunityData}
        initialPostsData={initialPostsData}
        slug={slug}
      />
    </AppShell>
  );
}

async function getInitialCommunity(
  slug: string,
): Promise<GetCommunityResponse | undefined> {
  try {
    return await getCommunity(slug, {
      cache: "no-store",
      token: null,
    });
  } catch {
    return undefined;
  }
}

async function getInitialCommunityPosts(
  slug: string,
): Promise<ListPostsResponse | undefined> {
  try {
    return await listCommunityPosts({
      slug,
      limit: 20,
      offset: 0,
      sort: "new",
      cache: "no-store",
      token: null,
    });
  } catch {
    return undefined;
  }
}
