import { PostDetail } from "@/features/post/post-detail";

type PostDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PostDetailPage({ params }: PostDetailPageProps) {
  const { id } = await params;

  return <PostDetail id={id} />;
}
