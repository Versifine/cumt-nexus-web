import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { PostCreatePage } from "@/features/post/post-create-page";

type NewPostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: NewPostPageProps): Promise<Metadata> {
  const { slug } = await params;

  return {
    title: `在 /${slug} 发起讨论`,
    description: `在 /${slug} 社区发布新的帖子，补充标题和正文后提交。`,
  };
}

export default async function NewPostPage({ params }: NewPostPageProps) {
  const { slug } = await params;

  return (
    <AppShell
      backTarget={{
        href: `/communities/${encodeURIComponent(slug)}`,
        label: `返回 /${slug}`,
      }}
      contextLabel={`发布 /${slug}`}
    >
      <PostCreatePage
        key={slug}
        authNextPath={`/communities/${encodeURIComponent(slug)}/new`}
        defaultCommunitySlug={slug}
      />
    </AppShell>
  );
}
