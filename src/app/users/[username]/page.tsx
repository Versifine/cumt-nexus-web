import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { getPublicUser } from "@/features/profile/api";
import { PublicUserProfile } from "@/features/profile/public-user-profile";
import type { GetPublicUserResponse } from "@/features/profile/types";

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
  const initialData = await getInitialPublicUser(username);

  return (
    <AppShell contextLabel={`07 / @${username}`}>
      <PublicUserProfile initialData={initialData} username={username} />
    </AppShell>
  );
}

async function getInitialPublicUser(
  username: string,
): Promise<GetPublicUserResponse | undefined> {
  try {
    return await getPublicUser(username, {
      cache: "no-store",
      token: null,
    });
  } catch {
    return undefined;
  }
}
