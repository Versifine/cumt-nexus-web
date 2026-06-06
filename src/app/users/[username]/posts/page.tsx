import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { PublicUserPosts } from "@/features/profile/public-user-posts";

type UserPostsPageProps = {
  params: Promise<{
    username: string;
  }>;
};

export async function generateMetadata({
  params,
}: UserPostsPageProps): Promise<Metadata> {
  const { username } = await params;

  return {
    title: `@${username} 的帖子 | CUMT Nexus`,
    description: `查看 @${username} 在公开社区发布过的帖子。`,
  };
}

export default async function UserPostsPage({ params }: UserPostsPageProps) {
  const { username } = await params;

  return (
    <AppShell contextLabel={`08 / 用户帖子 / @${username}`}>
      <PublicUserPosts username={username} />
    </AppShell>
  );
}
