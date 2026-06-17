import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { listPostComments } from "@/features/comment/api";
import { resolveCommentSort } from "@/features/comment/sort";
import type {
  CommentSort,
  ListCommentsResponse,
} from "@/features/comment/types";
import { getPost } from "@/features/post/api";
import { PostDetail } from "@/features/post/post-detail";
import type { GetPostResponse } from "@/features/post/types";
import { SERVER_PREFETCH_API_TIMEOUT_MS } from "@/lib/api/client";

type PostDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
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

export default async function PostDetailPage({
  params,
  searchParams,
}: PostDetailPageProps) {
  const { id } = await params;
  const shortId = id.slice(0, 8).replace(/-+$/, "");
  const commentSort = await getCommentSortFromSearchParams(searchParams);
  const initialPostData = await getInitialPost(id);
  const initialCommentsData = initialPostData
    ? await getInitialPostComments(id, commentSort)
    : undefined;

  return (
    <AppShell contextLabel={`帖子 ${shortId}`}>
      <PostDetail
        id={id}
        initialCommentSort={commentSort}
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
      timeoutMs: SERVER_PREFETCH_API_TIMEOUT_MS,
      token: null,
    });
  } catch {
    return undefined;
  }
}

async function getInitialPostComments(
  id: string,
  sort: CommentSort,
): Promise<ListCommentsResponse | undefined> {
  try {
    return await listPostComments({
      postId: id,
      limit: 20,
      offset: 0,
      view: "tree",
      sort,
      maxDepth: 6,
      cache: "no-store",
      timeoutMs: SERVER_PREFETCH_API_TIMEOUT_MS,
      token: null,
    });
  } catch {
    return undefined;
  }
}

async function getCommentSortFromSearchParams(
  searchParams?: Promise<Record<string, string | string[] | undefined>>,
) {
  const params = searchParams ? await searchParams : {};
  const sort = getSingleSearchParam(params.sort);
  const legacyCommentSort = getSingleSearchParam(params.comment_sort);

  return resolveCommentSort(sort ?? legacyCommentSort);
}

function getSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
