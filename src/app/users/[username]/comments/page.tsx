import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { PublicUserComments } from "@/features/profile/public-user-comments";

type UserCommentsPageProps = {
  params: Promise<{
    username: string;
  }>;
};

export async function generateMetadata({
  params,
}: UserCommentsPageProps): Promise<Metadata> {
  const { username } = await params;

  return {
    title: `@${username} 的评论 | CUMT Nexus`,
    description: `查看 @${username} 在公开帖子下留下的评论。`,
  };
}

export default async function UserCommentsPage({
  params,
}: UserCommentsPageProps) {
  const { username } = await params;

  return (
    <AppShell contextLabel={`09 / 用户评论 / @${username}`}>
      <PublicUserComments username={username} />
    </AppShell>
  );
}
