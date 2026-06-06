import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { listPostComments } from "@/features/comment/api";
import type { ListCommentsResponse } from "@/features/comment/types";
import { getPost } from "@/features/post/api";
import { PostDetail } from "@/features/post/post-detail";
import type { GetPostResponse } from "@/features/post/types";

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
  const initialPostData = await getInitialPost(id);
  const initialCommentsData = initialPostData
    ? await getInitialPostComments(id)
    : undefined;

  return (
    <AppShell contextLabel={`06 / 帖子 ${shortId}`}>
      <PostDetail
        id={id}
        initialCommentsData={initialCommentsData}
        initialPostData={initialPostData}
      />
    </AppShell>
  );
}

async function getInitialPost(id: string): Promise<GetPostResponse | undefined> {
  try {
    return await getPost(id, {
      cache: "no-store",
      token: null,
    });
  } catch {
    return undefined;
  }
}

async function getInitialPostComments(
  id: string,
): Promise<ListCommentsResponse | undefined> {
  try {
    return await listPostComments({
      postId: id,
      limit: 20,
      offset: 0,
      view: "tree",
      sort: "new",
      maxDepth: 6,
      cache: "no-store",
      token: null,
    });
  } catch {
    return undefined;
  }
}
