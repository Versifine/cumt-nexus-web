import { CommunityDetail } from "@/features/community/community-detail";

type CommunityDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function CommunityDetailPage({
  params,
}: CommunityDetailPageProps) {
  const { slug } = await params;

  return <CommunityDetail slug={slug} />;
}
