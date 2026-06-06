import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { PublicUserProfile } from "@/features/profile/public-user-profile";

type UserProfilePageProps = {
  params: Promise<{
    username: string;
  }>;
};

export async function generateMetadata({
  params,
}: UserProfilePageProps): Promise<Metadata> {
  const { username } = await params;

  return {
    title: `@${username} | CUMT Nexus`,
    description: `查看 @${username} 的公开用户主页、资料和公开内容统计。`,
  };
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  const { username } = await params;

  return (
    <AppShell contextLabel={`07 / @${username}`}>
      <PublicUserProfile username={username} />
    </AppShell>
  );
}
