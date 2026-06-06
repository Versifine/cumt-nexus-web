import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { PostDetail } from "@/features/post/post-detail";

type PostDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({
  params,
}: PostDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const shortId = id.slice(0, 8).replace(/-+$/, "");

  return {
    title: `帖子 ${shortId}`,
    description: "查看帖子正文、投票状态和评论讨论。",
  };
}

export default async function PostDetailPage({ params }: PostDetailPageProps) {
  const { id } = await params;
  const shortId = id.slice(0, 8).replace(/-+$/, "");

  return (
    <AppShell contextLabel={`06 / 帖子 ${shortId}`}>
      <PostDetail id={id} />
    </AppShell>
  );
}
